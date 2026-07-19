import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavController } from '@ionic/angular/standalone';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonModal
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  businessOutline,
  clipboardOutline,
  carOutline,
  cubeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  qrCodeOutline,
  closeOutline,
  refreshOutline,
  peopleOutline
} from 'ionicons/icons';
import { AppFacadeService } from '../../../../app-facade.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BuyGroup, Nodo } from '../../../../core/models/auth.models';
import { HeaderComponent } from '../../../../core/components/header/header.component';
import { BultoCardComponent, BultoAction } from '../../../../core/components/bulto-card/bulto-card.component';

@Component({
  selector: 'app-admin-logistica',
  templateUrl: './admin-logistica.page.html',
  styleUrls: ['./admin-logistica.page.scss'],
  standalone: true,
  imports: [
    NgClass,
    DecimalPipe,
    RouterModule,
    FormsModule,
    HeaderComponent,
    BultoCardComponent,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonModal
  ]
})
export class AdminLogisticaPage implements OnInit {
  private appFacadeService = inject(AppFacadeService);
  private navCtrl = inject(NavController);
  private toastService = inject(ToastService);

  // States
  isLoading = signal<boolean>(false);
  nodos = signal<Nodo[]>([]);
  selectedNodeId = signal<string>('');
  activeTab = signal<'order' | 'shipping' | 'pickup' | 'finalized'>('order');
  buyGroups = signal<BuyGroup[]>([]);

  // Modals state
  // Modals state
  selectedGroupForModal = signal<BuyGroup | null>(null);
  isConsolidarModalOpen = signal<boolean>(false);
  isDeliveryModalOpen = signal<boolean>(false);
  isDetailModalOpen = signal<boolean>(false);

  // Mock delivery order selection
  manualOrderCode = '';
  isDeliveringOrder = signal<boolean>(false);

  constructor() {
    addIcons({
      arrowBackOutline,
      businessOutline,
      clipboardOutline,
      carOutline,
      cubeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      qrCodeOutline,
      closeOutline,
      refreshOutline,
      peopleOutline
    });
  }

  async ngOnInit() {
    this.isLoading.set(true);

    // Cargar todos los nodos para el Admin
    const { data, error } = await this.appFacadeService.getNodos();
    if (!error && data) {
      this.nodos.set(data);
      if (data.length > 0) {
        this.selectedNodeId.set(data[0].id || '');
      }
    }

    await this.fetchGroups();
    this.isLoading.set(false);
  }

  filteredBuyGroups = computed(() => {
    const tab = this.activeTab();
    const groups = this.buyGroups();

    return groups.filter(g => {
      switch (tab) {
        case 'order':
          return g.status === 'COMPLETED';
        case 'shipping':
          return g.status === 'PROCESSING_ORDER' || g.status === 'SHIPPED';
        case 'pickup':
          return g.status === 'READY_FOR_PICKUP';
        case 'finalized':
          return g.status === 'FINALIZED' || g.status === 'CANCELLED';
        default:
          return false;
      }
    });
  });

  async fetchGroups() {
    const nodeId = this.selectedNodeId();
    if (!nodeId) return;

    this.isLoading.set(true);
    const { data, error } = await this.appFacadeService.listBuyGroups({ nodeId });
    this.isLoading.set(false);

    if (error) {
      this.toastService.showError(error.message);
    } else if (data) {
      this.buyGroups.set(data);
    }
  }

  async onNodeChange(event: any) {
    const nodeId = event.detail.value;
    this.selectedNodeId.set(nodeId);
    await this.fetchGroups();
  }

  async onTabChange(event: any) {
    this.activeTab.set(event.detail.value);
  }

  goBack() {
    this.navCtrl.navigateBack('/admin/gestiones');
  }

  // Mapeador de acciones disponibles según el estado del bulto
  getBultoActions(group: BuyGroup): BultoAction[] {
    const actions: BultoAction[] = [];

    if (group.status === 'COMPLETED') {
      actions.push({
        type: 'cancel',
        label: 'Cancelar',
        colorClass: '[--color:#dc2626]',
        fill: 'clear'
      });
      actions.push({
        type: 'consolidate',
        label: 'Consolidar y Pedir',
        colorClass: '[--background:#006b4d] [--color:#ffffff]'
      });
    } else if (group.status === 'PROCESSING_ORDER') {
      actions.push({
        type: 'cancel',
        label: 'Cancelar',
        colorClass: '[--color:#dc2626]',
        fill: 'clear'
      });
      actions.push({
        type: 'ship',
        label: 'Marcar Enviado',
        icon: 'car-outline',
        colorClass: '[--background:#004b7c] [--color:#ffffff]'
      });
    } else if (group.status === 'SHIPPED') {
      actions.push({
        type: 'receive',
        label: 'Recibir en Nodo',
        icon: 'cube-outline',
        colorClass: '[--background:#e67e22] [--color:#ffffff]'
      });
    } else if (group.status === 'READY_FOR_PICKUP') {
      actions.push({
        type: 'deliver',
        label: 'Entregar Pedidos',
        icon: 'qr-code-outline',
        colorClass: '[--background:#6b21a8] [--color:#ffffff]'
      });
    }

    return actions;
  }

  handleBultoAction(event: { type: string; group: BuyGroup }) {
    const { type, group } = event;
    switch (type) {
      case 'view_detail':
        this.openDetailModal(group);
        break;
      case 'consolidate':
        this.openConsolidarModal(group);
        break;
      case 'cancel':
        this.cancelGroup(group);
        break;
      case 'ship':
        this.markAsShipped(group);
        break;
      case 'receive':
        this.markAsReceived(group);
        break;
      case 'deliver':
        this.openDeliveryModal(group);
        break;
    }
  }

  openDetailModal(group: BuyGroup) {
    this.selectedGroupForModal.set(group);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal() {
    this.isDetailModalOpen.set(false);
    this.selectedGroupForModal.set(null);
  }

  openConsolidarModal(group: BuyGroup) {
    this.selectedGroupForModal.set(group);
    this.isConsolidarModalOpen.set(true);
  }

  closeConsolidarModal() {
    this.isConsolidarModalOpen.set(false);
    this.selectedGroupForModal.set(null);
  }

  async confirmWholesaleOrder() {
    const group = this.selectedGroupForModal();
    if (!group) return;

    this.closeConsolidarModal();
    this.isLoading.set(true);

    const { error } = await this.appFacadeService.consolidateBuyGroups({
      nodeId: this.selectedNodeId(),
      groupIds: [group.id],
    });

    if (error) {
      this.toastService.showError(error.message);
      this.isLoading.set(false);
    } else {
      this.toastService.showSuccess('Pedido consolidado y ordenado al mayorista.');
      await this.fetchGroups();
    }
  }

  async markAsShipped(group: BuyGroup) {
    await this.updateStatus(group.id, 'SHIPPED', 'El bulto ha sido marcado como enviado por el mayorista.');
  }

  async markAsReceived(group: BuyGroup) {
    await this.updateStatus(group.id, 'READY_FOR_PICKUP', 'Bulto recibido en nodo. Clientes notificados para retiro.');
  }

  openDeliveryModal(group: BuyGroup) {
    this.selectedGroupForModal.set(group);
    this.manualOrderCode = '';
    this.isDeliveryModalOpen.set(true);
  }

  closeDeliveryModal() {
    this.isDeliveryModalOpen.set(false);
    this.selectedGroupForModal.set(null);
  }

  async confirmManualDelivery() {
    const group = this.selectedGroupForModal();
    if (!group) return;

    this.isDeliveringOrder.set(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    this.isDeliveringOrder.set(false);
    this.closeDeliveryModal();

    await this.updateStatus(group.id, 'FINALIZED', 'Todos los pedidos de este bulto fueron entregados exitosamente.');
  }

  async cancelGroup(group: BuyGroup) {
    if (confirm('¿Estás seguro de cancelar este grupo de compra? Se liberarán y reembolsarán automáticamente los fondos autorizados a los clientes en Mercado Pago.')) {
      await this.updateStatus(group.id, 'CANCELLED', 'Grupo cancelado y fondos liberados en Mercado Pago.');
    }
  }

  private async updateStatus(id: string, status: string, successMessage: string) {
    this.isLoading.set(true);
    const { error } = await this.appFacadeService.updateBuyGroupStatus(id, status);

    if (error) {
      this.toastService.showError(error.message);
      this.isLoading.set(false);
    } else {
      this.toastService.showSuccess(successMessage);
      await this.fetchGroups();
    }
  }
}