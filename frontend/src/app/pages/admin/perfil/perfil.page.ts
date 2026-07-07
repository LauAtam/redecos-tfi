import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  shieldCheckmarkOutline,
  logOutOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-perfil',
  templateUrl: './perfil.page.html',
  styleUrls: ['./perfil.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    IonButton,
    HeaderComponent
  ],
})
export class PerfilPage implements OnInit {
  adminEmail: string = '';
  adminName: string = 'Administrador';
  adminRole: string = 'ADMIN';

  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  constructor() {
    addIcons({
      personOutline,
      mailOutline,
      shieldCheckmarkOutline,
      logOutOutline,
    });
  }

  ngOnInit() {
    const user = this.supabaseService.currentUserValue;
    if (user) {
      this.adminEmail = user.email;
      this.adminName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Gestor de Red';
      this.adminRole = user.role || 'ADMIN';
    }
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }
}
