import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import {
  IonContent,
  IonCard,
  IonIcon,
  IonSpinner,
  IonHeader
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  cubeOutline,
  chevronForwardOutline,
  personOutline,
  statsChartOutline,
  calendarOutline,
  peopleOutline,
  cashOutline,
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { HeaderComponent } from '../../../core/components/header/header.component';
import { Chart } from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    RouterModule,
    IonContent,
    IonCard,
    IonIcon,
    IonSpinner,
    HeaderComponent,
    CurrencyPipe,
    DecimalPipe,
    IonHeader
  ],
})
export class DashboardPage implements OnInit {
  @ViewChild('earningsCanvas') earningsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('nodeRankingCanvas') nodeRankingCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('consolidationSuccessCanvas') consolidationSuccessCanvas!: ElementRef<HTMLCanvasElement>;

  adminEmail: string = '';
  totalProductos: number = 0;
  totalNodos: number = 0;
  comisionesAcumuladas: number = 0;
  totalSales: number = 0;
  totalSavings: number = 0;
  isLoadingStats: boolean = false;

  activeGroups: any[] = [];
  upcomingDeliveries: any[] = [];

  private earningsChart: Chart | undefined;
  private nodeRankingChart: Chart | undefined;
  private consolidationSuccessChart: Chart | undefined;

  private appFacadeService = inject(AppFacadeService);

  constructor() {
    addIcons({
      businessOutline,
      cubeOutline,
      chevronForwardOutline,
      personOutline,
      statsChartOutline,
      calendarOutline,
      peopleOutline,
      cashOutline,
    });
  }

  ngOnInit() {
    const user = this.appFacadeService.currentUserValue;
    if (user) {
      this.adminEmail = user.email;
    }
    this.loadStats();
  }

  async loadStats() {
    this.isLoadingStats = true;
    try {
      const [statsRes, groupsRes] = await Promise.all([
        this.appFacadeService.getAdminDashboardStats(),
        this.appFacadeService.listBuyGroups()
      ]);

      if (statsRes.data) {
        const stats = statsRes.data;
        this.totalProductos = stats.totalProductos;
        this.totalNodos = stats.totalNodos;
        this.comisionesAcumuladas = stats.comisionesAcumuladas;
        this.totalSales = stats.totalSales;
        this.totalSavings = stats.totalSavings;

        // Renderizar gráficos con delay corto para asegurar que el DOM cargó
        setTimeout(() => {
          this.createCharts(stats.charts);
        }, 150);
      }

      if (groupsRes.data) {
        const allGroups = groupsRes.data;
        // Compras Colectivas Activas: OPEN o COMPLETED
        this.activeGroups = allGroups.filter((g: any) => g.status === 'OPEN' || g.status === 'COMPLETED');
        // Cronograma de Entregas: PROCESSING_ORDER, SHIPPED, READY_FOR_PICKUP
        this.upcomingDeliveries = allGroups.filter((g: any) => 
          g.status === 'PROCESSING_ORDER' || g.status === 'SHIPPED' || g.status === 'READY_FOR_PICKUP'
        );
      }
    } catch (e) {
      console.error('Error al cargar estadísticas en dashboard:', e);
    } finally {
      this.isLoadingStats = false;
    }
  }

  createCharts(chartsData: any) {
    if (!chartsData) return;

    // 1. Gráfico de Ganancias y Ventas Globales (Líneas + Barras)
    if (this.earningsCanvas && this.earningsCanvas.nativeElement && chartsData.earnings) {
      try {
        if (this.earningsChart) this.earningsChart.destroy();
        this.earningsChart = new Chart(this.earningsCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: chartsData.earnings.labels,
            datasets: [
              {
                label: 'Comisiones Globales ($)',
                data: chartsData.earnings.commissionData,
                backgroundColor: '#006b4d',
                borderRadius: 6,
              },
              {
                label: 'Ventas Totales ($)',
                data: chartsData.earnings.salesData,
                backgroundColor: '#002d4b',
                borderRadius: 6,
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: { boxWidth: 12, font: { size: 9, weight: 'bold' } }
              }
            },
            scales: {
              y: { beginAtZero: true, ticks: { font: { size: 9 } } },
              x: { ticks: { font: { size: 9 } } }
            }
          }
        });
      } catch (e) {
        console.error('[AdminDashboard] Error drawing earningsChart:', e);
      }
    }

    // 2. Gráfico de Ranking de Nodos (Barras Horizontales)
    if (this.nodeRankingCanvas && this.nodeRankingCanvas.nativeElement && chartsData.nodeRanking) {
      try {
        if (this.nodeRankingChart) this.nodeRankingChart.destroy();
        this.nodeRankingChart = new Chart(this.nodeRankingCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: chartsData.nodeRanking.labels,
            datasets: [{
              label: 'Ventas por Nodo ($)',
              data: chartsData.nodeRanking.data,
              backgroundColor: '#3b82f6',
              borderRadius: 4,
            }]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false }
            },
            scales: {
              x: { beginAtZero: true, ticks: { font: { size: 9 } } },
              y: { ticks: { font: { size: 8 } } }
            }
          }
        });
      } catch (e) {
        console.error('[AdminDashboard] Error drawing nodeRankingChart:', e);
      }
    }

    // 3. Gráfico de Tasa de Consolidación (Doughnut)
    if (this.consolidationSuccessCanvas && this.consolidationSuccessCanvas.nativeElement && chartsData.consolidationSuccess) {
      try {
        if (this.consolidationSuccessChart) this.consolidationSuccessChart.destroy();
        this.consolidationSuccessChart = new Chart(this.consolidationSuccessCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: chartsData.consolidationSuccess.labels,
            datasets: [{
              data: chartsData.consolidationSuccess.data,
              backgroundColor: ['#38bdf8', '#34d399', '#ef4444'],
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 10,
                  font: { size: 9 }
                }
              }
            }
          }
        });
      } catch (e) {
        console.error('[AdminDashboard] Error drawing consolidationSuccessChart:', e);
      }
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

  getDeliveryStatusText(status: string): string {
    switch (status) {
      case 'PROCESSING_ORDER': return 'En Mayorista';
      case 'SHIPPED': return 'En Camino';
      case 'READY_FOR_PICKUP': return 'En Nodo';
      default: return status;
    }
  }

  getDeliveryStatusClass(status: string): string {
    switch (status) {
      case 'PROCESSING_ORDER': return 'bg-indigo-50 text-indigo-700';
      case 'SHIPPED': return 'bg-amber-50 text-amber-700';
      case 'READY_FOR_PICKUP': return 'bg-emerald-50 text-emerald-700';
      default: return 'bg-slate-50 text-slate-700';
    }
  }
}
