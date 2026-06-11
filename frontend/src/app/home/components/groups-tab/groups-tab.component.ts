import { Component, OnInit, OnChanges, SimpleChanges, Input } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { swapHorizontalOutline, cartOutline } from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { Nodo, Producto, BuyGroup } from '../../../core/models/auth.models';

@Component({
  selector: 'app-groups-tab',
  templateUrl: './groups-tab.component.html',
  styleUrls: ['./groups-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonButton,
    IonIcon,
    IonSpinner
  ],
  providers: [CurrencyPipe]
})
export class GroupsTabComponent implements OnInit, OnChanges {
  @Input() activeNode: Nodo | null = null;
  @Input() products: Producto[] = [];
  @Input() isLoadingProducts = false;
  @Input() isLoadingNode = false;

  activeGroups: BuyGroup[] = [];
  isLoadingGroups = false;

  constructor(
    private supabaseService: SupabaseService,
    private toastService: ToastService,
    private alertController: AlertController
  ) {
    addIcons({
      swapHorizontalOutline,
      cartOutline
    });
  }

  ngOnInit() {
    this.loadActiveGroups();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode']) {
      this.loadActiveGroups();
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

  getRemainingDaysText(createdAt: string): string {
    const createdDate = new Date(createdAt);
    const endDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days group lifetime
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Cierra pronto';
    if (diffDays === 1) return 'Cierra mañana';
    return `Cierra en ${diffDays} días`;
  }

  async joinGroupBuy(group: BuyGroup) {
    if (!this.activeNode || !this.activeNode.id) {
      this.toastService.showError('Debes seleccionar un punto de retiro.');
      return;
    }

    const alert = await this.alertController.create({
      header: 'Sumarse a Compra Colectiva',
      message: `¿Cuántas unidades de "${group.product?.name || 'Producto'}" querés comprar?\nPrecio: ${group.product?.price || 0} por unidad. Faltan ${group.unitsLeft} unidades para cerrar el bulto.`,
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
              productId: group.productId,
              quantity,
              nodeId: this.activeNode!.id!
            });

            if (error) {
              this.toastService.showError(error.message);
            } else {
              this.toastService.showSuccess(`¡Te sumaste con ${quantity} u. a la compra colectiva!`);
              this.loadActiveGroups();
            }
          }
        }
      ]
    });

    await alert.present();
  }
}
