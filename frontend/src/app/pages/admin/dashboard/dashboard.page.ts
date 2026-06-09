import { Component, OnInit } from '@angular/core';

import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { businessOutline, cubeOutline, chevronForwardOutline } from 'ionicons/icons';
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
    IonItem,
    IonLabel,
    HeaderComponent
  ],
})
export class DashboardPage implements OnInit {
  adminEmail: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private router: Router,
  ) {
    addIcons({ businessOutline, cubeOutline, chevronForwardOutline });
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
