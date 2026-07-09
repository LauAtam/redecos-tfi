import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  swapHorizontalOutline,
  logOutOutline,
  helpCircleOutline,
  chevronForwardOutline,
  trashOutline,
  addOutline,
  cardOutline,
  closeOutline,
  businessOutline
} from 'ionicons/icons';
import { Nodo, UserCard } from '../../../core/models/auth.models';
import { SupabaseService } from '../../../supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-account-tab',
  templateUrl: './account-tab.component.html',
  styleUrls: ['./account-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonSpinner
  ]
})
export class AccountTabComponent implements OnInit {
  @Input() activeNode: Nodo | null = null;
  @Input() userEmail: string = '';
  @Input() userName: string = '';

  private router = inject(Router);
  private supabaseService = inject(SupabaseService);
  private toastService = inject(ToastService);

  @Output() logout = new EventEmitter<void>();

  // State
  savedCards = signal<UserCard[]>([]);
  isLoadingCards = signal<boolean>(false);
  isAddCardModalOpen = false;
  isSavingCard = signal<boolean>(false);
  saveCardError = '';

  // Form Fields
  cardNumber = '';
  cardholderName = '';
  cardExpirationMonth = '';
  cardExpirationYear = '';
  securityCode = '';
  docType = 'DNI';
  docNumber = '';
  cardholderEmail = '';

  private mp: any;

  constructor() {
    addIcons({
      personOutline,
      swapHorizontalOutline,
      logOutOutline,
      helpCircleOutline,
      chevronForwardOutline,
      trashOutline,
      addOutline,
      cardOutline,
      closeOutline,
      businessOutline
    });
  }

  ngOnInit() {
    this.loadCards();
    this.cardholderEmail = this.userEmail;
    this.cardholderName = this.userName || 'Titular';
    this.getMercadoPagoInstance();
  }

  getMercadoPagoInstance() {
    if (!this.mp) {
      if ((window as any).MercadoPago) {
        try {
          this.mp = new (window as any).MercadoPago(environment.mercadoPagoPublicKey);
        } catch (err) {
          console.error('Error al inicializar SDK de Mercado Pago:', err);
        }
      }
    }
    return this.mp;
  }

  async loadCards() {
    this.isLoadingCards.set(true);
    const { data, error } = await this.supabaseService.listSavedCards();
    if (error) {
      console.error(error.message);
    } else if (data) {
      this.savedCards.set(data);
    }
    this.isLoadingCards.set(false);
  }

  openAddCardModal() {
    this.isAddCardModalOpen = true;
    this.cardNumber = '';
    this.cardExpirationMonth = '';
    this.cardExpirationYear = '';
    this.securityCode = '';
    this.docNumber = '';
    this.cardholderEmail = this.userEmail;
    this.cardholderName = this.userName || 'Titular';
    this.saveCardError = '';
  }

  closeAddCardModal() {
    this.isAddCardModalOpen = false;
  }

  onCardNumberInput(event: any) {
    const input = event.target.value.replace(/\D/g, '');
    const formatted = input.match(/.{1,4}/g)?.join(' ') || '';
    this.cardNumber = formatted;
  }

  async saveNewCard() {
    if (
      !this.cardholderName.trim() ||
      !this.cardNumber.replace(/\s/g, '').trim() ||
      !this.cardExpirationMonth.trim() ||
      !this.cardExpirationYear.trim() ||
      !this.securityCode.trim() ||
      !this.docNumber.trim() ||
      !this.cardholderEmail.trim()
    ) {
      this.saveCardError = 'Todos los campos son obligatorios.';
      return;
    }

    this.isSavingCard.set(true);
    this.saveCardError = '';

    let cardToken = '';

    try {
      const mpInstance = this.getMercadoPagoInstance();
      if (!mpInstance) {
        throw new Error('El SDK de Mercado Pago no está disponible. Volvé a intentar en unos segundos.');
      }

      const rawCardNumber = this.cardNumber.replace(/\s/g, '');

      // Crear token de tarjeta usando Mercado Pago SDK v2
      const tokenResponse = await mpInstance.createCardToken({
        cardNumber: rawCardNumber,
        cardholderName: this.cardholderName,
        cardExpirationMonth: this.cardExpirationMonth,
        cardExpirationYear: this.cardExpirationYear,
        securityCode: this.securityCode,
        identificationType: this.docType,
        identificationNumber: this.docNumber
      });

      if (!tokenResponse || !tokenResponse.id) {
        throw new Error('No se pudo generar el token de tarjeta.');
      }

      cardToken = tokenResponse.id;
    } catch (err: any) {
      console.error('Fallo tokenización real de MP:', err);
      this.isSavingCard.set(false);
      this.saveCardError = `Error de tokenización: ${err.message || 'Verifica los datos de la tarjeta.'}`;
      this.toastService.showError(this.saveCardError);
      return;
    }

    // Enviar el token al backend para asociarlo al cliente en MP y guardarlo localmente
    const { data, error } = await this.supabaseService.addSavedCard(cardToken);

    this.isSavingCard.set(false);

    if (error) {
      this.saveCardError = error.message;
      this.toastService.showError(error.message);
    } else {
      this.toastService.showSuccess('Tarjeta guardada exitosamente.');
      this.closeAddCardModal();
      this.loadCards();
    }
  }

  async deleteCard(cardId: string) {
    const { success, error } = await this.supabaseService.deleteSavedCard(cardId);
    if (error) {
      this.toastService.showError(error.message);
    } else if (success) {
      this.toastService.showSuccess('Tarjeta eliminada.');
      this.loadCards();
    }
  }

  goToMisCompras() {
    this.router.navigate(['/mis-compras']);
  }

  onLogout() {
    this.logout.emit();
  }
}
