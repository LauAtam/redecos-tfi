import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import {
  ReactiveFormsModule
} from '@angular/forms';
import {
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButtons, 
  IonBackButton,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  locationOutline,
  personOutline,
  addOutline,
  closeOutline,
  eyeOutline,
  arrowBackOutline
} from 'ionicons/icons';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as L from 'leaflet';
import { SupabaseService } from '../../../supabase.service';
import { Nodo } from '../../../core/models/auth.models';
import { ToastService } from '../../../core/services/toast.service';
import { NodoDetailModalComponent } from './components/nodo-detail-modal/nodo-detail-modal.component';
import { NodoFormComponent } from './components/nodo-form/nodo-form.component';

const customMarkerIcon = L.divIcon({
  html: `
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.16 0 0 7.16 0 16C0 28 16 42 16 42C16 42 32 28 32 16C32 7.16 24.84 0 16 0ZM16 22C12.68 22 10 19.32 10 16C10 12.68 12.68 10 16 10C19.32 10 22 12.68 22 16C22 19.32 19.32 22 16 22Z" fill="#006b4d"/>
      <circle cx="16" cy="16" r="6" fill="#ffffff"/>
    </svg>
  `,
  className: 'custom-leaflet-marker',
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42]
});

@Component({
  selector: 'app-nodos',
  templateUrl: './nodos.page.html',
  styleUrls: ['./nodos.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent, 
    IonHeader, 
    IonTitle, 
    IonToolbar, 
    IonButtons, 
    IonBackButton,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    NodoDetailModalComponent,
    NodoFormComponent
  ],
})
export class NodosPage implements OnInit, OnDestroy {
  @ViewChild('nodoFormRef') nodoFormRef?: NodoFormComponent;

  isLoading = false;
  isSaving = false;
  showForm = false;
  errorMessage: string | null = null;
  nodos: Nodo[] = [];

  listMap?: L.Map;
  listMarkers: L.Marker[] = [];
  userLatitude: number | null = null;
  userLongitude: number | null = null;

  selectedNodo: Nodo | null = null;

  @ViewChild('listMapContainerRef') set listMapContainerRef(content: ElementRef) {
    if (content) {
      if (!this.listMap) {
        this.initListMap(content.nativeElement);
      }
    } else {
      this.cleanupListMap();
    }
  }

  constructor(
    private supabaseService: SupabaseService,
    private toastService: ToastService,
  ) {
    addIcons({
      businessOutline,
      locationOutline,
      personOutline,
      addOutline,
      closeOutline,
      eyeOutline,
      arrowBackOutline
    });
  }

  ngOnInit() {
    this.loadNodos();
  }

  ngOnDestroy() {
    try {
      this.cleanupListMap();
    } catch (e) {
      console.error('Error during cleanupListMap on destroy:', e);
    }
  }

  toggleForm(show: boolean) {
    this.showForm = show;
    if (!show) {
      this.errorMessage = null;
    }
  }

  selectNodeForMap(nodo: Nodo) {
    this.toggleForm(true);

    setTimeout(() => {
      const lat = nodo.latitude ?? -31.4201;
      const lng = nodo.longitude ?? -64.1888;
      if (this.nodoFormRef) {
        this.nodoFormRef.setCoordinatesAndNode(lat, lng, nodo);
      }
    }, 150);
  }

  openDetailModal(nodo: Nodo) {
    this.selectedNodo = nodo;
  }

  closeDetailModal() {
    this.selectedNodo = null;
  }

  initListMap(element: HTMLElement) {
    if (element && (element as any)._leaflet_id) {
      delete (element as any)._leaflet_id;
    }
    this.listMap = L.map(element).setView([-31.4201, -64.1888], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.listMap);

    this.refreshListMapMarkers();
    this.requestUserLocation();
  }

  cleanupListMap() {
    this.listMarkers.forEach(m => {
      try {
        m.remove();
      } catch (e) {
        console.warn('Error removing list marker:', e);
      }
    });
    this.listMarkers = [];
    if (this.listMap) {
      try {
        this.listMap.remove();
      } catch (e) {
        console.warn('Error removing list map:', e);
      }
      this.listMap = undefined;
    }
  }

  refreshListMapMarkers() {
    if (!this.listMap) return;

    this.listMarkers.forEach(m => m.remove());
    this.listMarkers = [];

    this.nodos.forEach(nodo => {
      if (nodo.latitude && nodo.longitude) {
        const marker = L.marker([nodo.latitude, nodo.longitude], { icon: customMarkerIcon })
          .addTo(this.listMap!)
          .bindPopup(`
            <div style="font-family: inherit; font-size: 0.9rem; padding: 4px;">
              <h4 style="margin: 0 0 4px; color: #002d4b; font-weight: 700;">${nodo.name}</h4>
              <p style="margin: 0 0 4px; color: #475569;">${nodo.address}</p>
              <small style="color: #64748b;">Responsable: ${nodo.manager_name}</small>
            </div>
          `);
        this.listMarkers.push(marker);
      }
    });

    this.updateListMapBounds();
  }

  updateListMapBounds() {
    if (!this.listMap) return;

    const coords: L.LatLng[] = [];
    this.nodos.forEach(n => {
      if (n.latitude && n.longitude) {
        coords.push(L.latLng(n.latitude, n.longitude));
      }
    });

    if (this.userLatitude && this.userLongitude) {
      coords.push(L.latLng(this.userLatitude, this.userLongitude));
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      this.listMap.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  requestUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLatitude = position.coords.latitude;
          this.userLongitude = position.coords.longitude;

          this.sortNodosByProximity();

          if (this.listMap && this.userLatitude && this.userLongitude) {
            const userIcon = L.divIcon({
              html: `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="8" fill="#3b82f6" stroke="#ffffff" stroke-width="2"/>
                  <circle cx="12" cy="12" r="10" fill="#3b82f6" fill-opacity="0.2"/>
                </svg>
              `,
              className: 'user-location-marker',
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            });

            L.marker([this.userLatitude, this.userLongitude], { icon: userIcon })
              .addTo(this.listMap)
              .bindPopup('Tu ubicación')
              .openPopup();

            this.updateListMapBounds();
          }
        },
        (error) => {
          console.warn('Error getting location:', error);
        }
      );
    }
  }

  sortNodosByProximity() {
    if (this.userLatitude !== null && this.userLongitude !== null && this.nodos.length > 0) {
      this.nodos.sort((a, b) => {
        const distA = this.getDistance(this.userLatitude!, this.userLongitude!, a.latitude ?? 0, a.longitude ?? 0);
        const distB = this.getDistance(this.userLatitude!, this.userLongitude!, b.latitude ?? 0, b.longitude ?? 0);
        return distA - distB;
      });
    }
  }

  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  getDistanceFormatted(lat: number, lng: number): string {
    if (this.userLatitude === null || this.userLongitude === null) return '';
    const dist = this.getDistance(this.userLatitude, this.userLongitude, lat, lng);
    if (dist < 1) {
      return `${Math.round(dist * 1000)} m`;
    }
    return `${dist.toFixed(1)} km`;
  }

  async loadNodos() {
    this.isLoading = true;
    const { data, error } = await this.supabaseService.getNodos();
    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      this.nodos = data || [];
      this.sortNodosByProximity();
    }
  }

  async onCreateNodo(newNodo: Nodo) {
    this.isSaving = true;
    this.errorMessage = null;

    const { data, error } = await this.supabaseService.createNodo(newNodo);

    this.isSaving = false;

    if (error) {
      this.errorMessage = error.message;
      this.toastService.showError(error.message);
    } else {
      this.nodos.unshift(data!);
      this.toastService.showSuccess(`Nodo "${data!.name}" creado correctamente.`);
      this.toggleForm(false);
    }
  }
}
