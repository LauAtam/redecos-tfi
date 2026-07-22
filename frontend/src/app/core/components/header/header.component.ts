import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonBackButton,
  NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, logOutOutline, personOutline } from 'ionicons/icons';

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
    IonIcon,
    IonBackButton
  ]
})
export class HeaderComponent {
  @Input() title: string = '';
  @Input() defaultHref: string | null = null;
  @Input() showCustomBack: boolean = false;
  @Input() showLogout: boolean = false;
  @Input() showAdminAvatar: boolean = false;

  @Output() customBack = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  private router = inject(Router);
  private navCtrl = inject(NavController);

  constructor() {
    addIcons({
      arrowBackOutline,
      logOutOutline,
      personOutline
    });
  }

  onBackClick() {
    if (this.showCustomBack) {
      this.customBack.emit();
    } else if (this.defaultHref) {
      this.navCtrl.navigateBack(this.defaultHref);
    }
  }

  onLogout() {
    this.logout.emit();
  }

  onAvatarClick() {
    this.navCtrl.navigateForward('/admin/perfil');
  }
}
