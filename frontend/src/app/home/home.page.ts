import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
  IonFooter
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  storefrontOutline,
  peopleOutline,
  cartOutline,
  swapHorizontalOutline,
  personOutline,
  helpCircleOutline,
  chevronForwardOutline,
  cubeOutline,
  businessOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../supabase.service';
import { Nodo, Producto } from '../core/models/auth.models';
import { ToastService } from '../core/services/toast.service';
import { HeaderComponent } from '../core/components/header/header.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonText,
    IonFooter
  ],
  providers: [CurrencyPipe]
})
export class HomePage implements OnInit, OnDestroy {
  currentTab = signal<'groups' | 'products' | 'config'>('products');
  activeNode: Nodo | null = null;
  products: Producto[] = [];
  isLoadingProducts = false;
  isLoadingNode = false;
  errorMessage: string | null = null;

  private userSub?: Subscription;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
    private toastService: ToastService,
    private alertController: AlertController
  ) {
    addIcons({
      logOutOutline,
      storefrontOutline,
      peopleOutline,
      cartOutline,
      swapHorizontalOutline,
      personOutline,
      helpCircleOutline,
      chevronForwardOutline,
      cubeOutline,
      businessOutline
    });
  }

  ngOnInit() {
    this.isLoadingNode = true;
    this.userSub = this.supabaseService.currentUser$.subscribe(async (profile) => {
      if (profile && profile.default_node_id) {
        await this.loadActiveNode(profile.default_node_id);
      } else {
        this.activeNode = null;
        this.isLoadingNode = false;
      }
    });

    this.loadProducts();
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  setTab(tab: 'groups' | 'products' | 'config') {
    this.currentTab.set(tab);
  }

  get activeGroups() {
    return this.products.slice(0, 2).map((p, index) => {
      const mockUnitsBought = [14, 9][index] || 5;
      const unitsLeft = Math.max(1, p.bulk_size - mockUnitsBought);
      return {
        id: p.id,
        product: p,
        unitsBought: p.bulk_size - unitsLeft,
        unitsLeft: unitsLeft,
        progress: ((p.bulk_size - unitsLeft) / p.bulk_size) * 100
      };
    });
  }

  isGroupActive(productId?: string): boolean {
    if (!productId) return false;
    return this.activeGroups.some(g => g.id === productId);
  }

  getGroupForProduct(productId?: string) {
    if (!productId) return null;
    return this.activeGroups.find(g => g.id === productId) || null;
  }

  async loadActiveNode(nodeId: string) {
    this.isLoadingNode = true;
    const { data: nodes, error } = await this.supabaseService.getNodos();
    this.isLoadingNode = false;

    if (!error && nodes) {
      this.activeNode = nodes.find(n => n.id === nodeId) || null;
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

  calculateSavings(price: number, retailPrice?: number): number {
    if (!retailPrice || retailPrice <= 0) return 0;
    return Math.round(((retailPrice - price) / retailPrice) * 100);
  }

  async joinGroupBuy(producto: Producto) {
    const group = this.getGroupForProduct(producto.id);
    const unitsLeftText = group ? `Faltan ${group.unitsLeft} unidades para cerrar el bulto.` : '';

    const alert = await this.alertController.create({
      header: 'Sumarse a Compra Colectiva',
      message: `¿Querés sumarte a la compra colectiva de "${producto.name}"?\nCada unidad cuesta ${producto.price} mayorista. ${unitsLeftText}`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sumarme',
          handler: () => {
            this.toastService.showSuccess(`¡Te sumaste a la compra de "${producto.name}"!`);
          }
        }
      ]
    });

    await alert.present();
  }

  async startGroupBuy(producto: Producto) {
    const alert = await this.alertController.create({
      header: 'Iniciar Grupo de Compra',
      message: `¿Querés iniciar un nuevo bulto mayorista para "${producto.name}"?\nSe requiere juntar ${producto.bulk_size} unidades totales entre los miembros de tu Punto de Retiro para concretar la compra.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Iniciar',
          handler: () => {
            this.toastService.showSuccess(`¡Iniciaste el grupo de compra para "${producto.name}"!`);
          }
        }
      ]
    });

    await alert.present();
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }
}
