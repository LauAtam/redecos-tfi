import { Component, Input, Output, EventEmitter } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonBackButton,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonBackButton,
    IonIcon
  ]
})
export class HeaderComponent {
  @Input() title: string = '';
  @Input() defaultHref: string | null = null;
  @Input() showCustomBack: boolean = false;
  @Input() showLogout: boolean = false;

  @Output() customBack = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  constructor() {
    addIcons({
      arrowBackOutline,
      logOutOutline
    });
  }

  onCustomBack() {
    this.customBack.emit();
  }

  onLogout() {
    this.logout.emit();
  }
}
