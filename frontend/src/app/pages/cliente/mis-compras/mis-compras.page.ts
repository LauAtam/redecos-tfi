import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonText,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonPopover,
  IonSegment,
  IonSegmentButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  cubeOutline,
  arrowBackOutline,
  qrCodeOutline,
  closeOutline,
  helpCircleOutline
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { GroupOrder } from '../../../core/models/auth.models';
import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-mis-compras',
  templateUrl: './mis-compras.page.html',
  styleUrls: ['./mis-compras.page.scss'],
  standalone: true,
  imports: [
    NgClass,
    CurrencyPipe,
    RouterModule,
    HeaderComponent,
    IonContent,
    IonButton,
    IonCard,
    IonCardContent,
    IonSpinner,
    IonText,
    IonIcon,
    IonModal,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonPopover,
    IonSegment,
    IonSegmentButton
  ],
  providers: [CurrencyPipe],
})
export class MisComprasPage implements OnInit {
  orders = signal<GroupOrder[]>([]);
  isLoading = false;
  errorMessage: string | null = null;
  selectedOrderForQr: GroupOrder | null = null;
  qrModalOpen = false;

  selectedSegment = signal<'active' | 'history'>('active');

  filteredOrders = computed(() => {
    const list = this.orders();
    const segment = this.selectedSegment();
    return list.filter(order => {
      if (segment === 'active') {
        return (
          order.status === 'PAYMENT_HELD' ||
          (order.status === 'CONFIRMED' && order.group?.status !== 'COMPLETED')
        );
      }
      return (
        order.status === 'CANCELLED' ||
        (order.status === 'CONFIRMED' && order.group?.status === 'COMPLETED')
      );
    });
  });

  private appFacadeService = inject(AppFacadeService);

  constructor() {
    addIcons({
      cardOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      cubeOutline,
      arrowBackOutline,
      qrCodeOutline,
      closeOutline,
      helpCircleOutline
    });
  }

  ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    this.isLoading = true;
    this.errorMessage = null;

    const { data, error } = await this.appFacadeService.getMyOrders();
    this.isLoading = false;

    if (error) {
      this.errorMessage = (error as any).message || 'Error al cargar tus compras.';
    } else {
      this.orders.set(data || []);
    }
  }

  onSegmentChanged(event: any) {
    this.selectedSegment.set(event.detail.value as 'active' | 'history');
  }

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PAYMENT_HELD':
        return 'Pago Retenido';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'PENDING':
        return 'Pendiente';
      default:
        return status;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PAYMENT_HELD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PENDING':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }

  openQrModal(order: GroupOrder) {
    this.selectedOrderForQr = order;
    this.qrModalOpen = true;
  }

  closeQrModal() {
    this.selectedOrderForQr = null;
    this.qrModalOpen = false;
  }

  getQrCodeUrl(order: GroupOrder): string {
    const payload = JSON.stringify({
      orderId: order.id,
      quantity: order.quantity,
      buyerEmail: this.appFacadeService.currentUserValue?.email || 'N/A'
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(payload)}&color=002d4b&bgcolor=ffffff`;
  }
}
