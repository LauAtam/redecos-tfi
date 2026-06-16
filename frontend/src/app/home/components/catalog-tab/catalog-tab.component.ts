import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, Input, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { IonSpinner, IonText, IonButton, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, peopleOutline, searchOutline, closeOutline } from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { Nodo, Producto, BuyGroup, Categoria } from '../../../core/models/auth.models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-catalog-tab',
  templateUrl: './catalog-tab.component.html',
  styleUrls: ['./catalog-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
  
  private supabaseService = inject(SupabaseService);
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

  private routeSub?: Subscription;

  constructor() {
    addIcons({
      cartOutline,
      peopleOutline,
      searchOutline,
      closeOutline
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
    const { data, error } = await this.supabaseService.getCategorias();
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

    const { data, error } = await this.supabaseService.getProductos({
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
    const { data, error } = await this.supabaseService.getActiveBuyGroups(this.activeNode.id);
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
      const { data: nodes } = await this.supabaseService.getNodos();
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
              const { error } = await this.supabaseService.updateProfile({ default_node_id: urlNodeId });
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

  openProductModal(product: Producto) {
    this.selectedProduct.set(product);
    const group = this.getGroupForProduct(product.id);
    this.activeGroup.set(group);
    this.buyQuantity.set(1);
    this.isModalOpen.set(true);
  }

  closeDetailModal() {
    this.isModalOpen.set(false);
    this.selectedProduct.set(null);
    this.activeGroup.set(null);
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

    await new Promise(resolve => setTimeout(resolve, 1500));

    const { data: order, error } = await this.supabaseService.joinOrCreateBuyGroup({
      productId: product.id,
      quantity: qty,
      nodeId: this.activeNode.id
    });

    this.isProcessingPayment.set(false);

    if (error) {
      this.toastService.showError(error.message);
    } else {
      const formattedName = this.formatProductName(product.name);
      this.toastService.showSuccess(`¡Compra realizada! Compraste ${qty} u. de "${formattedName}".`);
      
      this.closeDetailModal();
      this.loadActiveGroups();
    }
  }

  getRemainingDaysText(createdAt: string): string {
    const createdDate = new Date(createdAt);
    const endDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Cierra pronto';
    if (diffDays === 1) return 'Cierra mañana';
    return `Cierra en ${diffDays} días`;
  }
}
