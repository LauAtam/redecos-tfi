import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';

import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-faq',
  templateUrl: './faq.page.html',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink, HeaderComponent]
})
export class FaqPage {
  faqs = [
    {
      category: 'Generalidades',
      questions: [
        {
          q: '¿Cómo funciona Redeco?',
          a: 'Redeco es una red de compras comunitarias. Te agrupás con otros usuarios de tu misma zona (nodo) para completar el volumen de un bulto mayorista. Así, todos acceden al precio por mayor comprando por menor.',
          open: false
        },
        {
          q: '¿Qué es un bulto cerrado?',
          a: 'Es la unidad de venta mayorista (por ejemplo, una caja de 12 leches). En Redeco, el bulto se divide entre varios usuarios. Cuando se completa, la compra se efectiviza.',
          open: false
        }
      ]
    },
    {
      category: 'Compras y Pagos',
      questions: [
        {
          q: '¿Cómo se procesa mi pago con Mercado Pago?',
          a: 'Al unirte a un grupo de compra, Mercado Pago realiza una pre-autorización en tu tarjeta. El dinero no se debita hasta que el grupo completa el bulto.',
          open: false
        },
        {
          q: '¿Qué pasa si el grupo no se completa?',
          a: 'Si se vence el tiempo de la compra comunitaria y el bulto no se completó, la pre-autorización se cancela automáticamente y no se te cobra nada.',
          open: false
        }
      ]
    },
    {
      category: 'Retiros y Logística',
      questions: [
        {
          q: '¿Cómo retiro mi pedido en el Nodo?',
          a: 'Una vez que la compra llega al nodo, recibirás una notificación. Deberás acercarte al nodo elegido, mostrar tu credencial QR para que el administrador la escanee y luego brindar tu PIN de seguridad para confirmar la recepción.',
          open: false
        },
        {
          q: '¿Qué es el PIN de retiro?',
          a: 'Es un código único de 6 dígitos asociado a tu cuenta. Funciona como una firma digital complementaria al escaneo del QR, asegurando que fuiste vos quien recibió el pedido correctamente.',
          open: false
        }
      ]
    },
    {
      category: 'Mi Cuenta y Privacidad',
      questions: [
        {
          q: '¿Cómo solicito la eliminación de mis datos?',
          a: 'En cumplimiento con la Ley 25.326, podés solicitar la supresión de tu cuenta desde la sección de Términos y Condiciones, o contactando a nuestro soporte.',
          open: false
        }
      ]
    }
  ];
}
