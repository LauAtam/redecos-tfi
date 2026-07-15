import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  lockClosed,
  storefrontOutline,
  personOutline
} from 'ionicons/icons';
import { HeaderComponent } from '../../core/components/header/header.component';

@Component({
  selector: 'app-restricted',
  templateUrl: './restricted.page.html',
  styleUrls: ['./restricted.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    IonContent,
    IonButton,
    IonIcon
  ]
})
export class RestrictedPage {
  constructor() {
    addIcons({
      lockClosed,
      storefrontOutline,
      personOutline
    });
  }
}
