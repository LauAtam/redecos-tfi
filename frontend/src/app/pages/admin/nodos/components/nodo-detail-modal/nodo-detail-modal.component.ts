import { Component, Input, Output, EventEmitter, OnDestroy } from '@angular/core';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline, pencilOutline } from 'ionicons/icons';
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
  selector: 'app-nodo-detail-modal',
  standalone: true,
  imports: [
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent
  ],
  templateUrl: './nodo-detail-modal.component.html',
  styleUrls: ['./nodo-detail-modal.component.scss']
})
export class NodoDetailModalComponent implements OnDestroy {
  @Input() isOpen = false;
  @Input() nodo: Nodo | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Nodo>();

  modalMap?: L.Map;
  modalMarker?: L.Marker;

  constructor() {
    addIcons({ closeOutline, pencilOutline });
  }

  onEdit() {
    if (this.nodo) {
      this.edit.emit(this.nodo);
    }
  }

  ngOnDestroy() {
    this.cleanupModalMap();
  }

  onDidPresent() {
    this.initModalMap();
  }

  onDidDismiss() {
    this.cleanupModalMap();
    this.close.emit();
  }

  initModalMap() {
    if (!this.nodo) return;

    const lat = this.nodo.latitude ?? -31.4201;
    const lng = this.nodo.longitude ?? -64.1888;

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

  closeModal() {
    this.close.emit();
  }
}
