import { Component, inject } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import {
  IonContent,
  IonCard,
  IonIcon,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { businessOutline, cubeOutline, chevronForwardOutline, clipboardOutline } from 'ionicons/icons';
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
  private navCtrl = inject(NavController);

  constructor() {
    addIcons({ businessOutline, cubeOutline, chevronForwardOutline, clipboardOutline });
  }

  navegarA(ruta: string) {
    this.navCtrl.navigateForward(ruta);
  }
}
