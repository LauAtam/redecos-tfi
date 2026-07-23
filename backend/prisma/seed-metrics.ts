import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Nutriendo y ajustando la base de datos para el nodo Revistas y bultos completos...');

  // 1. Limpiar órdenes y grupos previamente generados por el seed
  console.log('Limpiando datos de prueba anteriores...');
  await prisma.group_orders.deleteMany({
    where: {
      payment_intent_id: {
        startsWith: 'mock_pi_',
      },
    },
  });

  // Limpiar grupos vacíos creados por el seed
  await prisma.buy_groups.deleteMany({
    where: {
      group_orders: {
        none: {},
      },
      expires_at: {
        not: null,
      },
    },
  });

  // 2. Obtener nodos, productos y perfiles existentes
  const nodos = await prisma.nodos.findMany();
  const productos = await prisma.productos.findMany();
  const profiles = await prisma.profiles.findMany();

  if (nodos.length === 0 || productos.length === 0 || profiles.length === 0) {
    console.error('Error: Se requieren nodos, productos y perfiles en la base de datos.');
    return;
  }

  // Buscar específicamente el nodo "revistas"
  const revistasNode = nodos.find((n) => n.name.toLowerCase().includes('revistas')) || nodos[0];
  console.log(`📌 Nodo asignado para grupos operativos y logísticos: ${revistasNode.name} (ID: ${revistasNode.id})`);

  // 3. Reasignar cualquier grupo operativo preexistente en la BD (distinto a FINALIZED, CANCELLED, OPEN) al nodo "Revistas"
  await prisma.buy_groups.updateMany({
    where: {
      status: {
        in: ['COMPLETED', 'PROCESSING_ORDER', 'SHIPPED', 'READY_FOR_PICKUP'],
      },
    },
    data: {
      node_id: revistasNode.id,
    },
  });

  // 4. Generar datos históricos para los últimos 6 meses (Febrero a Julio 2026)
  const today = new Date();
  const months = [5, 4, 3, 2, 1, 0]; // Hace 5 meses ... mes actual

  let createdGroupsCount = 0;
  let createdOrdersCount = 0;

  for (const monthOffset of months) {
    const groupDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 15, 12, 0, 0);
    const activeProducts = productos.slice(0, 4);

    for (let pIdx = 0; pIdx < activeProducts.length; pIdx++) {
      const prod = activeProducts[pIdx];

      // Determinar estado
      let status = 'FINALIZED';
      if (monthOffset === 0) {
        const currentStatuses = ['FINALIZED', 'READY_FOR_PICKUP', 'SHIPPED', 'PROCESSING_ORDER', 'COMPLETED', 'OPEN', 'CANCELLED'];
        status = currentStatuses[createdGroupsCount % currentStatuses.length];
      } else {
        status = (createdGroupsCount % 6 === 0) ? 'CANCELLED' : 'FINALIZED';
      }

      // REGLA SOLICITADA: Todos los grupos que NO sean ('FINALIZED', 'CANCELLED', 'OPEN') pertenecen obligatoriamente al nodo "Revistas"
      const isOperationalGroup = !['FINALIZED', 'CANCELLED', 'OPEN'].includes(status);
      const targetNodo = (isOperationalGroup || pIdx % 2 === 0) ? revistasNode : nodos[Math.floor(Math.random() * nodos.length)];

      const buyGroup = await prisma.buy_groups.create({
        data: {
          product_id: prod.id,
          node_id: targetNodo.id,
          status: status,
          target_size: prod.bulk_size,
          created_at: groupDate,
          closed_at: status !== 'OPEN' ? groupDate : null,
          expires_at: new Date(groupDate.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      createdGroupsCount++;

      // REGLA SOLICITADA: Para grupos no CANCELLED/OPEN, la suma de unidades DEBE ser exactamente igual al bulk_size
      const totalUnitsToCreate = (status === 'CANCELLED')
        ? Math.floor(prod.bulk_size / 2)
        : (status === 'OPEN')
          ? Math.max(1, prod.bulk_size - 2)
          : prod.bulk_size; // Exactamente el 100% del bulto para COMPLETED, PROCESSING_ORDER, SHIPPED, READY_FOR_PICKUP, FINALIZED

      let unitsAllocated = 0;
      let profileIndex = 0;

      while (unitsAllocated < totalUnitsToCreate) {
        const profile = profiles[profileIndex % profiles.length];
        const remaining = totalUnitsToCreate - unitsAllocated;
        const qty = Math.min(2, remaining);
        if (qty <= 0) break;

        let orderStatus = 'FINALIZED';
        if (status === 'OPEN') orderStatus = 'PAYMENT_HELD';
        else if (status === 'CANCELLED') orderStatus = 'CANCELLED';
        else orderStatus = 'CONFIRMED'; // Válido para COMPLETED, PROCESSING_ORDER, SHIPPED, READY_FOR_PICKUP

        await prisma.group_orders.create({
          data: {
            group_id: buyGroup.id,
            profile_id: profile.id,
            quantity: qty,
            unit_price: prod.price,
            status: orderStatus,
            created_at: groupDate,
            payment_intent_id: `mock_pi_${buyGroup.id.substring(0, 8)}_${unitsAllocated}`,
          },
        });

        unitsAllocated += qty;
        createdOrdersCount++;
        profileIndex++;
      }
    }
  }

  console.log(`✅ ¡Éxito! Se crearon ${createdGroupsCount} grupos de compra y ${createdOrdersCount} órdenes.`);
  console.log(`📌 Todos los grupos con estados (COMPLETED, PROCESSING_ORDER, SHIPPED, READY_FOR_PICKUP) tienen el 100% de las unidades del bulto completadas y pertenecen al nodo "${revistasNode.name}".`);
}

main()
  .catch((e) => {
    console.error('Error al ejecutar seed-metrics:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
