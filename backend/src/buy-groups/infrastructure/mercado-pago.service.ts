import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken: string;
  private readonly isProduction: boolean;

  constructor(private readonly config: ConfigService) {
    this.accessToken = this.config.get<string>('MERCADO_PAGO_ACCESS_TOKEN') || '';
    this.isProduction = this.config.get<string>('NODE_ENV') === 'production';
    // Log de arranque: mostrar prefijo de credencial para diagnóstico (nunca el token completo)
    const tokenPrefix = this.accessToken ? this.accessToken.substring(0, 20) + '...' : '(vacío)';
    this.logger.log(`🔑 Access Token cargado: ${tokenPrefix} | Producción: ${this.isProduction}`);
  }


  async createPreauthorizedPayment(
    amount: number,
    token: string,
    email: string,
    paymentMethodId: string,
    customerId?: string,
  ): Promise<{ id: string; status: string }> {
    // Si no hay credencial configurada, usar simulación en modo dev
    if (!this.accessToken || this.accessToken.startsWith('MOCK_') || this.accessToken === '') {
      this.logger.warn('Mercado Pago Access Token no configurado o mock. Simulando pre-autorización.');
      return { id: `mp_hold_mock_${crypto.randomUUID()}`, status: 'authorized' };
    }

    try {
      const idempotencyKey = crypto.randomUUID();

      const payer: any = { email };
      if (customerId) {
        payer.id = customerId;
      }

      const requestBody = {
        transaction_amount: amount,
        token,
        description: 'Redecos - Reserva de Compra Colectiva',
        installments: 1,
        payment_method_id: paymentMethodId,
        payer,
        capture: false,
      };

      this.logger.log(`📤 Enviando pre-autorización a MP:`);
      this.logger.log(`   → Monto: $${amount}`);
      this.logger.log(`   → Token: ${token}`);
      this.logger.log(`   → PaymentMethodId: ${paymentMethodId}`);
      this.logger.log(`   → Email: ${email}`);
      if (customerId) {
        this.logger.log(`   → CustomerId: ${customerId}`);
      }
      this.logger.log(`   → Capture: false (pre-auth)`);
      this.logger.log(`   → IdempotencyKey: ${idempotencyKey}`);
      this.logger.log(`   → Access Token prefix: ${this.accessToken.substring(0, 20)}...`);

      const response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        this.logger.error(`Error en Mercado Pago al pre-autorizar: ${JSON.stringify(data)}`);
        const error = new Error(data.message || 'Error al comunicarse con Mercado Pago.');
        (error as any).raw = data;
        throw error;
      }

      this.logger.log(`Pago pre-autorizado creado con éxito: ${data.id}`);
      return { id: String(data.id), status: data.status };
    } catch (error: any) {
      this.logger.error(`Excepción en createPreauthorizedPayment: ${error.message}`);
      throw error;
    }
  }

  async capturePayment(paymentId: string): Promise<boolean> {
    if (paymentId.includes('mock') || !this.accessToken || this.accessToken === '') {
      this.logger.log(`Capturando pago simulado: ${paymentId}`);
      return true;
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          capture: true,
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        this.logger.error(`Error al capturar pago ${paymentId}: ${JSON.stringify(data)}`);
        return false;
      }

      this.logger.log(`Pago ${paymentId} capturado con éxito.`);
      return true;
    } catch (error: any) {
      this.logger.error(`Excepción en capturePayment: ${error.message}`);
      return false;
    }
  }

  async cancelPayment(paymentId: string): Promise<boolean> {
    if (paymentId.includes('mock') || !this.accessToken || this.accessToken === '') {
      this.logger.log(`Cancelando pago simulado: ${paymentId}`);
      return true;
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
        }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        this.logger.error(`Error al cancelar/liberar pago ${paymentId}: ${JSON.stringify(data)}`);
        return false;
      }

      this.logger.log(`Pago ${paymentId} cancelado con éxito.`);
      return true;
    } catch (error: any) {
      this.logger.error(`Excepción en cancelPayment: ${error.message}`);
      return false;
    }
  }

  async getOrCreateCustomer(email: string): Promise<string> {
    if (!this.accessToken || this.accessToken.startsWith('MOCK_') || this.accessToken === '') {
      this.logger.warn('Mercado Pago Access Token no configurado o mock. Simulando creación de cliente.');
      return `mp_cust_mock_${crypto.randomUUID().substring(0, 8)}`;
    }

    try {
      // 1. Buscar si el cliente ya existe
      const searchResponse = await fetch(`https://api.mercadopago.com/v1/customers/search?email=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (searchResponse.ok) {
        const searchData = await searchResponse.json() as any;
        if (searchData.results && searchData.results.length > 0) {
          this.logger.log(`Cliente encontrado en Mercado Pago: ${searchData.results[0].id}`);
          return searchData.results[0].id;
        }
      }

      // 2. Si no existe, crearlo
      this.logger.log(`Creando nuevo cliente en Mercado Pago para ${email}`);
      const createResponse = await fetch('https://api.mercadopago.com/v1/customers', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const createData = await createResponse.json() as any;

      if (!createResponse.ok) {
        this.logger.error(`Error al crear cliente en Mercado Pago: ${JSON.stringify(createData)}`);
        throw new Error(createData.message || 'Error al crear cliente en Mercado Pago');
      }

      this.logger.log(`Cliente creado con éxito: ${createData.id}`);
      return createData.id;
    } catch (error: any) {
      this.logger.error(`Excepción en getOrCreateCustomer: ${error.message}`);
      throw error;
    }
  }

  async saveCard(
    customerId: string,
    token: string,
  ): Promise<{ id: string; last_four: string; brand: string; expiration_mo: number; expiration_yr: number }> {
    if (customerId.includes('mock') || !this.accessToken || this.accessToken === '') {
      this.logger.warn('Simulando guardado de tarjeta en Mercado Pago.');
      return {
        id: `mp_card_mock_${crypto.randomUUID().substring(0, 8)}`,
        last_four: '1234',
        brand: 'visa',
        expiration_mo: 12,
        expiration_yr: 2030,
      };
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json() as any;

      if (!response.ok) {
        this.logger.error(`Error al guardar tarjeta en Mercado Pago: ${JSON.stringify(data)}`);
        const error = new Error(data.message || 'Error al guardar tarjeta en Mercado Pago');
        (error as any).raw = data;
        throw error;
      }

      this.logger.log(`Tarjeta guardada con éxito en Mercado Pago: ${data.id}`);
      return {
        id: String(data.id),
        last_four: String(data.last_four_digits),
        brand: String(data.payment_method?.id || 'card'),
        expiration_mo: Number(data.expiration_month),
        expiration_yr: Number(data.expiration_year),
      };
    } catch (error: any) {
      this.logger.error(`Excepción en saveCard: ${error.message}`);
      throw error;
    }
  }

  async deleteCard(customerId: string, cardId: string): Promise<boolean> {
    if (customerId.includes('mock') || cardId.includes('mock') || !this.accessToken || this.accessToken === '') {
      this.logger.warn(`Simulando eliminación de tarjeta ${cardId} en Mercado Pago.`);
      return true;
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/v1/customers/${customerId}/cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json() as any;
        this.logger.error(`Error al borrar tarjeta en Mercado Pago: ${JSON.stringify(data)}`);
        return false;
      }

      this.logger.log(`Tarjeta ${cardId} borrada con éxito de Mercado Pago.`);
      return true;
    } catch (error: any) {
      this.logger.error(`Excepción en deleteCard: ${error.message}`);
      return false;
    }
  }
}
