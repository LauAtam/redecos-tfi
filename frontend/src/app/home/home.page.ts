import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import {
  IonContent,
  IonIcon,
  IonFooter
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  storefrontOutline,
  peopleOutline,
  personOutline
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { AppFacadeService } from '../app-facade.service';
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
  ]
})
export class HomePage implements OnInit, OnDestroy {
  currentTab = signal<'groups' | 'products' | 'config'>('products');
  activeNode: Nodo | null = null;
  isLoadingNode = false;
  userName = '';
  userEmail = '';

  private appFacadeService = inject(AppFacadeService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private userSub?: Subscription;
  private routeSub?: Subscription;

  constructor() {
    addIcons({
      storefrontOutline,
      peopleOutline,
      personOutline
    });
  }

  ngOnInit() {
    this.isLoadingNode = true;
    this.userSub = this.appFacadeService.currentUser$.subscribe(async (profile) => {
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

    this.routeSub = this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'groups' || tab === 'products' || tab === 'config') {
        this.currentTab.set(tab);
      }
    });
  }

  ngOnDestroy() {
    if (this.userSub) {
      this.userSub.unsubscribe();
    }
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

  setTab(tab: 'groups' | 'products' | 'config') {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab },
      queryParamsHandling: 'merge'
    });
  }

  async loadActiveNode(nodeId: string) {
    this.isLoadingNode = true;
    const { data: nodes, error } = await this.appFacadeService.getNodos();
    this.isLoadingNode = false;

    if (!error && nodes) {
      this.activeNode = nodes.find(n => n.id === nodeId) || null;
    }
  }

  async logout() {
    await this.appFacadeService.logout();
    this.router.navigate(['/login']);
  }
}
