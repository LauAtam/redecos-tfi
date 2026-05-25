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
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
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
export class RegisterPage {
  email = '';
  password = '';
  firstName = '';
  lastName = '';
  errorMessage = '';
  isLoading = false;

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async onRegister() {
    if (!this.email || !this.password || !this.firstName || !this.lastName) {
      this.errorMessage = 'Por favor, completa todos los campos.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { error } = await this.supabaseService.register(
      this.email,
      this.password,
      this.firstName,
      this.lastName,
    );

    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message.includes('already registered')
        ? 'Este correo ya se encuentra registrado.'
        : error.message;
    } else {
      alert('Registro exitoso. Serás redirigido al login.');
      this.router.navigate(['/login']);
    }
  }
}
