import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
  IonCardContent
  } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  businessOutline,
  locationOutline,
  personOutline,
  addOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { Nodo } from '../../../core/models/auth.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-nodos',
  templateUrl: './nodos.page.html',
  styleUrls: ['./nodos.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
    IonCardContent
  ],
})
export class NodosPage implements OnInit {
  nodoForm: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;
  nodos: Nodo[] = [];

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
    });

    this.nodoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      manager_name: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit() {
    this.loadNodos();
  }

  async loadNodos() {
    this.isLoading = true;
    const { data, error } = await this.supabaseService.getNodos();
    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      this.nodos = data || [];
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
      this.nodoForm.reset();
    }
  }

  get f() {
    return this.nodoForm.controls;
  }
}
