import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton,
  IonButton,
  IonIcon,
  IonText,
  IonFooter,
  IonTabBar,
  IonTabButton,
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  menuOutline, 
  cartOutline, 
  lockClosed,
  storefrontOutline,
  peopleOutline,
  personOutline,
  helpCircleOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-restricted',
  templateUrl: './restricted.page.html',
  styleUrls: ['./restricted.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton,
    IonButton,
    IonIcon,
    IonFooter,
    IonTabBar,
    IonTabButton,
    IonLabel
  ]
})
export class RestrictedPage implements OnInit {

  constructor() {
    addIcons({ 
      menuOutline, 
      cartOutline, 
      lockClosed,
      storefrontOutline,
      peopleOutline,
      personOutline,
      helpCircleOutline
    });
  }

  ngOnInit() {}

}
