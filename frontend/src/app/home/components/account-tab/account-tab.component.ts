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
  businessOutline,
  clipboardOutline
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

  // Exponer el rol del usuario desde el servicio
  userRole = this.supabaseService.userRole;

  // State
  savedCards = signal<UserCard[]>([]);
  isLoadingCards = signal<boolean>(false);
  isAddCardModalOpen = false;
  isSavingCard = signal<boolean>(false);
  saveCardError = '';

  // Form Fields
  cardNumber = '';
  cardholderName = '';
  cardExpiration = '';
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
      businessOutline,
      clipboardOutline
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
    this.cardExpiration = '';
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
    event.target.value = formatted;
    this.cardNumber = formatted;
  }

  onCardExpirationInput(event: any) {
    let input = event.target.value.replace(/\D/g, '');
    if (input.length > 2) {
      input = input.substring(0, 2) + '/' + input.substring(2, 4);
    }
    event.target.value = input;
    this.cardExpiration = input;
  }

  onCvvInput(event: any) {
    const val = event.target.value.replace(/\D/g, '');
    event.target.value = val;
    this.securityCode = val;
  }

  onDocNumberInput(event: any) {
    const val = event.target.value.replace(/\D/g, '');
    event.target.value = val;
    this.docNumber = val;
  }

  async saveNewCard() {
    // 1. Validaciones básicas de presencia
    if (
      !this.cardholderName.trim() ||
      !this.cardNumber.replace(/\s/g, '').trim() ||
      !this.cardExpiration.trim() ||
      !this.securityCode.trim() ||
      !this.docNumber.trim() ||
      !this.cardholderEmail.trim()
    ) {
      this.saveCardError = 'Todos los campos son obligatorios.';
      return;
    }

    const rawCardNumber = this.cardNumber.replace(/\s/g, '');
    const expParts = this.cardExpiration.split('/');

    // 2. Validar formato de número de tarjeta
    if (!/^\d{15,16}$/.test(rawCardNumber)) {
      this.saveCardError = 'El número de tarjeta debe tener 15 o 16 dígitos.';
      return;
    }

    // 3. Validar formato y valores de fecha de vencimiento
    if (expParts.length !== 2 || !/^\d{2}$/.test(expParts[0]) || !/^\d{2}$/.test(expParts[1])) {
      this.saveCardError = 'La fecha de vencimiento debe estar en formato MM/AA (ej: 08/30).';
      return;
    }

    const expMonth = parseInt(expParts[0], 10);
    const expYear = parseInt('20' + expParts[1], 10);

    if (expMonth < 1 || expMonth > 12) {
      this.saveCardError = 'El mes de vencimiento debe estar entre 01 y 12.';
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
      this.saveCardError = 'La tarjeta ingresada está vencida.';
      return;
    }

    // 4. Validar CVV
    if (!/^\d{3,4}$/.test(this.securityCode.trim())) {
      this.saveCardError = 'El código de seguridad (CVV) debe tener 3 o 4 dígitos.';
      return;
    }

    // 5. Validar número de documento
    if (!/^\d{6,10}$/.test(this.docNumber.trim())) {
      this.saveCardError = 'El número de documento debe tener entre 6 y 10 dígitos numéricos.';
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

      // Crear token de tarjeta usando Mercado Pago SDK v2
      const tokenResponse = await mpInstance.createCardToken({
        cardNumber: rawCardNumber,
        cardholderName: this.cardholderName,
        cardExpirationMonth: expParts[0],
        cardExpirationYear: expParts[1],
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
      this.saveCardError = 'No se pudo registrar la tarjeta. Verificá los datos ingresados.';
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

  goToConsolidacion() {
    this.router.navigate(['/consolidacion']);
  }

  onLogout() {
    this.logout.emit();
  }
}
