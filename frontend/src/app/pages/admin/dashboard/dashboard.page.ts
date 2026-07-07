import { Component, OnInit, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonIcon,
  IonSpinner,
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
import { SupabaseService } from '../../../supabase.service';
import { HeaderComponent } from '../../../core/components/header/header.component';

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
  ],
})
export class DashboardPage implements OnInit {
  adminEmail: string = '';
  totalProductos: number = 0;
  totalNodos: number = 0;
  isLoadingStats: boolean = false;

  private supabaseService = inject(SupabaseService);

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
    const user = this.supabaseService.currentUserValue;
    if (user) {
      this.adminEmail = user.email;
    }
    this.loadStats();
  }

  async loadStats() {
    this.isLoadingStats = true;
    try {
      const [prodRes, nodRes] = await Promise.all([
        this.supabaseService.getProductos({ limit: 1 }),
        this.supabaseService.getNodos()
      ]);

      if (prodRes.data) {
        this.totalProductos = (prodRes.data as any).total !== undefined
          ? (prodRes.data as any).total
          : prodRes.data.length;
      }
      if (nodRes.data) {
        this.totalNodos = nodRes.data.length;
      }
    } catch (e) {
      console.error('Error al cargar estadísticas en dashboard:', e);
    } finally {
      this.isLoadingStats = false;
    }
  }
}
