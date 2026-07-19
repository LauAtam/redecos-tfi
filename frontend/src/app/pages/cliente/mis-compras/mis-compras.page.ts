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
  IonSegmentButton,
  NavController
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
  helpCircleOutline,
  giftOutline
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { GroupOrder } from '../../../core/models/auth.models';
import { HeaderComponent } from '../../../core/components/header/header.component';
import { QRCodeComponent } from 'angularx-qrcode';

export interface OrderUiState {
  label: string;
  colorClass: string;
  icon: string;
  popoverTitle: string;
  popoverText: string;
}

export interface GroupOrderWithUi extends GroupOrder {
  uiState: OrderUiState;
}

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
    QRCodeComponent,
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
  orders = signal<GroupOrderWithUi[]>([]);
  isLoading = false;
  errorMessage: string | null = null;
  withdrawalSession = signal<any | null>(null);
  qrModalOpen = false;

  selectedSegment = signal<'active' | 'history'>('active');

  hasOrdersReadyForPickup = computed(() => {
    return this.orders().some(order => order.status === 'CONFIRMED' && order.group?.status === 'READY_FOR_PICKUP');
  });

  qrPayload = computed(() => {
    const session = this.withdrawalSession();
    if (!session) return '';
    return JSON.stringify({
      profileId: this.appFacadeService.currentUserValue?.id || '',
      otp: session.otp
    });
  });

  filteredOrders = computed(() => {
    const list = this.orders();
    const segment = this.selectedSegment();
    return list.filter(order => {
      const isGroupFinalizedOrCancelled = ['FINALIZED', 'CANCELLED'].includes(order.group?.status || '');

      if (segment === 'active') {
        return (
          order.status === 'PAYMENT_HELD' ||
          (order.status === 'CONFIRMED' && !isGroupFinalizedOrCancelled)
        );
      }
      return (
        order.status === 'CANCELLED' ||
        (order.status === 'CONFIRMED' && isGroupFinalizedOrCancelled)
      );
    });
  });

  private appFacadeService = inject(AppFacadeService);
  private navCtrl = inject(NavController);

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
      helpCircleOutline,
      giftOutline
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
      const mapped = (data || []).map(order => ({
        ...order,
        uiState: this.calculateOrderUiState(order)
      }));
      this.orders.set(mapped);
    }
  }

  onSegmentChanged(event: any) {
    this.selectedSegment.set(event.detail.value as 'active' | 'history');
  }

  goBack() {
    this.navCtrl.navigateBack('/cliente/home', { queryParams: { tab: 'config' } });
  }

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  calculateOrderUiState(order: GroupOrder): OrderUiState {
    const status = order.status;
    const groupStatus = order.group?.status;
    const nodeName = order.group?.node?.name || 'tu Nodo';

    if (groupStatus === 'FINALIZED' || status === 'FINALIZED') {
      return {
        label: 'Entregada',
        colorClass: 'bg-slate-100 text-slate-600 border-slate-200',
        icon: 'checkmark-circle-outline',
        popoverTitle: 'Compra entregada',
        popoverText: 'Ya retiraste este pedido en tu Nodo de distribución. ¡Gracias por comprar en comunidad!'
      };
    }

    if (groupStatus === 'READY_FOR_PICKUP') {
      return {
        label: 'Listo para retirar',
        colorClass: 'bg-[#006b4d]/10 text-[#006b4d] border-[#006b4d]/20',
        icon: 'gift-outline',
        popoverTitle: 'Listo para retirar',
        popoverText: `Tu pedido ya está disponible en el Nodo ${nodeName}. Presentá tu código QR de retiro al coordinador para recibir tus productos.`
      };
    }

    if (status === 'CANCELLED') {
      return {
        label: 'Cancelada',
        colorClass: 'bg-rose-100 text-rose-800 border-rose-200',
        icon: 'close-circle-outline',
        popoverTitle: 'Compra anulada',
        popoverText: 'El grupo no alcanzó el mínimo o fue cancelado. Tu dinero ya fue liberado.'
      };
    }

    if (status === 'CONFIRMED') {
      return {
        label: 'Confirmada',
        colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: 'checkmark-circle-outline',
        popoverTitle: 'Compra confirmada',
        popoverText: `El grupo se consolidó con éxito. El dinero fue cobrado y el pedido está en preparación o en camino al Nodo ${nodeName}.`
      };
    }

    if (status === 'PAYMENT_HELD') {
      return {
        label: 'Pago Retenido',
        colorClass: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: 'time-outline',
        popoverTitle: 'Pre-autorización activa',
        popoverText: 'El dinero está retenido en tu tarjeta. Solo se cobrará si el grupo se consolida hoy. Si no, se libera automáticamente.'
      };
    }

    return {
      label: 'Pendiente',
      colorClass: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: 'time-outline',
      popoverTitle: 'Pago pendiente',
      popoverText: 'Estamos esperando la confirmación de pago de Mercado Pago.'
    };
  }

  async openWithdrawalModal() {
    this.isLoading = true;
    this.errorMessage = null;
    const { data, error } = await this.appFacadeService.generateWithdrawalOtp();
    this.isLoading = false;
    if (error) {
      this.errorMessage = error.message;
    } else if (data) {
      this.withdrawalSession.set(data);
      this.qrModalOpen = true;
    }
  }

  closeQrModal() {
    this.withdrawalSession.set(null);
    this.qrModalOpen = false;
  }
}
