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
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonModal,
  IonBadge,
  IonCheckbox
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  businessOutline,
  carOutline,
  cubeOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  qrCodeOutline,
  closeOutline,
  refreshOutline,
  peopleOutline,
  checkmarkOutline
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { BuyGroup } from '../../../core/models/auth.models';
import { HeaderComponent } from '../../../core/components/header/header.component';
import { BultoCardComponent, BultoAction } from '../../../core/components/bulto-card/bulto-card.component';
import { Html5Qrcode } from 'html5-qrcode';

@Component({
  selector: 'app-nodo-logistica',
  templateUrl: './nodo-logistica.page.html',
  styleUrls: ['./nodo-logistica.page.scss'],
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
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonModal,
    IonBadge,
    IonCheckbox
  ]
})
export class NodoLogisticaPage implements OnInit {
  private appFacadeService = inject(AppFacadeService);
  private navCtrl = inject(NavController);
  private toastService = inject(ToastService);

  // States
  isLoading = signal<boolean>(false);
  selectedNodeId = signal<string>('');
  activeTab = signal<'shipping' | 'pickup' | 'finalized'>('shipping');
  buyGroups = signal<BuyGroup[]>([]);

  // User Profile
  currentUser = this.appFacadeService.currentUser;

  // Modals state
  selectedGroupForModal = signal<BuyGroup | null>(null);
  isDeliveryModalOpen = signal<boolean>(false);
  isDetailModalOpen = signal<boolean>(false);

  // Scanner & Delivery flow state signals
  scannerModalOpen = signal<boolean>(false);
  scannedClientProfile = signal<any | null>(null);
  scannedOrders = signal<any[]>([]);
  selectedOrderIds = signal<string[]>([]);
  deliveryStep = signal<'scan' | 'checklist' | 'pin' | 'loading'>('scan');
  enteredPin = signal<string>('');
  private html5QrcodeScanner: any = null;

  // Mock delivery order selection
  manualOrderCode = '';
  isDeliveringOrder = signal<boolean>(false);

  // Informative node details
  nodeName = signal<string>('Mi Punto de Retiro');

  constructor() {
    addIcons({
      arrowBackOutline,
      businessOutline,
      carOutline,
      cubeOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      qrCodeOutline,
      closeOutline,
      refreshOutline,
      peopleOutline,
      checkmarkOutline
    });
  }

  async ngOnInit() {
    this.isLoading.set(true);

    // Fijar el ID del nodo al predeterminado del Coordinador
    const defaultNodeId = this.currentUser()?.default_node_id || '';
    this.selectedNodeId.set(defaultNodeId);

    // Cargar información estética del nodo asignado
    const { data: statsData } = await this.appFacadeService.getNodeDashboardStats(defaultNodeId);
    if (statsData && statsData.node) {
      this.nodeName.set(statsData.node.name);
    }

    await this.fetchGroups();
    this.isLoading.set(false);
  }

  filteredBuyGroups = computed(() => {
    const tab = this.activeTab();
    const groups = this.buyGroups();

    return groups.filter(g => {
      switch (tab) {
        case 'shipping':
          // El rol NODO sólo gestiona paquetes en tránsito (SHIPPED)
          return g.status === 'SHIPPED';
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

  async onTabChange(event: any) {
    this.activeTab.set(event.detail.value);
  }

  getBultoActions(group: BuyGroup): BultoAction[] {
    const actions: BultoAction[] = [];

    if (group.status === 'SHIPPED') {
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
      case 'receive':
        this.markAsReceived(group);
        break;
      case 'deliver':
        this.startScanner();
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

  async markAsReceived(group: BuyGroup) {
    await this.updateStatus(group.id, 'READY_FOR_PICKUP', 'Bulto recibido en nodo. Clientes notificados para retiro.');
  }

  // --- FLUJO DE ESCANEO DE QR Y ENTREGA REAL ---
  startScanner() {
    this.deliveryStep.set('scan');
    this.scannerModalOpen.set(true);
  }

  onScannerModalPresented() {
    this.html5QrcodeScanner = new Html5Qrcode('reader');

    // Función dinámica para asegurar que el área sea cuadrada y adaptada
    const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
      const qrboxSize = Math.floor(minEdge * 0.7); // 70% de la dimensión menor
      return {
        width: qrboxSize,
        height: qrboxSize
      };
    };

    this.html5QrcodeScanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: qrboxFunction,
      },
      async (decodedText: string) => {
        await this.stopScanner();
        this.handleScannedQr(decodedText);
      }
    ).catch((err: any) => {
      console.error('Error al iniciar cámara:', err);
      this.toastService.showError('No se pudo acceder a la cámara. Verificá los permisos.');
    });
  }

  async stopScanner() {
    if (this.html5QrcodeScanner && this.html5QrcodeScanner.isScanning) {
      try {
        await this.html5QrcodeScanner.stop();
      } catch (err) {
        console.error('Error al detener cámara:', err);
      }
    }
  }

  async closeScannerModal() {
    await this.stopScanner();
    this.scannerModalOpen.set(false);
    this.scannedClientProfile.set(null);
    this.scannedOrders.set([]);
    this.selectedOrderIds.set([]);
    this.enteredPin.set('');
  }

  async handleScannedQr(decodedText: string) {
    try {
      const payload = JSON.parse(decodedText);
      if (!payload.profileId) {
        this.toastService.showError('Código QR no válido.');
        this.closeScannerModal();
        return;
      }

      this.deliveryStep.set('loading');

      // Consultar pedidos listos para retirar de este cliente en este nodo
      const { data, error } = await this.appFacadeService.getClientPendingOrders(payload.profileId);
      if (error) {
        this.toastService.showError(error.message);
        this.closeScannerModal();
        return;
      }

      if (!data || data.length === 0) {
        this.toastService.showError('El cliente no tiene pedidos listos para retirar en este nodo.');
        this.closeScannerModal();
        return;
      }

      // Buscar perfil para info estética
      const profileRes = await this.appFacadeService.getUserProfile(payload.profileId);
      if (profileRes.user) {
        this.scannedClientProfile.set(profileRes.user);
      }

      this.scannedOrders.set(data);
      // Seleccionar todos por defecto
      this.selectedOrderIds.set(data.map((o: any) => o.id));
      this.deliveryStep.set('checklist');
    } catch (err) {
      this.toastService.showError('Error al parsear el código QR.');
      this.closeScannerModal();
    }
  }

  toggleOrderSelection(orderId: string) {
    const current = this.selectedOrderIds();
    if (current.includes(orderId)) {
      this.selectedOrderIds.set(current.filter((id) => id !== orderId));
    } else {
      this.selectedOrderIds.set([...current, orderId]);
    }
  }

  goToPinStep() {
    if (this.selectedOrderIds().length === 0) {
      this.toastService.showError('Seleccioná al menos un producto para entregar.');
      return;
    }
    this.deliveryStep.set('pin');
  }

  async submitPin() {
    const pin = this.enteredPin().trim();
    if (!pin || pin.length !== 4) {
      this.toastService.showError('Ingresá el PIN de 4 dígitos del cliente.');
      return;
    }

    const profile = this.scannedClientProfile();
    if (!profile) return;

    this.deliveryStep.set('loading');
    const { error } = await this.appFacadeService.confirmDelivery({
      profileId: profile.id,
      otp: pin,
      orderIds: this.selectedOrderIds(),
    });

    if (error) {
      this.toastService.showError(error.message);
      this.deliveryStep.set('pin');
    } else {
      this.toastService.showSuccess('¡Pedidos entregados con éxito!');
      await this.closeScannerModal();
      await this.fetchGroups();
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
