import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  logOutOutline,
  storefrontOutline,
  peopleOutline,
  cartOutline,
  swapHorizontalOutline,
  personOutline,
  helpCircleOutline,
  chevronForwardOutline,
  cubeOutline,
  businessOutline,
  searchOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { SupabaseService } from '../supabase.service';
import { Nodo } from '../core/models/auth.models';
import { HeaderComponent } from '../core/components/header/header.component';
import { CatalogTabComponent } from './components/catalog-tab/catalog-tab.component';
import { GroupsTabComponent } from './components/groups-tab/groups-tab.component';
import { AccountTabComponent } from './components/account-tab/account-tab.component';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HeaderComponent,
    CatalogTabComponent,
    GroupsTabComponent,
    AccountTabComponent,
    IonContent,
    IonIcon,
    IonFooter
  ],
  providers: [CurrencyPipe]
})
export class HomePage implements OnInit, OnDestroy {
  currentTab = signal<'groups' | 'products' | 'config'>('products');
  activeNode: Nodo | null = null;
  isLoadingNode = false;
  userName = '';
  userEmail = '';

  private userSub?: Subscription;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    addIcons({
      logOutOutline,
      storefrontOutline,
      peopleOutline,
      cartOutline,
      swapHorizontalOutline,
      personOutline,
      helpCircleOutline,
      chevronForwardOutline,
      cubeOutline,
      businessOutline,
      searchOutline
    });
  }

  ngOnInit() {
    this.isLoadingNode = true;
    this.userSub = this.supabaseService.currentUser$.subscribe(async (profile) => {
      if (profile) {
        this.userEmail = profile.email || '';
        this.userName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuario';
        if (profile.default_node_id) {
          await this.loadActiveNode(profile.default_node_id);
        } else {
          this.activeNode = null;
          this.isLoadingNode = false;
        }
      } else {
        this.activeNode = null;
        this.userEmail = '';
        this.userName = '';
        this.isLoadingNode = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
  }

  setTab(tab: 'groups' | 'products' | 'config') {
    this.currentTab.set(tab);
  }

  async loadActiveNode(nodeId: string) {
    this.isLoadingNode = true;
    const { data: nodes, error } = await this.supabaseService.getNodos();
    this.isLoadingNode = false;

    if (!error && nodes) {
      this.activeNode = nodes.find(n => n.id === nodeId) || null;
    }
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }
}
