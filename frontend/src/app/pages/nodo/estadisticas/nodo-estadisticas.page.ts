import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
  IonCard,
  IonIcon,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  cashOutline,
  cubeOutline,
  statsChartOutline,
  pieChartOutline,
  trendingUpOutline,
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { Chart } from 'chart.js/auto';
import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-nodo-estadisticas',
  templateUrl: './nodo-estadisticas.page.html',
  styleUrls: ['./nodo-estadisticas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonCard,
    IonIcon,
    IonSpinner,
    CurrencyPipe,
    HeaderComponent,
  ],
})
export class NodoEstadisticasPage implements OnInit {
  @ViewChild('earningsCanvas') earningsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('logisticsCanvas') logisticsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topProductsCanvas') topProductsCanvas!: ElementRef<HTMLCanvasElement>;

  nodeName = '';
  nodeAddress = '';

  totalSales = 0;
  totalEarnings = 0;

  isLoading = false;
  errorMessage: string | null = null;

  private appFacadeService = inject(AppFacadeService);

  private earningsChart: Chart | undefined;
  private logisticsChart: Chart | undefined;
  private topProductsChart: Chart | undefined;

  constructor() {
    addIcons({
      arrowBackOutline,
      cashOutline,
      cubeOutline,
      statsChartOutline,
      pieChartOutline,
      trendingUpOutline,
    });
  }

  async ngOnInit() {
    await this.loadStats();
  }

  async loadStats() {
    const user = this.appFacadeService.currentUserValue;
    const defaultNodeId = user?.default_node_id;

    if (!defaultNodeId) {
      this.errorMessage = 'No tenés un nodo asignado en tu perfil.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { data, error } = await this.appFacadeService.getNodeDashboardStats(defaultNodeId);
    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message;
    } else if (data) {
      this.nodeName = data.node.name;
      this.nodeAddress = data.node.address;
      this.totalSales = data.stats.totalSales;
      this.totalEarnings = data.stats.totalEarnings;

      setTimeout(() => {
        this.createCharts(data.charts);
      }, 150);
    }
  }

  createCharts(chartsData: any) {
    if (!chartsData) return;

    // 1. Gráfico Financiero (Comisiones y Ventas)
    if (this.earningsCanvas && this.earningsCanvas.nativeElement) {
      try {
        if (this.earningsChart) this.earningsChart.destroy();
        this.earningsChart = new Chart(this.earningsCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: chartsData.earnings.labels,
            datasets: [
              {
                label: 'Mis Comisiones ($)',
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
        console.error('[NodoEstadisticas] Error al inicializar earningsChart:', e);
      }
    }

    // 2. Gráfico Logístico (Ocupación de stock del Nodo)
    if (this.logisticsCanvas && this.logisticsCanvas.nativeElement) {
      try {
        if (this.logisticsChart) this.logisticsChart.destroy();
        this.logisticsChart = new Chart(this.logisticsCanvas.nativeElement, {
          type: 'doughnut',
          data: {
            labels: chartsData.logistics.labels,
            datasets: [{
              data: chartsData.logistics.data,
              backgroundColor: ['#004b7c', '#b25e00', '#6b21a8', '#006b4d'],
              borderWidth: 1,
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'right',
                labels: { boxWidth: 10, font: { size: 9 } }
              }
            }
          }
        });
      } catch (e) {
        console.error('[NodoEstadisticas] Error al inicializar logisticsChart:', e);
      }
    }

    // 3. Gráfico Top Productos
    if (this.topProductsCanvas && this.topProductsCanvas.nativeElement) {
      try {
        if (this.topProductsChart) this.topProductsChart.destroy();
        this.topProductsChart = new Chart(this.topProductsCanvas.nativeElement, {
          type: 'bar',
          data: {
            labels: chartsData.topProducts.labels,
            datasets: [{
              label: 'Cantidad entregada',
              data: chartsData.topProducts.data,
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
        console.error('[NodoEstadisticas] Error al inicializar topProductsChart:', e);
      }
    }
  }
}
