import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { NgClass, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  IonModal,
  IonBadge
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

@Component({
  selector: 'app-consolidacion',
  templateUrl: './consolidacion.page.html',
  styleUrls: ['./consolidacion.page.scss'],
  standalone: true,
  imports: [
    NgClass,
    DecimalPipe,
    RouterModule,
    FormsModule,
    HeaderComponent,
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
    IonModal,
    IonBadge
  ]
})
export class ConsolidacionPage implements OnInit {
  private appFacadeService = inject(AppFacadeService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  // States
  isLoading = signal<boolean>(false);
  nodos = signal<Nodo[]>([]);
  selectedNodeId = signal<string>('');
  activeTab = signal<'order' | 'shipping' | 'pickup' | 'finalized'>('order');
  buyGroups = signal<BuyGroup[]>([]);

  // User Profile
  userRole = this.appFacadeService.userRole;
  currentUser = this.appFacadeService.currentUser;

  // Modals state
  selectedGroupForModal = signal<BuyGroup | null>(null);
  isConsolidarModalOpen = signal<boolean>(false);
  isDeliveryModalOpen = signal<boolean>(false);

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

    // 1. Cargar nodos si es ADMIN
    if (this.userRole() === 'ADMIN') {
      const { data, error } = await this.appFacadeService.getNodos();
      if (!error && data) {
        this.nodos.set(data);
        if (data.length > 0) {
          // Seleccionar el primero por defecto
          this.selectedNodeId.set(data[0].id || '');
        }
      }
    } else if (this.userRole() === 'NODO') {
      // Si es NODO, fijar a su default_node_id
      const defaultNodeId = this.currentUser()?.default_node_id || '';
      this.selectedNodeId.set(defaultNodeId);
    }

    // 2. Cargar grupos filtrados
    await this.fetchGroups();
    this.isLoading.set(false);
  }

  // Filtrar grupos en memoria para el tab seleccionado
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
    if (this.userRole() === 'ADMIN') {
      this.router.navigate(['/admin/gestiones']);
    } else {
      this.router.navigate(['/home'], { queryParams: { tab: 'config' } });
    }
  }

  // --- LOGÍSTICA & ACCIONES DE ESTADOS ---

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

    const { data, error } = await this.appFacadeService.consolidateBuyGroups({
      nodeId: this.selectedNodeId(),
      groupIds: [group.id],
    });

    if (error) {
      this.toastService.showError(error.message);
      this.isLoading.set(false);
    } else {
      this.toastService.showSuccess('Pedido consolidado y ordenado al mayorista.');
      await this.fetchGroups(); // Recargar lista de bultos
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

    // Simular procesamiento del código u orden
    await new Promise((resolve) => setTimeout(resolve, 1000));

    this.isDeliveringOrder.set(false);
    this.closeDeliveryModal();

    // Transicionar el grupo a FINALIZED (Hito #4: marca todo el bulto como entregado)
    await this.updateStatus(group.id, 'FINALIZED', 'Todos los pedidos de este bulto fueron entregados exitosamente.');
  }

  async cancelGroup(group: BuyGroup) {
    if (confirm('¿Estás seguro de cancelar este grupo de compra? Se liberarán y reembolsarán automáticamente los fondos autorizados a los clientes en Mercado Pago.')) {
      await this.updateStatus(group.id, 'CANCELLED', 'Grupo cancelado y fondos liberados en Mercado Pago.');
    }
  }

  // Helper centralizado para actualizar estado
  private async updateStatus(id: string, status: string, successMessage: string) {
    this.isLoading.set(true);
    const { error } = await this.appFacadeService.updateBuyGroupStatus(id, status);

    if (error) {
      this.toastService.showError(error.message);
      this.isLoading.set(false);
    } else {
      this.toastService.showSuccess(successMessage);
      await this.fetchGroups(); // Recargar lista
    }
  }
}
