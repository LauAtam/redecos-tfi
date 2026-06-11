import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personOutline, swapHorizontalOutline, logOutOutline } from 'ionicons/icons';
import { Nodo } from '../../../core/models/auth.models';

@Component({
  selector: 'app-account-tab',
  templateUrl: './account-tab.component.html',
  styleUrls: ['./account-tab.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    IonButton,
    IonIcon
  ]
})
export class AccountTabComponent {
  @Input() activeNode: Nodo | null = null;
  @Input() userEmail: string = '';
  @Input() userName: string = '';

  @Output() logout = new EventEmitter<void>();

  constructor() {
    addIcons({
      personOutline,
      swapHorizontalOutline,
      logOutOutline
    });
  }

  onLogout() {
    this.logout.emit();
  }
}
