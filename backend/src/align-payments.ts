import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { MercadoPagoService } from './buy-groups/infrastructure/mercado-pago.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const mpService = app.get(MercadoPagoService);

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  if (!accessToken) {
    console.error('Error: MERCADO_PAGO_ACCESS_TOKEN no encontrado.');
    await app.close();
    return;
  }

  console.log('\n======================================================');
  console.log('       INICIANDO RECONCILIACIÓN DE PAGOS MP/DB');
  console.log('======================================================\n');

  // 1. Obtener todas las órdenes que figuran como PAYMENT_HELD
  const orders = await prisma.group_orders.findMany({
    where: { status: 'PAYMENT_HELD' },
    include: { buy_groups: true },
  });

  console.log(`Encontradas ${orders.length} órdenes en estado PAYMENT_HELD en la DB.\n`);

  for (const order of orders) {
    const paymentId = order.payment_intent_id;
    if (!paymentId || paymentId.startsWith('mp_hold_mock')) {
      console.log(`[-] Orden ${order.id}: Pago simulado o sin ID de pago MP (${paymentId}). Omitiendo.`);
      continue;
    }

    console.log(`------------------------------------------------------`);
    console.log(`[+] Procesando Orden ID: ${order.id}`);
    console.log(`    → Grupo ID: ${order.group_id} (Estado en DB: ${order.buy_groups.status})`);
    console.log(`    → ID Pago MP: ${paymentId}`);
    console.log(`    → Consultando estado real en Mercado Pago...`);

    let mpPayment: any;
    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errData = await response.json() as any;
        const errMsg = errData.message || JSON.stringify(errData);
        console.error(`    ❌ Error al consultar MP para pago ${paymentId}:`, errMsg);
        
        if (response.status === 404 || errMsg.toLowerCase().includes('not found')) {
          console.log(`    ⚠️ El pago no existe en Mercado Pago. Sincronizando la orden a CANCELLED de forma lógica...`);
          await prisma.group_orders.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });
          console.log(`    ✅ Orden marcada como CANCELLED en la DB.`);
        }
        continue;
      }

      mpPayment = await response.json();
    } catch (fetchErr) {
      console.error(`    ❌ Error de red al consultar MP:`, fetchErr);
      continue;
    }

    const mpStatus = mpPayment.status;
    const mpStatusDetail = mpPayment.status_detail;
    console.log(`    → Estado Real en Mercado Pago: ${mpStatus} (${mpStatusDetail})`);

    // Casos de reconciliación
    if (mpStatus === 'authorized') {
      if (order.buy_groups.status === 'CANCELLED') {
        console.log(`    ⚠️ El grupo está CANCELADO. Cancelando pre-autorización en MP para liberar fondos...`);
        const ok = await mpService.cancelPayment(paymentId);
        if (ok) {
          await prisma.group_orders.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' },
          });
          console.log(`    ✅ Fondos liberados y orden marcada como CANCELLED en DB.`);
        }
      } else if (order.buy_groups.status === 'COMPLETED') {
        console.log(`    ⚠️ El grupo está COMPLETADO. Capturando fondos en MP...`);
        const ok = await mpService.capturePayment(paymentId);
        if (ok) {
          await prisma.group_orders.update({
            where: { id: order.id },
            data: { status: 'CONFIRMED' },
          });
          console.log(`    ✅ Fondos capturados y orden marcada como CONFIRMED en DB.`);
        }
      } else {
        console.log(`    [-] El grupo está OPEN. Es normal que el pago esté pre-autorizado. No se requiere acción.`);
      }
    } 
    else if (mpStatus === 'approved') {
      if (order.buy_groups.status === 'COMPLETED') {
        console.log(`    ⚠️ El pago ya está capturado en MP pero figuraba como PAYMENT_HELD en DB. Sincronizando a CONFIRMED...`);
        await prisma.group_orders.update({
          where: { id: order.id },
          data: { status: 'CONFIRMED' },
        });
        console.log(`    ✅ Estado de orden sincronizado a CONFIRMED en DB.`);
      } else if (order.buy_groups.status === 'CANCELLED') {
        console.log(`    ⚠️ El pago está aprobado en MP pero el grupo está CANCELADO. Reembolsando dinero...`);
        try {
          const refundResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (refundResponse.ok) {
            await prisma.group_orders.update({
              where: { id: order.id },
              data: { status: 'CANCELLED' },
            });
            console.log(`    ✅ Pago reembolsado con éxito y orden marcada como CANCELLED en DB.`);
          } else {
            const errData = await refundResponse.json() as any;
            console.error(`    ❌ Error al reembolsar pago ${paymentId}:`, errData.message || errData);
          }
        } catch (refundErr) {
          console.error(`    ❌ Error al emitir reembolso:`, refundErr);
        }
      } else {
        console.log(`    [-] Advertencia: El pago está aprobado en MP pero el grupo está en estado: ${order.buy_groups.status}.`);
      }
    } 
    else if (mpStatus === 'cancelled' || mpStatus === 'refunded') {
      console.log(`    ⚠️ El pago ya está cancelado/reembolsado en MP. Sincronizando orden a CANCELLED en DB...`);
      await prisma.group_orders.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
      console.log(`    ✅ Estado de orden sincronizado a CANCELLED en DB.`);
    } 
    else {
      console.log(`    [-] Pago en estado: ${mpStatus}. No se aplica regla de reconciliación.`);
    }
  }

  console.log('\n======================================================');
  console.log('       RECONCILIACIÓN FINALIZADA CON ÉXITO');
  console.log('======================================================\n');

  await app.close();
}

bootstrap();
