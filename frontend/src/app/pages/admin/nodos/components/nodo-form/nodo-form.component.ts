import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  personOutline,
  businessOutline,
  addOutline
} from 'ionicons/icons';
import { Subscription, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as L from 'leaflet';
import { Nodo } from '../../../../../core/models/auth.models';

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
  selector: 'app-nodo-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner
  ],
  templateUrl: './nodo-form.component.html',
  styleUrls: ['./nodo-form.component.scss']
})
export class NodoFormComponent implements OnInit, OnDestroy {
  @Input() isSaving = false;
  @Input() errorMessage: string | null = null;
  @Output() submitForm = new EventEmitter<Nodo>();

  nodoForm: FormGroup;
  map?: L.Map;
  marker?: L.Marker;

  private addressSubscription?: Subscription;
  private latSubscription?: Subscription;
  private lngSubscription?: Subscription;
  private reverseGeocodeSubject = new Subject<{ lat: number; lng: number }>();
  private reverseGeocodeSubscription?: Subscription;

  @ViewChild('mapContainerRef') set mapContainerRef(content: ElementRef) {
    if (content) {
      if (!this.map) {
        this.initMap(content.nativeElement);
      }
    } else {
      this.cleanupMap();
    }
  }

  constructor(private fb: FormBuilder) {
    addIcons({
      locationOutline,
      personOutline,
      businessOutline,
      addOutline
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
    this.cleanupMap();
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

  onSubmit() {
    if (this.nodoForm.invalid) {
      this.nodoForm.markAllAsTouched();
      return;
    }
    this.submitForm.emit(this.nodoForm.value);
  }

  setCoordinatesAndNode(lat: number, lng: number, nodo: Partial<Nodo>) {
    this.nodoForm.patchValue({
      name: nodo.name,
      address: nodo.address,
      manager_name: nodo.manager_name,
      latitude: lat,
      longitude: lng
    }, { emitEvent: false });

    this.updateMarkerPosition(lat, lng, false);
    if (this.map) {
      this.map.setView([lat, lng], 15);
    }
  }

  get f() {
    return this.nodoForm.controls;
  }
}
