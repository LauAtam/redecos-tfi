import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';

import { SupabaseService } from '../../supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonInput,
    IonItem,
    IonLabel,
    RouterLink,
    IonText,
    IonTitle,
    IonToolbar,
  ],
})
export class LoginPage {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Ingresa tu correo y contraseña.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { error } = await this.supabaseService.login(this.email, this.password);

    this.isLoading = false;

    if (error) {
      this.errorMessage = 'Credenciales inválidas. Intenta nuevamente.';
    } else {
      this.router.navigate(['/home']);
    }
  }
}
