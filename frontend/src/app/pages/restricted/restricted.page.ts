import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonHeader
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
    IonIcon,
    IonHeader
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
