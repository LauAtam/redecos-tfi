import { Component, OnInit, OnChanges, SimpleChanges, Input, inject, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { swapHorizontalOutline, chevronForwardOutline } from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { Nodo, Producto, BuyGroup } from '../../../core/models/auth.models';
import { ProductModalComponent } from '../../../core/components/product-modal/product-modal.component';

@Component({
  selector: 'app-groups-tab',
  templateUrl: './groups-tab.component.html',
  styleUrls: ['./groups-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    RouterModule,
    IonButton,
    IonIcon,
    IonSpinner,
    ProductModalComponent
  ],
  providers: [CurrencyPipe]
})
export class GroupsTabComponent implements OnInit, OnChanges {
  isProductModalOpen = signal<boolean>(false);
  selectedProduct = signal<Producto | null>(null);

  openProductModal(product: Producto) {
    this.selectedProduct.set(product);
    this.isProductModalOpen.set(true);
  }

  closeProductModal() {
    this.isProductModalOpen.set(false);
    this.selectedProduct.set(null);
  }

  getGroupForProduct(productId: string | undefined): BuyGroup | null {
    if (!productId) return null;
    return this.activeGroups.find(g => g.productId === productId) || null;
  }

  blurActiveElement() {
    (document.activeElement as HTMLElement)?.blur();
  }
  @Input() activeNode: Nodo | null = null;
  @Input() products: Producto[] = [];
  @Input() isLoadingProducts = false;
  @Input() isLoadingNode = false;

  private appFacadeService = inject(AppFacadeService);

  activeGroups: BuyGroup[] = [];
  isLoadingGroups = false;

  constructor() {
    addIcons({
      swapHorizontalOutline,
      chevronForwardOutline
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
    const { data, error } = await this.appFacadeService.getActiveBuyGroups(this.activeNode.id);
    this.isLoadingGroups = false;
    if (!error) {
      this.activeGroups = data || [];
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

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
}
