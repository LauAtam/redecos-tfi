import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  storefrontOutline,
  peopleOutline,
  cartOutline,
  swapHorizontalOutline
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
    IonText
  ],
  providers: [CurrencyPipe]
})
export class HomePage implements OnInit, OnDestroy {
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
      swapHorizontalOutline
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
    const alert = await this.alertController.create({
      header: 'Unirse a Compra Colectiva',
      message: `¿Querés sumarte a la compra colectiva de "${producto.name}"? Se agregará un bulto de ${producto.bulk_size} unidades a tu pedido.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sumarme',
          handler: () => {
            this.toastService.showSuccess(`Te sumaste a la compra de "${producto.name}"!`);
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
