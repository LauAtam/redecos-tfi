import { Component, Input, Output, EventEmitter, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IonButton, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent, IonSpinner, NavController, IonCard } from '@ionic/angular/standalone';
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
  clipboardOutline,
  statsChartOutline,
  walletOutline
} from 'ionicons/icons';
import { Nodo, UserCard } from '../../../core/models/auth.models';
import { AppFacadeService } from '../../../app-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';
import { AddCardFormComponent } from '../../../core/components/add-card-form/add-card-form.component';
import { Chart } from 'chart.js/auto';

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
    IonCard,
    AddCardFormComponent
  ]
})
export class AccountTabComponent implements OnInit {
  @Input() activeNode: Nodo | null = null;
  @Input() userEmail: string = '';
  @Input() userName: string = '';

  @ViewChild('savingsCanvas') savingsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoriesCanvas') categoriesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('ordersStatusCanvas') ordersStatusCanvas!: ElementRef<HTMLCanvasElement>;

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
  isStatsModalOpen = false;

  totalSavings = signal<number>(0);
  isLoadingSavings = signal<boolean>(false);
  savingsStatsData: any = null;

  private savingsChart: Chart | undefined;
  private categoriesChart: Chart | undefined;
  private ordersStatusChart: Chart | undefined;

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
      clipboardOutline,
      statsChartOutline,
      walletOutline
    });
  }

  ngOnInit() {
    this.loadCards();
    this.loadSavingsStats();
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

  async loadSavingsStats() {
    this.isLoadingSavings.set(true);
    const { data, error } = await this.appFacadeService.getClientSavingsStats();
    this.isLoadingSavings.set(false);

    if (error) {
      console.error(error.message);
    } else if (data) {
      this.totalSavings.set(data.totalSavings);
      this.savingsStatsData = data;
    }
  }

  openStatsModal() {
    this.isStatsModalOpen = true;
    setTimeout(() => {
      this.renderAllStatsCharts();
    }, 200);
  }

  closeStatsModal() {
    this.isStatsModalOpen = false;
  }

  renderAllStatsCharts() {
    if (!this.savingsStatsData || !this.savingsStatsData.charts) {
      console.warn('[AccountTab] No stats data to render charts.');
      return;
    }

    // 1. Gráfico de Ahorro Colectivo (Líneas)
    const savingsData = this.savingsStatsData.charts.savings;
    if (this.savingsCanvas && this.savingsCanvas.nativeElement && savingsData) {
      try {
        if (this.savingsChart) this.savingsChart.destroy();
        this.savingsChart = new Chart(this.savingsCanvas.nativeElement, {
          type: 'line',
          data: {
            labels: savingsData.labels,
            datasets: [{
              label: 'Mi Ahorro Acumulado ($)',
              data: savingsData.data,
              borderColor: '#006b4d',
              backgroundColor: 'rgba(0, 107, 77, 0.05)',
              fill: true,
              tension: 0.3,
              borderWidth: 2,
              pointRadius: 3,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true, ticks: { font: { size: 9 } } },
              x: { ticks: { font: { size: 9 } } }
            }
          }
        });
      } catch (e) {
        console.error('[AccountTab] Error drawing savingsChart:', e);
      }
    }

    // 2. Gráfico de Consumo por Categorías (Doughnut)
    const categoriesData = this.savingsStatsData.charts.categories;
    if (this.categoriesCanvas && this.categoriesCanvas.nativeElement && categoriesData) {
      try {
        if (this.categoriesChart) this.categoriesChart.destroy();
        this.categoriesChart = new Chart(this.categoriesCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: categoriesData.labels,
            datasets: [{
              data: categoriesData.data,
              backgroundColor: ['#006b4d', '#002d4b', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6'],
              borderWidth: 1,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { boxWidth: 10, font: { size: 9 } }
              }
            }
          }
        });
      } catch (e) {
        console.error('[AccountTab] Error drawing categoriesChart:', e);
      }
    }

    // 3. Gráfico de Estados de Órdenes (Pie)
    const ordersStatusData = this.savingsStatsData.charts.ordersStatus;
    if (this.ordersStatusCanvas && this.ordersStatusCanvas.nativeElement && ordersStatusData) {
      try {
        if (this.ordersStatusChart) this.ordersStatusChart.destroy();
        this.ordersStatusChart = new Chart(this.ordersStatusCanvas.nativeElement, {
          type: 'pie',
          data: {
            labels: ordersStatusData.labels,
            datasets: [{
              data: ordersStatusData.data,
              backgroundColor: ['#f59e0b', '#3b82f6', '#006b4d', '#ef4444'],
              borderWidth: 1,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { boxWidth: 10, font: { size: 9 } }
              }
            }
          }
        });
      } catch (e) {
        console.error('[AccountTab] Error drawing ordersStatusChart:', e);
      }
    }
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
