import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon
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
    IonIcon
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
      this.router.navigateByUrl(this.defaultHref);
    }
  }

  onLogout() {
    this.logout.emit();
  }

  onAvatarClick() {
    this.router.navigateByUrl('/admin/perfil');
  }
}
