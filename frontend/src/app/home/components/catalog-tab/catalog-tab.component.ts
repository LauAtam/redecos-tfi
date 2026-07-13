import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, Input, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonSpinner, IonText, IonButton, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, peopleOutline, searchOutline, closeOutline, cardOutline } from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { Nodo, Producto, BuyGroup, Categoria, UserCard } from '../../../core/models/auth.models';
import { Subscription } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-catalog-tab',
  templateUrl: './catalog-tab.component.html',
  styleUrls: ['./catalog-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonSpinner,
    IonText,
    IonButton,
    IonIcon,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent
  ],
  providers: [CurrencyPipe]
})
export class CatalogTabComponent implements OnInit, OnDestroy, OnChanges {
  @Input() activeNode: Nodo | null = null;

  private appFacadeService = inject(AppFacadeService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  products: Producto[] = [];
  activeGroups: BuyGroup[] = [];
  isLoadingProducts = false;
  isLoadingGroups = false;
  errorMessage: string | null = null;

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('Todos');
  categories = signal<Categoria[]>([]);

  // Estado del Modal y Stepper
  selectedProduct = signal<Producto | null>(null);
  isModalOpen = signal<boolean>(false);
  buyQuantity = signal<number>(1);
  isProcessingPayment = signal<boolean>(false);
  activeGroup = signal<BuyGroup | null>(null);

  // Tarjeta de prueba hardcodeada (Mastercard sandbox de MercadoPago)
  readonly testCard = {
    number: '5031755734530604',
    cvv: '123',
    expirationMonth: '11',
    expirationYear: '2030',
    cardholderName: 'APRO',
    docType: 'DNI',
    docNumber: '12345678',
    label: 'Mastercard de prueba terminada en 0604',
  };

  // Gestión de tarjetas guardadas en el flujo de compra
  savedCards = signal<UserCard[]>([]);
  selectedCard = signal<UserCard | null>(null);
  useSavedCard = signal<boolean>(false);
  cvv = signal<string>('');

  paymentError = '';

  private routeSub?: Subscription;

  constructor() {
    addIcons({
      cartOutline,
      peopleOutline,
      searchOutline,
      closeOutline,
      cardOutline
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadProducts();
    this.loadActiveGroups();

    // Sincronizar estado del modal con query params de la URL
    this.routeSub = this.route.queryParams.subscribe(async params => {
      const productId = params['productId'];
      const nodeId = params['nodeId'];
      if (productId) {
        await this.handleQueryProduct(productId, nodeId);
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }



  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode']) {
      this.loadActiveGroups();
    }
  }

  async loadCategories() {
    const { data, error } = await this.appFacadeService.getCategorias();
    if (!error && data) {
      this.categories.set(data);
    }
  }

  async loadProducts() {
    this.isLoadingProducts = true;
    this.errorMessage = null;

    const categoryValue = this.selectedCategory();
    const categoryId = categoryValue === 'Todos' ? undefined : categoryValue;
    const search = this.searchQuery().trim() || undefined;

    const { data, error } = await this.appFacadeService.getProductos({
      categoryId,
      search
    });
    this.isLoadingProducts = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      this.products = data || [];
    }
  }

  async loadActiveGroups() {
    if (!this.activeNode || !this.activeNode.id) {
      this.activeGroups = [];
      return;
    }
    this.isLoadingGroups = true;
    const { data, error } = await this.appFacadeService.getActiveBuyGroups(this.activeNode.id);
    this.isLoadingGroups = false;
    if (!error) {
      this.activeGroups = data || [];
    }
  }

  onSearch(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value || '');
    this.loadProducts();
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
    this.loadProducts();
  }

  isGroupActive(productId?: string): boolean {
    if (!productId) return false;
    return this.activeGroups.some(g => g.productId === productId);
  }

  getGroupForProduct(productId?: string): BuyGroup | null {
    if (!productId) return null;
    return this.activeGroups.find(g => g.productId === productId) || null;
  }

  get filteredProducts(): Producto[] {
    return this.products;
  }

  calculateSavings(price: number, retailPrice?: number): number {
    if (!retailPrice || retailPrice <= 0) return 0;
    return Math.round(((retailPrice - price) / retailPrice) * 100);
  }

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  onProductClick(product: Producto) {
    if (!product || !product.id) return;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        productId: product.id,
        nodeId: this.activeNode?.id || null
      },
      queryParamsHandling: 'merge'
    });
  }

  async handleQueryProduct(productId: string, urlNodeId?: string) {
    if (this.isLoadingProducts) {
      let attempts = 0;
      while (this.isLoadingProducts && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 300));
        attempts++;
      }
    }

    const product = this.products.find(p => p.id === productId);
    if (!product) {
      this.toastService.showError('El producto no está disponible.');
      this.clearQueryParams();
      return;
    }

    if (urlNodeId && this.activeNode && urlNodeId !== this.activeNode.id) {
      const { data: nodes } = await this.appFacadeService.getNodos();
      const urlNodeName = nodes?.find(n => n.id === urlNodeId)?.name || 'otro nodo';
      const userNodeName = this.activeNode.name || 'tu nodo predeterminado';

      const alert = await this.alertController.create({
        header: 'Cambiar de Punto de Retiro',
        message: `Este grupo de compra pertenece al Nodo "${urlNodeName}". Tu punto de retiro actual es "${userNodeName}".\n\n¿Querés cambiar tu punto de retiro para unirte a esta compra colectiva?`,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => {
              this.clearQueryParams();
            }
          },
          {
            text: 'Cambiar y abrir',
            handler: async () => {
              const { error } = await this.appFacadeService.updateProfile({ default_node_id: urlNodeId });
              if (error) {
                this.toastService.showError('No se pudo cambiar el punto de retiro: ' + error.message);
                this.clearQueryParams();
              } else {
                this.toastService.showSuccess(`Cambiado al Punto de Retiro: ${urlNodeName}`);
                let attempts = 0;
                while ((!this.activeNode || this.activeNode.id !== urlNodeId) && attempts < 20) {
                  await new Promise(resolve => setTimeout(resolve, 100));
                  attempts++;
                }
                this.openProductModal(product);
              }
            }
          }
        ]
      });
      await alert.present();
    } else {
      this.openProductModal(product);
    }
  }

  async openProductModal(product: Producto) {
    this.selectedProduct.set(product);
    const group = this.getGroupForProduct(product.id);
    this.activeGroup.set(group);
    this.buyQuantity.set(1);
    this.isModalOpen.set(true);
    this.paymentError = '';
    this.cvv.set('');

    // Cargar tarjetas guardadas para el flujo rápido
    try {
      const { data } = await this.appFacadeService.listSavedCards();
      if (data && data.length > 0) {
        this.savedCards.set(data);
        this.selectedCard.set(data[0]); // Por defecto la primera
        this.useSavedCard.set(true);
      } else {
        this.savedCards.set([]);
        this.selectedCard.set(null);
        this.useSavedCard.set(false);
      }
    } catch (err) {
      console.warn('Error al cargar tarjetas para el checkout:', err);
      this.savedCards.set([]);
      this.selectedCard.set(null);
      this.useSavedCard.set(false);
    }
  }

  closeDetailModal() {
    this.isModalOpen.set(false);
    this.selectedProduct.set(null);
    this.activeGroup.set(null);
    this.paymentError = '';
    this.cvv.set('');
    this.selectedCard.set(null);
    this.useSavedCard.set(false);
    this.clearQueryParams();
  }

  clearQueryParams() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        productId: null,
        nodeId: null
      },
      queryParamsHandling: 'merge'
    });
  }

  maxQuantity(): number {
    const group = this.activeGroup();
    if (group) {
      return group.unitsLeft || 1;
    }
    return this.selectedProduct()?.bulk_size || 1;
  }

  incrementQuantity() {
    const current = this.buyQuantity();
    const max = this.maxQuantity();
    if (current < max) {
      this.buyQuantity.set(current + 1);
    }
  }

  decrementQuantity() {
    const current = this.buyQuantity();
    if (current > 1) {
      this.buyQuantity.set(current - 1);
    }
  }

  /**
   * Tokeniza la tarjeta de prueba hardcodeada contra la API REST de Mercado Pago
   * y envía el token al backend para pre-autorizar el pago.
   */
  async confirmAndPay() {
    const product = this.selectedProduct();
    if (!product || !product.id) return;

    if (!this.activeNode || !this.activeNode.id) {
      this.toastService.showError('Debes seleccionar un punto de retiro para comprar.');
      return;
    }

    const qty = this.buyQuantity();
    if (qty <= 0 || qty > this.maxQuantity()) {
      this.toastService.showError('Cantidad no permitida.');
      return;
    }

    this.isProcessingPayment.set(true);
    this.paymentError = '';

    let paymentToken = '';
    let paymentMethodId = '';

    try {
      const mpInstance = (window as any).MercadoPago 
        ? new (window as any).MercadoPago(environment.mercadoPagoPublicKey) 
        : null;

      if (!mpInstance) {
        throw new Error('El SDK de Mercado Pago no está disponible. Volvé a intentar en unos segundos.');
      }

      if (this.useSavedCard()) {
        const savedCard = this.selectedCard();
        if (!savedCard) {
          throw new Error('No seleccionaste ninguna tarjeta guardada.');
        }
        if (!this.cvv().trim()) {
          throw new Error('Por favor ingresá el código de seguridad (CVV) de tu tarjeta.');
        }

        paymentMethodId = savedCard.brand.toLowerCase();

        console.log('Tokenizando tarjeta guardada ID:', savedCard.card_id);
        const tokenResponse = await mpInstance.createCardToken({
          cardId: savedCard.card_id,
          securityCode: this.cvv()
        });

        if (!tokenResponse || !tokenResponse.id) {
          throw new Error('No se pudo generar el token para la tarjeta guardada.');
        }

        paymentToken = tokenResponse.id;
      } else {
        // Obtener dinámicamente el paymentMethodId usando el BIN (primeros 6 dígitos) de la tarjeta
        const rawCardNumber = this.testCard.number.replace(/\s/g, '');
        const bin = rawCardNumber.substring(0, 6);
        
        try {
          const paymentMethods = await mpInstance.getPaymentMethods({ bin });
          if (paymentMethods && paymentMethods.length > 0) {
            paymentMethodId = paymentMethods[0].id;
            console.log('Método de pago detectado:', paymentMethodId);
          } else {
            paymentMethodId = 'master'; // fallback
          }
        } catch (pmErr) {
          console.warn('No se pudo determinar el método de pago por BIN, usando master por defecto:', pmErr);
          paymentMethodId = 'master';
        }

        const tokenResponse = await mpInstance.createCardToken({
          cardNumber: rawCardNumber,
          cardholderName: this.testCard.cardholderName,
          cardExpirationMonth: this.testCard.expirationMonth,
          cardExpirationYear: this.testCard.expirationYear,
          securityCode: this.testCard.cvv,
          identificationType: this.testCard.docType,
          identificationNumber: this.testCard.docNumber
        });

        if (!tokenResponse || !tokenResponse.id) {
          throw new Error('No se pudo generar el token de pago.');
        }

        paymentToken = tokenResponse.id;
      }

      console.log('Token de tarjeta generado vía SDK:', paymentToken);
    } catch (err: any) {
      console.error('Fallo tokenización de tarjeta:', err);
      this.isProcessingPayment.set(false);
      this.paymentError = `Error de pago: ${err.message}`;
      this.toastService.showError(this.paymentError);
      return;
    }

    // Paso 2: Enviar token al backend para pre-autorizar el pago
    const profile = this.appFacadeService.currentUser();
    const { data: order, error } = await this.appFacadeService.joinOrCreateBuyGroup({
      productId: product.id,
      quantity: qty,
      nodeId: this.activeNode.id,
      paymentToken,
      paymentMethodId,
      cardholderEmail: profile?.email || '',
    });

    this.isProcessingPayment.set(false);

    if (error) {
      this.paymentError = error.message;
      this.toastService.showError(error.message);
    } else {
      const formattedName = this.formatProductName(product.name);
      this.toastService.showSuccess(`¡Compra pre-autorizada! Compraste ${qty} u. de "${formattedName}".`);
      this.closeDetailModal();
      this.loadActiveGroups();
    }
  }

  getRemainingTimeText(createdAt: string): string {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(23, 59, 59, 999);
    const diffMs = midnight.getTime() - now.getTime();

    if (diffMs <= 0) return 'Cierra ahora';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Cierra en ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} Hs`;
  }
}
