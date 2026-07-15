import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, signal, Input, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonSpinner,
  IonText,
  IonButton,
  IonIcon,
  IonChip,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cartOutline,
  peopleOutline,
  searchOutline,
  closeOutline,
  cardOutline,
  removeOutline,
  addOutline,
  helpCircleOutline
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { Nodo, Producto, BuyGroup, Categoria, UserCard } from '../../../core/models/auth.models';
import { Subscription, Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProductModalComponent } from '../../../core/components/product-modal/product-modal.component';

@Component({
  selector: 'app-catalog-tab',
  templateUrl: './catalog-tab.component.html',
  styleUrls: ['./catalog-tab.component.scss'],
  standalone: true,
  imports: [
    RouterModule,
    FormsModule,
    CurrencyPipe,
    IonSpinner,
    IonText,
    IonButton,
    IonIcon,
    IonChip,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ProductModalComponent
  ]
})
export class CatalogTabComponent implements OnInit, OnDestroy, OnChanges {
  @Input() activeNode: Nodo | null = null;

  private appFacadeService = inject(AppFacadeService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private searchSubject = new Subject<string>();
  private searchSub: Subscription | null = null;

  products: Producto[] = [];
  activeGroups: BuyGroup[] = [];
  isLoadingProducts = false;
  isLoadingGroups = false;
  errorMessage: string | null = null;

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('Todos');
  categories = signal<Categoria[]>([]);

  currentPage = 1;
  limit = 20;
  hasMoreProducts = signal<boolean>(true);

  // Estado del Modal
  selectedProduct = signal<Producto | null>(null);
  isModalOpen = signal<boolean>(false);

  private routeSub?: Subscription;

  constructor() {
    addIcons({
      cartOutline,
      peopleOutline,
      searchOutline,
      closeOutline,
      cardOutline,
      removeOutline,
      addOutline,
      helpCircleOutline
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

    // Configurar rate limiter (debounce) y filtro de longitud mínima para el buscador
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(async (term) => {
      const trimmed = term.trim();
      if (trimmed.length === 0 || trimmed.length >= 3) {
        this.searchQuery.set(trimmed);
        await this.loadProducts();
      }
    });
  }

  ngOnDestroy() {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
    if (this.searchSub) {
      this.searchSub.unsubscribe();
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

  async loadProducts(append = false) {
    if (!append) {
      this.currentPage = 1;
      this.hasMoreProducts.set(true);
      this.isLoadingProducts = true;
    }
    this.errorMessage = null;

    const categoryValue = this.selectedCategory();
    const categoryId = categoryValue === 'Todos' ? undefined : categoryValue;
    const search = this.searchQuery().trim() || undefined;

    const { data, error } = await this.appFacadeService.getProductos({
      categoryId,
      search,
      page: this.currentPage,
      limit: this.limit
    });
    
    if (!append) {
      this.isLoadingProducts = false;
    }

    if (error) {
      this.errorMessage = error.message;
    } else {
      const newProducts = data || [];
      if (append) {
        this.products = [...this.products, ...newProducts];
      } else {
        this.products = newProducts;
      }
      
      if (newProducts.length < this.limit) {
        this.hasMoreProducts.set(false);
      }
    }
  }

  async loadMore(event: any) {
    this.currentPage++;
    await this.loadProducts(true);
    event.target.complete();
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
    this.searchSubject.next(input.value || '');
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

  formatCardOptionText(card: UserCard): string {
    let brand = card.brand ? card.brand.trim().toUpperCase() : 'TARJETA';
    brand = brand.charAt(0) + brand.slice(1).toLowerCase();

    const month = String(card.expiration_mo).padStart(2, '0');
    const yrStr = String(card.expiration_yr);
    const year = yrStr.length === 4 ? yrStr.slice(2) : yrStr;
    return `${brand} •••• ${card.last_four} (${month}/${year})`;
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
    this.isModalOpen.set(true);
  }

  closeDetailModal() {
    this.isModalOpen.set(false);
    this.selectedProduct.set(null);
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
}
