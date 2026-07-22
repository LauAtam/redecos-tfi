import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import * as nodemailer from 'nodemailer';
import {
  getBuyGroupConsolidatedTemplate,
  getBuyGroupShippedTemplate,
  getBuyGroupReadyForPickupTemplate,
  getBuyGroupRetrievedTemplate,
  getBuyGroupCancelledTemplate
} from './notifications.templates';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.ethereal.email',
      port: Number(process.env.MAIL_PORT) || 587,
      secure: Number(process.env.MAIL_PORT) === 465,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  private async sendMail(to: string, subject: string, text: string, html?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || '"Redecos" <no-reply@redecos.com>',
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Email sent: ${info.messageId}`);
      if (process.env.MAIL_HOST === 'smtp.ethereal.email') {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
    } catch (error) {
      this.logger.error('Error sending email', error);
    }
  }

  @OnEvent('buyGroup.consolidated')
  handleBuyGroupConsolidatedEvent(payload: { emails: string[], groupName: string }) {
    this.logger.log(`Handling buyGroup.consolidated for ${payload.emails.length} clients`);
    const subject = `Tu grupo de compra ${payload.groupName} se ha completado!`;
    const text = `Hola,\n\n¡Se logró! Tu grupo de compra "${payload.groupName}" completó el cupo y ya aseguramos la compra. Empezamos a preparar tu pedido.\n\nSaludos,\nEl equipo de Redecos`;
    const html = getBuyGroupConsolidatedTemplate(payload.groupName);

    // Usamos BCC para no exponer emails si son varios, o loop. Enviamos directo.
    this.sendMail(payload.emails.join(', '), subject, text, html);
  }

  @OnEvent('buyGroup.shipped')
  handleBuyGroupShippedEvent(payload: { emails: string[], groupName: string }) {
    const subject = `Tu pedido de ${payload.groupName} está en camino`;
    const text = `Hola,\n\nTu compra del grupo "${payload.groupName}" salió hacia el nodo. Calculamos que llega hoy o mañana.\n\nSaludos,\nEl equipo de Redecos`;
    const html = getBuyGroupShippedTemplate(payload.groupName);
    this.sendMail(payload.emails.join(', '), subject, text, html);
  }

  @OnEvent('buyGroup.readyForPickup')
  handleBuyGroupReadyForPickupEvent(payload: { emails: string[], groupName: string }) {
    const subject = `Tu pedido de ${payload.groupName} ya está en el nodo`;
    const text = `Hola,\n\nTu compra del grupo "${payload.groupName}" ya te está esperando. Acercate con tu credencial QR a tu nodo asignado para retirar.\n\nSaludos,\nEl equipo de Redecos`;
    const html = getBuyGroupReadyForPickupTemplate(payload.groupName);
    this.sendMail(payload.emails.join(', '), subject, text, html);
  }

  @OnEvent('buyGroup.retrieved')
  handleBuyGroupRetrievedEvent(payload: { email?: string; emails?: string[]; groupName: string }) {
    const subject = `¡Gracias por tu compra en ${payload.groupName}!`;
    const text = `Hola,\n\n¡Gracias por retirar tu compra de "${payload.groupName}"! Nos alegra que seas parte de esta red de compras comunitarias.\n\nSaludos,\nEl equipo de Redecos`;
    const html = getBuyGroupRetrievedTemplate(payload.groupName);

    const recipients = payload.emails || (payload.email ? [payload.email] : []);
    if (recipients.length > 0) {
      this.sendMail(recipients.join(', '), subject, text, html);
    }
  }

  @OnEvent('buyGroup.cancelled')
  handleBuyGroupCancelledEvent(payload: { emails: string[], groupName: string }) {
    const subject = `Tu grupo de compra de ${payload.groupName} no se completó`;
    const text = `Hola,\n\nQueremos informarte que el grupo de compra de "${payload.groupName}" no alcanzó a completarse. La pre-autorización de pago ha sido cancelada sin cargos.\n\nSaludos,\nEl equipo de Redecos`;
    const html = getBuyGroupCancelledTemplate(payload.groupName);
    this.sendMail(payload.emails.join(', '), subject, text, html);
  }
}
