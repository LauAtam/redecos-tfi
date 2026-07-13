import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonCard,
  IonIcon,
  IonSpinner,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  carOutline,
  cubeOutline,
  chevronForwardOutline,
  personOutline,
  refreshOutline,
  clipboardOutline,
  businessOutline,
  peopleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-nodo-dashboard',
  templateUrl: './nodo-dashboard.page.html',
  styleUrls: ['./nodo-dashboard.page.scss'],
  standalone: true,
  imports: [
    RouterModule,
    IonContent,
    IonCard,
    IonIcon,
    IonSpinner,
    IonItem,
    IonLabel,
    HeaderComponent,
  ],
})
export class NodoDashboardPage implements OnInit {
  nodeName = '';
  nodeAddress = '';
  managerName = '';

  processingOrderCount = 0;
  shippedCount = 0;
  readyForPickupCount = 0;

  isLoading = false;
  errorMessage: string | null = null;

  private appFacadeService = inject(AppFacadeService);
  private router = inject(Router);

  constructor() {
    addIcons({
      carOutline,
      cubeOutline,
      chevronForwardOutline,
      personOutline,
      refreshOutline,
      clipboardOutline,
      businessOutline,
      peopleOutline,
      alertCircleOutline,
    });
  }

  async ngOnInit() {
    await this.loadStats();
  }

  async loadStats() {
    const user = this.appFacadeService.currentUserValue;
    const defaultNodeId = user?.default_node_id;

    if (!defaultNodeId) {
      this.errorMessage = 'No tenés un nodo asignado en tu perfil.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { data, error } = await this.appFacadeService.getNodeDashboardStats(defaultNodeId);
    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message;
    } else if (data) {
      this.nodeName = data.node.name;
      this.nodeAddress = data.node.address;
      this.managerName = data.node.manager_name;

      this.processingOrderCount = data.stats.processingOrderCount;
      this.shippedCount = data.stats.shippedCount;
      this.readyForPickupCount = data.stats.readyForPickupCount;
    }
  }

  async logout() {
    await this.appFacadeService.logout();
  }

  navegarA(route: string) {
    this.router.navigate([route]);
  }
}
