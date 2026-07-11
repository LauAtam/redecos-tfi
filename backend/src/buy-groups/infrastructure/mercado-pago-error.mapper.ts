import { BadRequestException } from '@nestjs/common';

export interface MercadoPagoRawError {
  message?: string;
  error?: string;
  status?: number;
  cause?: Array<{
    code: string | number;
    description: string;
  }>;
}

export class MercadoPagoErrorMapper {
  // 1. Diccionario para los códigos de causa (cause.code) de Mercado Pago
  private static readonly causeCodeMap: Record<string, string> = {
    // Errores de Guardado de Tarjeta y Tokenización
    '128': 'La tarjeta ingresada no es válida o fue rechazada por Mercado Pago.',
    '130': 'El método de pago seleccionado no es válido.',
    '324': 'El número de documento ingresado es inválido.',
    '325': 'El mes de vencimiento de la tarjeta es inválido.',
    '326': 'El año de vencimiento de la tarjeta es inválido.',
    '3032': 'El código de seguridad (CVV) es inválido o tiene un formato incorrecto.',

    // Errores de Creación de Pagos
    '2006': 'El token de la tarjeta expiró o es inválido. Por favor, volvé a ingresar los datos.',
    '3002': 'No pudimos validar tu usuario como pagador. Por favor, reintentá.',
    '4006': 'El código de seguridad (CVV) es inválido o tiene un formato incorrecto.',
    '4390': 'El email del comprador no está autorizado (los cobros entre cuentas vinculadas de desarrollador están prohibidos).',
  };

  // 2. Diccionario para los detalles de rechazo de pago (status_detail)
  private static readonly rejectDetailMap: Record<string, string> = {
    'cc_rejected_bad_filled_card_number': 'El número de tarjeta ingresado es incorrecto.',
    'cc_rejected_bad_filled_date': 'La fecha de vencimiento es incorrecta.',
    'cc_rejected_bad_filled_other': 'Los datos de la tarjeta son incorrectos.',
    'cc_rejected_bad_filled_security_code': 'El código de seguridad (CVV) ingresado es incorrecto.',
    'cc_rejected_blacklist': 'No pudimos procesar el pago con esta tarjeta por motivos de seguridad.',
    'cc_rejected_card_disabled': 'La tarjeta está inhabilitada. Por favor, comunícate con tu banco.',
    'cc_rejected_card_error': 'Ocurrió un error al procesar la tarjeta. Por favor, reintentá.',
    'cc_rejected_duplicated_payment': 'El pago ya fue registrado anteriormente. Verifica tus consumos.',
    'cc_rejected_high_risk': 'El pago fue rechazado por medidas de prevención de fraude.',
    'cc_rejected_insufficient_amount': 'La tarjeta no tiene fondos suficientes para completar la compra.',
    'cc_rejected_invalid_installments': 'La cantidad de cuotas seleccionada no es válida para esta tarjeta.',
    'cc_rejected_max_attempts': 'Superaste el límite de intentos permitidos con esta tarjeta. Reintentá mañana.',
    'cc_rejected_other_reason': 'El pago fue rechazado por el banco emisor de la tarjeta.',
  };

  /**
   * Mapea un error crudo de la API de Mercado Pago a una BadRequestException con un mensaje amigable.
   * Aplica el patrón Chain of Responsibility implícito evaluando en orden de especificidad.
   */
  public static map(rawError: MercadoPagoRawError | Error | any): BadRequestException {
    // Si no es un error de API estructurado, devolvemos el mensaje genérico
    if (!rawError || (typeof rawError !== 'object')) {
      return new BadRequestException('Ocurrió un error inesperado al procesar el pago.');
    }

    // 1. Evaluar si viene de Mercado Pago con una "cause" específica
    if (Array.isArray(rawError.cause) && rawError.cause.length > 0) {
      for (const item of rawError.cause) {
        const codeKey = String(item.code);
        if (this.causeCodeMap[codeKey]) {
          return new BadRequestException(this.causeCodeMap[codeKey]);
        }
      }
    }

    // 2. Evaluar mensajes técnicos comunes mapeados en base a expresiones regulares
    const technicalMessage = rawError.message || '';
    if (technicalMessage.includes('payment method response is empty')) {
      return new BadRequestException(this.causeCodeMap['128']);
    }
    if (technicalMessage.includes('customer not found')) {
      return new BadRequestException('El cliente de Mercado Pago asociado a tu cuenta no fue encontrado.');
    }
    if (technicalMessage.includes('Payer email forbidden')) {
      return new BadRequestException(this.causeCodeMap['4390']);
    }

    // 3. Evaluar códigos de rechazo directo si vienen en el status_detail
    const statusDetail = rawError.status_detail;
    if (statusDetail && this.rejectDetailMap[statusDetail]) {
      return new BadRequestException(this.rejectDetailMap[statusDetail]);
    }

    // Fallback: Si no pudimos identificar el error de manera específica, devolvemos un mensaje descriptivo o genérico
    const fallbackMessage = rawError.message || 'No se pudo procesar la transacción con Mercado Pago.';
    return new BadRequestException(fallbackMessage);
  }
}
