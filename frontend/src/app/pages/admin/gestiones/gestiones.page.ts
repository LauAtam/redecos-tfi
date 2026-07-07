import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { businessOutline, cubeOutline, chevronForwardOutline } from 'ionicons/icons';
import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-gestiones',
  templateUrl: './gestiones.page.html',
  styleUrls: ['./gestiones.page.scss'],
  standalone: true,
  imports: [
    IonContent,
    IonCard,
    IonIcon,
    IonItem,
    IonLabel,
    HeaderComponent,
  ],
})
export class GestionesPage {
  private router = inject(Router);

  constructor() {
    addIcons({ businessOutline, cubeOutline, chevronForwardOutline });
  }

  navegarA(ruta: string) {
    this.router.navigate([ruta]);
  }
}
