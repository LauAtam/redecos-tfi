import { Component, OnInit } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, businessOutline, cubeOutline } from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: true,
  imports: [
    RouterModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonCard,
  ],
})
export class DashboardPage implements OnInit {
  adminEmail: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
  ) {
    addIcons({ logOutOutline, businessOutline, cubeOutline });
  }

  ngOnInit() {
    const user = this.supabaseService.currentUserValue;
    if (user) {
      this.adminEmail = user.email;
    }
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }
}
