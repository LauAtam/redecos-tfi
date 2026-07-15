import { Component, Input, Output, EventEmitter, inject, signal, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonSpinner,
  IonPopover
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, peopleOutline, helpCircleOutline, removeOutline, addOutline, cardOutline } from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { Nodo, Producto, BuyGroup, UserCard } from '../../../core/models/auth.models';
import { environment } from '../../../../environments/environment';
import { AddCardFormComponent } from '../add-card-form/add-card-form.component';

@Component({
  selector: 'app-product-modal',
  templateUrl: './product-modal.component.html',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CurrencyPipe,
    IonButton,
    IonIcon,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonSpinner,
    IonPopover,
    AddCardFormComponent
  ],
  providers: [CurrencyPipe]
})
export class ProductModalComponent implements OnChanges {
  private appFacadeService = inject(AppFacadeService);
  private toastService = inject(ToastService);

  @Input() isOpen = false;
  @Input() product: Producto | null = null;
  @Input() nodeId: string | null | undefined = null;

  @Output() closed = new EventEmitter<void>();
  @Output() purchaseSuccess = new EventEmitter<void>();

  // State
  activeGroup = signal<BuyGroup | null>(null);

  @Input('activeGroup') set activeGroupInput(value: BuyGroup | null | undefined) {
    this.activeGroup.set(value || null);
  }

  buyQuantity = signal<number>(1);
  cvv = signal<string>('');
  paymentError = '';
  isProcessingPayment = signal<boolean>(false);

  // Cards
  savedCards = signal<UserCard[]>([]);
  selectedCard = signal<UserCard | null>(null);
  useSavedCard = signal<boolean>(false);
  isAddCardModalOpen = signal<boolean>(false);

  constructor() {
    addIcons({
      closeOutline,
      peopleOutline,
      helpCircleOutline,
      removeOutline,
      addOutline,
      cardOutline
    });
  }

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen'] || changes['product'] || changes['nodeId']) {
      if (this.isOpen && this.product) {
        await this.initializeModal();
      }
    }
  }

  async initializeModal() {
    this.buyQuantity.set(1);
    this.cvv.set('');
    this.paymentError = '';

    // Cargar tarjetas guardadas
    await this.loadSavedCards();
  }

  async loadSavedCards() {
    try {
      const { data } = await this.appFacadeService.listSavedCards();
      if (data && data.length > 0) {
        this.savedCards.set(data);
        this.selectedCard.set(data[0]);
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
    this.closed.emit();
  }

  maxQuantity(): number {
    const group = this.activeGroup();
    if (group) {
      return group.unitsLeft || 1;
    }
    return this.product?.bulk_size || 1;
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
    if (!this.product || !this.product.id || !this.nodeId) return;

    if (this.useSavedCard() && !this.selectedCard()) {
      this.paymentError = 'Seleccioná una tarjeta guardada para continuar.';
      return;
    }

    if (this.useSavedCard() && !this.cvv().trim()) {
      this.paymentError = 'Ingresá el código de seguridad (CVV).';
      return;
    }

    this.isProcessingPayment.set(true);
    this.paymentError = '';

    let paymentToken = '';
    let paymentMethodId = '';

    try {
      if (this.useSavedCard()) {
        const savedCard = this.selectedCard();
        if (!savedCard) {
          throw new Error('No seleccionaste ninguna tarjeta guardada.');
        }

        const mpInstance = (window as any).MercadoPago
          ? new (window as any).MercadoPago(environment.mercadoPagoPublicKey)
          : null;

        if (!mpInstance) {
          throw new Error('El SDK de Mercado Pago no está disponible. Volvé a intentar en unos segundos.');
        }

        const cvvVal = this.cvv().trim();
        if (!/^\d{3,4}$/.test(cvvVal)) {
          throw new Error('El código de seguridad (CVV) debe tener 3 o 4 dígitos.');
        }

        paymentMethodId = savedCard.brand.toLowerCase();

        console.log('Tokenizando tarjeta guardada ID:', savedCard.card_id);
        const tokenResponse = await mpInstance.createCardToken({
          cardId: savedCard.card_id,
          securityCode: cvvVal
        });

        if (!tokenResponse || !tokenResponse.id) {
          throw new Error('No se pudo generar el token para la tarjeta guardada.');
        }

        paymentToken = tokenResponse.id;
      } else {
        paymentMethodId = 'cash';
      }
    } catch (err: any) {
      console.error('Fallo tokenización de tarjeta:', err);
      this.isProcessingPayment.set(false);
      this.paymentError = err.message;
      this.toastService.showError(err.message);
      return;
    }

    const payload = {
      productId: this.product.id,
      quantity: this.buyQuantity(),
      nodeId: this.nodeId,
      paymentToken,
      paymentMethodId,
      cardholderEmail: this.appFacadeService.currentUserValue?.email || '',
    };

    const { data, error } = await this.appFacadeService.joinOrCreateBuyGroup(payload);
    this.isProcessingPayment.set(false);

    if (error) {
      console.error('Error al procesar pago/reserva:', error);
      this.paymentError = error.message;
      this.toastService.showError(error.message);
    } else if (data) {
      this.toastService.showSuccess('¡Reserva confirmada exitosamente!');
      this.purchaseSuccess.emit();
      this.closeDetailModal();
    }
  }

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
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

  formatCardOptionText(card: UserCard): string {
    return `${card.brand.toUpperCase()} terminado en ${card.last_four} (vence ${card.expiration_mo}/${card.expiration_yr})`;
  }

  openAddCardModal() {
    this.isAddCardModalOpen.set(true);
  }

  closeAddCardModal() {
    this.isAddCardModalOpen.set(false);
  }

  async onCardSaved(newCard: any) {
    this.closeAddCardModal();
    await this.loadSavedCards();
    if (newCard) {
      const matched = this.savedCards().find(c => c.last_four === newCard.last_four) || this.savedCards()[this.savedCards().length - 1];
      if (matched) {
        this.selectedCard.set(matched);
        this.useSavedCard.set(true);
      }
    }
  }
}
