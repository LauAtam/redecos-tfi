import { Component, Input, Output, EventEmitter, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonSpinner, NavController } from '@ionic/angular/standalone';
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
import { AppFacadeService } from '../../../app-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { AddCardFormComponent } from '../../../core/components/add-card-form/add-card-form.component';

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
    IonSpinner,
    AddCardFormComponent
  ]
})
export class AccountTabComponent implements OnInit {
  @Input() activeNode: Nodo | null = null;
  @Input() userEmail: string = '';
  @Input() userName: string = '';

  private navCtrl = inject(NavController);
  private appFacadeService = inject(AppFacadeService);
  private toastService = inject(ToastService);

  @Output() logout = new EventEmitter<void>();

  // Exponer el rol del usuario desde el servicio
  userRole = this.appFacadeService.userRole;

  // State
  savedCards = signal<UserCard[]>([]);
  isLoadingCards = signal<boolean>(false);
  isAddCardModalOpen = false;

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
  }

  async loadCards() {
    this.isLoadingCards.set(true);
    const { data, error } = await this.appFacadeService.listSavedCards();
    if (error) {
      console.error(error.message);
    } else if (data) {
      this.savedCards.set(data);
    }
    this.isLoadingCards.set(false);
  }

  openAddCardModal() {
    this.isAddCardModalOpen = true;
  }

  closeAddCardModal() {
    this.isAddCardModalOpen = false;
  }

  onCardSaved(newCard: any) {
    this.closeAddCardModal();
    this.loadCards();
  }

  async deleteCard(cardId: string) {
    const { success, error } = await this.appFacadeService.deleteSavedCard(cardId);
    if (error) {
      this.toastService.showError(error.message);
    } else if (success) {
      this.toastService.showSuccess('Tarjeta eliminada.');
      this.loadCards();
    }
  }

  goToMisCompras() {
    this.navCtrl.navigateForward('/cliente/mis-compras');
  }

  goToConsolidacion() {
    const role = this.userRole();
    if (role === 'ADMIN') {
      this.navCtrl.navigateForward('/admin/logistica');
    } else if (role === 'NODO') {
      this.navCtrl.navigateForward('/nodo/logistica');
    }
  }

  onLogout() {
    this.logout.emit();
  }
}
