import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonLabel,
  IonIcon,
  IonText,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  IonButton,
  AlertController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { locateOutline, peopleOutline, pinOutline, helpCircleOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { SupabaseService } from '../../supabase.service';
import { Nodo } from '../../core/models/auth.models';
import { HeaderComponent } from '../../core/components/header/header.component';



@Component({
  selector: 'app-select-node',
  templateUrl: './select-node.page.html',
  styleUrls: ['./select-node.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    HeaderComponent,
    IonContent,
    IonLabel,
    IonIcon,
    IonText,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    IonButton
  ]
})
export class SelectNodePage implements OnInit, OnDestroy {
  nodos: Nodo[] = [];
  isLoading = false;
  isSaving = false;
  savingNodeId: string | null = null;
  errorMessage: string | null = null;
  currentSelectedNodeId: string | null = null;
  canCancel = false;

  private customMarkerIcon?: L.DivIcon;
  private userLocationIcon?: L.DivIcon;

  sortBy: 'proximity' | 'popularity' = 'proximity';
  userLatitude: number | null = null;
  userLongitude: number | null = null;

  map?: L.Map;
  markers: L.Marker[] = [];
  userMarker?: L.Marker;

  @ViewChild('mapContainerRef') set mapContainerRef(content: ElementRef) {
    if (content) {
      if (!this.map) {
        this.initMap(content.nativeElement);
      }
    } else {
      this.cleanupMap();
    }
  }

  private alertController = inject(AlertController);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  constructor() {
    addIcons({
      locateOutline,
      peopleOutline,
      pinOutline,
      helpCircleOutline
    });
  }

  ngOnInit() {
    const user = this.supabaseService.currentUserValue;
    if (user && user.default_node_id) {
      this.currentSelectedNodeId = user.default_node_id;
      this.canCancel = true;
    }
    this.loadNodos();
  }

  ionViewDidEnter() {
    if (this.map) {
      this.map.invalidateSize();
      setTimeout(() => {
        if (this.map) {
          this.map.invalidateSize();
        }
      }, 100);
    }
  }

  ngOnDestroy() {
    this.cleanupMap();
  }

  async loadNodos() {
    this.isLoading = true;
    this.errorMessage = null;

    const { data, error } = await this.supabaseService.getNodos();
    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      this.nodos = data || [];
      this.requestUserLocation();
    }
  }

  requestUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLatitude = position.coords.latitude;
          this.userLongitude = position.coords.longitude;
          
          this.sortNodos();
          this.refreshMapMarkers();
        },
        (error) => {
          console.warn('Geolocation access denied or failed. Falling back.', error);
          // Si es denegada, ordenamos por popularidad por defecto
          this.sortBy = 'popularity';
          this.sortNodos();
          this.refreshMapMarkers();
        }
      );
    } else {
      this.sortBy = 'popularity';
      this.sortNodos();
      this.refreshMapMarkers();
    }
  }

  onSortChange() {
    this.sortNodos();
  }

  sortNodos() {
    if (this.sortBy === 'proximity' && this.userLatitude !== null && this.userLongitude !== null) {
      this.nodos.sort((a, b) => {
        const distA = this.getDistance(this.userLatitude!, this.userLongitude!, a.latitude || 0, a.longitude || 0);
        const distB = this.getDistance(this.userLatitude!, this.userLongitude!, b.latitude || 0, b.longitude || 0);
        return distA - distB;
      });
    } else {
      // Orden por popularidad (cantidad de participantes descendente)
      this.nodos.sort((a, b) => (b.participants_count || 0) - (a.participants_count || 0));
    }
  }

  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
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

  initMap(element: HTMLElement) {
    if (element && (element as any)._leaflet_id) {
      delete (element as any)._leaflet_id;
    }

    this.map = L.map(element, {
      zoomControl: true,
      attributionControl: false
    }).setView([-31.4201, -64.1888], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.map);

    this.refreshMapMarkers();

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 250);
  }

  cleanupMap() {
    this.markers.forEach(m => m.remove());
    this.markers = [];
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = undefined;
    }
    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }

  private initIcons() {
    if (!this.customMarkerIcon) {
      this.customMarkerIcon = L.divIcon({
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
    }

    if (!this.userLocationIcon) {
      this.userLocationIcon = L.divIcon({
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
    }
  }

  refreshMapMarkers() {
    if (!this.map) return;

    this.initIcons();

    // Remover marcadores anteriores
    this.markers.forEach(m => m.remove());
    this.markers = [];

    // Agregar marcadores de nodos
    this.nodos.forEach(nodo => {
      if (nodo.latitude && nodo.longitude) {
        const marker = L.marker([nodo.latitude, nodo.longitude], { icon: this.customMarkerIcon })
          .addTo(this.map!)
          .bindPopup(`
            <div style="font-family: inherit; font-size: 0.9rem; padding: 4px;">
              <h4 style="margin: 0 0 4px; color: #002d4b; font-weight: 700;">${nodo.name}</h4>
              <p style="margin: 0 0 4px; color: #475569;">${nodo.address}</p>
              <small style="color: #64748b;">${nodo.participants_count || 0} participantes</small>
            </div>
          `);
        this.markers.push(marker);
      }
    });

    // Agregar marcador del usuario si está disponible
    if (this.userLatitude !== null && this.userLongitude !== null) {
      if (this.userMarker) {
        this.userMarker.remove();
      }
      this.userMarker = L.marker([this.userLatitude, this.userLongitude], { icon: this.userLocationIcon })
        .addTo(this.map)
        .bindPopup('Tu ubicación');
    }

    this.adjustMapBounds();
  }

  adjustMapBounds() {
    if (!this.map) return;

    const coords: L.LatLng[] = [];
    this.nodos.forEach(n => {
      if (n.latitude && n.longitude) {
        coords.push(L.latLng(n.latitude, n.longitude));
      }
    });

    if (this.userLatitude !== null && this.userLongitude !== null) {
      coords.push(L.latLng(this.userLatitude, this.userLongitude));
    }

    if (coords.length > 0) {
      const bounds = L.latLngBounds(coords);
      this.map.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  focusOnNode(nodo: Nodo) {
    if (this.map && nodo.latitude && nodo.longitude) {
      this.map.setView([nodo.latitude, nodo.longitude], 15);
      const marker = this.markers.find(m => {
        const latLng = m.getLatLng();
        return latLng.lat === nodo.latitude && latLng.lng === nodo.longitude;
      });
      if (marker) {
        marker.openPopup();
      }
    }
  }

  async selectNode(nodo: Nodo) {
    if (!nodo.id) return;

    this.isSaving = true;
    this.savingNodeId = nodo.id;
    this.errorMessage = null;

    const { user, error } = await this.supabaseService.updateProfile({ default_node_id: nodo.id });
    this.isSaving = false;
    this.savingNodeId = null;

    if (error) {
      this.errorMessage = error.message;
    } else if (user) {
      this.currentSelectedNodeId = user.default_node_id || null;
      this.router.navigate(['/home']);
    }
  }

  async logout() {
    await this.supabaseService.logout();
    this.router.navigate(['/login']);
  }

  async showHelp() {
    const alert = await this.alertController.create({
      header: '¿Qué es un Punto de Retiro?',
      message: 'Un Punto de Retiro (o Nodo de distribución) es un espacio físico gestionado por la comunidad (vecinos, cooperativas, etc.) donde se reciben y entregan los productos de la red de consumo soberano.\n\nAl elegir uno, tus compras se enviarán allí para que las retires en los días y horarios coordinados por ese nodo.',
      buttons: ['Entendido']
    });
    await alert.present();
  }
}
