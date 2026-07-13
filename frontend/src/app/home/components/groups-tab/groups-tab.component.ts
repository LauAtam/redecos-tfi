import { Component, OnInit, OnChanges, SimpleChanges, Input, inject } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { swapHorizontalOutline, chevronForwardOutline } from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { Nodo, Producto, BuyGroup } from '../../../core/models/auth.models';

@Component({
  selector: 'app-groups-tab',
  templateUrl: './groups-tab.component.html',
  styleUrls: ['./groups-tab.component.scss'],
  standalone: true,
  imports: [
    CurrencyPipe,
    RouterModule,
    IonButton,
    IonIcon,
    IonSpinner
  ],
  providers: [CurrencyPipe]
})
export class GroupsTabComponent implements OnInit, OnChanges {
  blurActiveElement() {
    (document.activeElement as HTMLElement)?.blur();
  }
  @Input() activeNode: Nodo | null = null;
  @Input() products: Producto[] = [];
  @Input() isLoadingProducts = false;
  @Input() isLoadingNode = false;

  private supabaseService = inject(SupabaseService);

  activeGroups: BuyGroup[] = [];
  isLoadingGroups = false;

  constructor() {
    addIcons({
      swapHorizontalOutline,
      chevronForwardOutline
    });
  }

  ngOnInit() {
    this.loadActiveGroups();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['activeNode']) {
      this.loadActiveGroups();
    }
  }

  async loadActiveGroups() {
    if (!this.activeNode || !this.activeNode.id) {
      this.activeGroups = [];
      return;
    }
    this.isLoadingGroups = true;
    const { data, error } = await this.supabaseService.getActiveBuyGroups(this.activeNode.id);
    this.isLoadingGroups = false;
    if (!error) {
      this.activeGroups = data || [];
    }
  }

  getRemainingTimeText(createdAt: string): string {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(23, 59, 59, 999);
    const diffMs = midnight.getTime() - now.getTime();

    if (diffMs <= 0) return 'Cierra ahora';

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `Cierra en ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} Hs`;
  }

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
}
