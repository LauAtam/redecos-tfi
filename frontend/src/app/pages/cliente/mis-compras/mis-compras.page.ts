import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonCard,
  IonCardContent,
  IonSpinner,
  IonText,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cardOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  timeOutline,
  cubeOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { GroupOrder } from '../../../core/models/auth.models';
import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-mis-compras',
  templateUrl: './mis-compras.page.html',
  styleUrls: ['./mis-compras.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    IonContent,
    IonButton,
    IonCard,
    IonCardContent,
    IonSpinner,
    IonText,
    IonIcon,
  ],
  providers: [CurrencyPipe],
})
export class MisComprasPage implements OnInit {
  orders: GroupOrder[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  private supabaseService = inject(SupabaseService);

  constructor() {
    addIcons({
      cardOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      timeOutline,
      cubeOutline,
      arrowBackOutline
    });
  }

  ngOnInit() {
    this.loadOrders();
  }

  async loadOrders() {
    this.isLoading = true;
    this.errorMessage = null;

    const { data, error } = await this.supabaseService.getMyOrders();
    this.isLoading = false;

    if (error) {
      this.errorMessage = (error as any).message || 'Error al cargar tus compras.';
    } else {
      this.orders = data || [];
    }
  }

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PAYMENT_HELD':
        return 'Pago Retenido';
      case 'CONFIRMED':
        return 'Confirmada';
      case 'CANCELLED':
        return 'Cancelada';
      case 'PENDING':
        return 'Pendiente';
      default:
        return status;
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'PAYMENT_HELD':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CONFIRMED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'PENDING':
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  }
}
