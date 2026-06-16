import { Component, OnInit, OnChanges, SimpleChanges, Input, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
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
    CommonModule,
    RouterModule,
    IonButton,
    IonIcon,
    IonSpinner
  ],
  providers: [CurrencyPipe]
})
export class GroupsTabComponent implements OnInit, OnChanges {
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

  getRemainingDaysText(createdAt: string): string {
    const createdDate = new Date(createdAt);
    const endDate = new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days group lifetime
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Cierra pronto';
    if (diffDays === 1) return 'Cierra mañana';
    return `Cierra en ${diffDays} días`;
  }

  formatProductName(name: string | undefined): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }
}
