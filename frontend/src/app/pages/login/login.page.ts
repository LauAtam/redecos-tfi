import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButton,
  IonText
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Login</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding ion-text-center">
      <ion-text>
        <h1>Próximamente</h1>
        <p>La vista de login está en desarrollo.</p>
      </ion-text>
      <ion-button expand="block" routerLink="/register">
        Ir a Registro
      </ion-button>
    </ion-content>
  `,
  styles: [],
  standalone: true,
  imports: [CommonModule, RouterModule, IonContent, IonHeader, IonTitle, IonToolbar, IonButton, IonText]
})
export class LoginPage {}
