import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';
import { IonBadge, IonIcon, IonButton } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { carOutline, cubeOutline, qrCodeOutline, peopleOutline } from 'ionicons/icons';
import { BuyGroup } from '../../models/auth.models';

export interface BultoAction {
  type: string;
  label: string;
  icon?: string;
  colorClass: string; // Ej: '[--background:#006b4d] [--color:#ffffff]'
  fill?: 'clear' | 'solid' | 'outline';
}

@Component({
  selector: 'app-bulto-card',
  templateUrl: './bulto-card.component.html',
  standalone: true,
  imports: [NgClass, IonBadge, IonIcon, IonButton]
})
export class BultoCardComponent {
  @Input({ required: true }) group!: BuyGroup;
  @Input() actions: BultoAction[] = [];
  @Output() actionClicked = new EventEmitter<{ type: string; group: BuyGroup }>();

  constructor() {
    addIcons({
      carOutline,
      cubeOutline,
      qrCodeOutline,
      peopleOutline
    });
  }

  onActionClick(type: string, event: Event) {
    event.stopPropagation();
    this.actionClicked.emit({ type, group: this.group });
  }

  onCardClick() {
    this.actionClicked.emit({ type: 'view_detail', group: this.group });
  }
}
