import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
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
  IonCardContent,
  IonModal
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
    IonModal
  ],
})
export class NodosPage implements OnInit, OnDestroy {
  nodoForm: FormGroup;
  isLoading = false;
  isSaving = false;
  showForm = false;
  errorMessage: string | null = null;
  nodos: Nodo[] = [];

  listMap?: L.Map;
  listMarkers: L.Marker[] = [];
  userLatitude: number | null = null;
  userLongitude: number | null = null;

  map?: L.Map;
  marker?: L.Marker;
  modalMap?: L.Map;
  modalMarker?: L.Marker;

  selectedNodo: Nodo | null = null;
  private addressSubscription?: Subscription;
  private latSubscription?: Subscription;
  private lngSubscription?: Subscription;
  private reverseGeocodeSubject = new Subject<{ lat: number; lng: number }>();
  private reverseGeocodeSubscription?: Subscription;

  @ViewChild('listMapContainerRef') set listMapContainerRef(content: ElementRef) {
    if (content) {
      if (!this.listMap) {
        this.initListMap(content.nativeElement);
      }
    } else {
      this.cleanupListMap();
    }
  }

  @ViewChild('mapContainerRef') set mapContainerRef(content: ElementRef) {
    if (content) {
      if (!this.map) {
        this.initMap(content.nativeElement);
      }
    } else {
      this.cleanupMap();
    }
  }

  constructor(
    private fb: FormBuilder,
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

    this.nodoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      manager_name: ['', [Validators.required, Validators.minLength(3)]],
      latitude: [null, [Validators.min(-90), Validators.max(90)]],
      longitude: [null, [Validators.min(-180), Validators.max(180)]],
    });
  }

  ngOnInit() {
    this.loadNodos();
    this.setupFormSubscriptions();
  }

  ngOnDestroy() {
    if (this.addressSubscription) {
      this.addressSubscription.unsubscribe();
    }
    if (this.latSubscription) {
      this.latSubscription.unsubscribe();
    }
    if (this.lngSubscription) {
      this.lngSubscription.unsubscribe();
    }
    if (this.reverseGeocodeSubscription) {
      this.reverseGeocodeSubscription.unsubscribe();
    }
    try {
      this.cleanupModalMap();
    } catch (e) {
      console.error('Error during cleanupModalMap on destroy:', e);
    }
    try {
      this.cleanupMap();
    } catch (e) {
      console.error('Error during cleanupMap on destroy:', e);
    }
    try {
      this.cleanupListMap();
    } catch (e) {
      console.error('Error during cleanupListMap on destroy:', e);
    }
  }

  initMap(element: HTMLElement) {
    if (element && (element as any)._leaflet_id) {
      delete (element as any)._leaflet_id;
    }

    const defaultLat = this.nodoForm.get('latitude')?.value ?? -31.4201;
    const defaultLng = this.nodoForm.get('longitude')?.value ?? -64.1888;

    this.map = L.map(element).setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.marker = L.marker([defaultLat, defaultLng], {
      icon: customMarkerIcon,
      draggable: true
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      this.updateMarkerPosition(lat, lng, true);
    });

    this.marker.on('dragend', () => {
      if (this.marker) {
        const position = this.marker.getLatLng();
        this.updateMarkerPosition(position.lat, position.lng, true);
      }
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 100);
  }

  cleanupMap() {
    if (this.marker) {
      try {
        this.marker.remove();
      } catch (e) {
        console.warn('Error removing main map marker:', e);
      }
      this.marker = undefined;
    }
    if (this.map) {
      try {
        this.map.remove();
      } catch (e) {
        console.warn('Error removing main map:', e);
      }
      this.map = undefined;
    }
  }

  setupFormSubscriptions() {
    this.addressSubscription = this.nodoForm.get('address')?.valueChanges.pipe(
      debounceTime(1000),
      distinctUntilChanged()
    ).subscribe(address => {
      if (address) {
        this.geocodeAddress(address);
      }
    });

    this.latSubscription = this.nodoForm.get('latitude')?.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe(val => {
      if (val !== null && val !== undefined) {
        const lat = Number(val);
        const lng = Number(this.nodoForm.get('longitude')?.value);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          if (this.marker && this.map) {
            this.marker.setLatLng([lat, lng]);
            this.map.setView([lat, lng]);
          }
        }
      }
    });

    this.lngSubscription = this.nodoForm.get('longitude')?.valueChanges.pipe(
      debounceTime(800),
      distinctUntilChanged()
    ).subscribe(val => {
      if (val !== null && val !== undefined) {
        const lat = Number(this.nodoForm.get('latitude')?.value);
        const lng = Number(val);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          if (this.marker && this.map) {
            this.marker.setLatLng([lat, lng]);
            this.map.setView([lat, lng]);
          }
        }
      }
    });

    this.reverseGeocodeSubscription = this.reverseGeocodeSubject.pipe(
      debounceTime(1000)
    ).subscribe(({ lat, lng }) => {
      this.executeReverseGeocode(lat, lng);
    });
  }

  updateMarkerPosition(lat: number, lng: number, triggerReverseGeocoding: boolean) {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));

    if (this.marker) {
      this.marker.setLatLng([roundedLat, roundedLng]);
    }

    this.nodoForm.patchValue({
      latitude: roundedLat,
      longitude: roundedLng
    }, { emitEvent: false });

    if (triggerReverseGeocoding) {
      this.reverseGeocodeSubject.next({ lat: roundedLat, lng: roundedLng });
    }
  }

  async geocodeAddress(address: string) {
    if (!address || address.length < 5) return;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Redecos-TFI-Geocoding-Agent/1.0 (contact@redecos.com)'
        }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        this.updateMarkerPosition(lat, lon, false);
      }
    } catch (error) {
      console.error('Error in geocoding:', error);
    }
  }

  async executeReverseGeocode(lat: number, lng: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Redecos-TFI-Geocoding-Agent/1.0 (contact@redecos.com)'
        }
      });
      const data = await response.json();
      if (data && data.display_name) {
        this.nodoForm.patchValue({
          address: data.display_name
        }, { emitEvent: false });
      }
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
    }
  }

  toggleForm(show: boolean) {
    this.showForm = show;
    if (!show) {
      this.errorMessage = null;
      this.nodoForm.reset();
    }
  }

  selectNodeForMap(nodo: Nodo) {
    this.toggleForm(true);

    setTimeout(() => {
      const lat = nodo.latitude ?? -31.4201;
      const lng = nodo.longitude ?? -64.1888;

      this.nodoForm.patchValue({
        name: nodo.name,
        address: nodo.address,
        manager_name: nodo.manager_name,
        latitude: nodo.latitude,
        longitude: nodo.longitude
      }, { emitEvent: false });

      this.updateMarkerPosition(lat, lng, false);
      if (this.map) {
        this.map.setView([lat, lng], 15);
      }
    }, 150);
  }

  openDetailModal(nodo: Nodo) {
    this.selectedNodo = nodo;
  }

  closeDetailModal() {
    this.cleanupModalMap();
    this.selectedNodo = null;
  }

  initModalMap() {
    if (!this.selectedNodo) return;

    const lat = this.selectedNodo.latitude ?? -31.4201;
    const lng = this.selectedNodo.longitude ?? -64.1888;

    this.cleanupModalMap();

    const element = document.getElementById('modalMap');
    if (element && (element as any)._leaflet_id) {
      delete (element as any)._leaflet_id;
    }

    this.modalMap = L.map('modalMap').setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.modalMap);

    this.modalMarker = L.marker([lat, lng], {
      icon: customMarkerIcon,
      draggable: false
    }).addTo(this.modalMap);

    setTimeout(() => {
      if (this.modalMap) {
        this.modalMap.invalidateSize();
      }
    }, 200);
  }

  cleanupModalMap() {
    if (this.modalMarker) {
      try {
        this.modalMarker.remove();
      } catch (e) {
        console.warn('Error removing modal map marker:', e);
      }
      this.modalMarker = undefined;
    }
    if (this.modalMap) {
      try {
        this.modalMap.remove();
      } catch (e) {
        console.warn('Error removing modal map:', e);
      }
      this.modalMap = undefined;
    }
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

  async onCreateNodo() {
    if (this.nodoForm.invalid) {
      this.nodoForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    const newNodo: Nodo = this.nodoForm.value;
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

  get f() {
    return this.nodoForm.controls;
  }
}
