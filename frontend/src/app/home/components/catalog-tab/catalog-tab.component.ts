import { Component, OnInit, OnChanges, SimpleChanges, signal, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonSpinner, IonText, IonButton, IonIcon } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cartOutline, peopleOutline, searchOutline } from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { Nodo, Producto, BuyGroup } from '../../../core/models/auth.models';

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
    IonIcon
  ],
  providers: [CurrencyPipe]
})
export class CatalogTabComponent implements OnInit, OnChanges {
  @Input() activeNode: Nodo | null = null;
  
  products: Producto[] = [];
  activeGroups: BuyGroup[] = [];
  isLoadingProducts = false;
  isLoadingGroups = false;
  errorMessage: string | null = null;

  searchQuery = signal<string>('');
  selectedCategory = signal<string>('Todos');

  constructor(
    private supabaseService: SupabaseService,
    private toastService: ToastService,
    private alertController: AlertController
  ) {
    addIcons({
      cartOutline,
      peopleOutline,
      searchOutline
    });
  }

  ngOnInit() {
    this.loadProducts();
    this.loadActiveGroups();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode']) {
      this.loadActiveGroups();
    }
  }

  async loadProducts() {
    this.isLoadingProducts = true;
    this.errorMessage = null;

    const { data, error } = await this.supabaseService.getProductos();
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
  }

  selectCategory(category: string) {
    this.selectedCategory.set(category);
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
    const query = this.searchQuery().toLowerCase().trim();
    const category = this.selectedCategory();

    return this.products.filter(product => {
      const matchesSearch = !query || 
        product.name.toLowerCase().includes(query) || 
        (product.description && product.description.toLowerCase().includes(query));

      if (category === 'Todos') {
        return matchesSearch;
      }

      const nameLower = product.name.toLowerCase();
      const descLower = (product.description || '').toLowerCase();
      
      const isAlmacen = nameLower.includes('fideo') || nameLower.includes('arroz') || 
                        nameLower.includes('harina') || nameLower.includes('aceite') || 
                        nameLower.includes('yerba') || descLower.includes('almacén') || 
                        descLower.includes('fideo') || descLower.includes('arroz');

      const isVerduras = nameLower.includes('tomate') || nameLower.includes('papa') || 
                         nameLower.includes('verdura') || nameLower.includes('cajón') || 
                         nameLower.includes('manzana') || nameLower.includes('naranja') ||
                         descLower.includes('verdura') || descLower.includes('fruta');

      const isLacteos = nameLower.includes('leche') || nameLower.includes('queso') || 
                        nameLower.includes('yogur') || nameLower.includes('manteca') || 
                        nameLower.includes('crema') || descLower.includes('lácteo') || 
                        descLower.includes('leche') || descLower.includes('queso');

      if (category === 'Almacén') {
        return matchesSearch && isAlmacen;
      }
      if (category === 'Verduras') {
        return matchesSearch && isVerduras;
      }
      if (category === 'Lácteos') {
        return matchesSearch && isLacteos;
      }

      return matchesSearch;
    });
  }

  calculateSavings(price: number, retailPrice?: number): number {
    if (!retailPrice || retailPrice <= 0) return 0;
    return Math.round(((retailPrice - price) / retailPrice) * 100);
  }

  async joinGroupBuy(producto: Producto) {
    if (!this.activeNode || !this.activeNode.id) {
      this.toastService.showError('Debes seleccionar un punto de retiro para comprar.');
      return;
    }
    const group = this.getGroupForProduct(producto.id);
    const unitsLeftText = group ? `Faltan ${group.unitsLeft} unidades para cerrar el bulto.` : '';

    const alert = await this.alertController.create({
      header: 'Sumarse a Compra Colectiva',
      message: `¿Cuántas unidades de "${producto.name}" querés comprar?\nPrecio: ${producto.price} por unidad. ${unitsLeftText}`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Cantidad',
          min: 1,
          value: '1'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sumarme',
          handler: async (data) => {
            const quantity = parseInt(data.quantity, 10);
            if (isNaN(quantity) || quantity <= 0) {
              this.toastService.showError('Cantidad inválida.');
              return;
            }
            
            const { data: order, error } = await this.supabaseService.joinOrCreateBuyGroup({
              productId: producto.id!,
              quantity,
              nodeId: this.activeNode!.id!
            });

            if (error) {
              this.toastService.showError(error.message);
            } else {
              this.toastService.showSuccess(`¡Te sumaste con ${quantity} u. a la compra de "${producto.name}"!`);
              this.loadActiveGroups();
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async startGroupBuy(producto: Producto) {
    if (!this.activeNode || !this.activeNode.id) {
      this.toastService.showError('Debes seleccionar un punto de retiro para iniciar un grupo.');
      return;
    }
    const alert = await this.alertController.create({
      header: 'Iniciar Grupo de Compra',
      message: `¿Cuántas unidades de "${producto.name}" querés comprar para iniciar el grupo?\nSe requiere juntar ${producto.bulk_size} unidades totales en tu Punto de Retiro.`,
      inputs: [
        {
          name: 'quantity',
          type: 'number',
          placeholder: 'Cantidad',
          min: 1,
          value: '1'
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Iniciar',
          handler: async (data) => {
            const quantity = parseInt(data.quantity, 10);
            if (isNaN(quantity) || quantity <= 0) {
              this.toastService.showError('Cantidad inválida.');
              return;
            }

            const { data: order, error } = await this.supabaseService.joinOrCreateBuyGroup({
              productId: producto.id!,
              quantity,
              nodeId: this.activeNode!.id!
            });

            if (error) {
              this.toastService.showError(error.message);
            } else {
              this.toastService.showSuccess(`¡Iniciaste el grupo de compra de "${producto.name}" con ${quantity} u.!`);
              this.loadActiveGroups();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
