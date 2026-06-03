import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  ReactiveFormsModule, 
  Validators 
} from '@angular/forms';
import { 
  IonContent, 
  IonHeader, 
  IonTitle, 
  IonToolbar, 
  IonButtons, 
  IonBackButton,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonTextarea,
  IonThumbnail,
  IonLabel
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  cubeOutline, 
  pricetagOutline, 
  readerOutline,
  layersOutline,
  imageOutline,
  addOutline
} from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { Producto } from '../../../core/models/auth.models';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
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
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonTextarea,
    IonThumbnail,
    IonLabel
  ]
})
export class ProductosPage implements OnInit {
  productoForm: FormGroup;
  isLoading = false;
  isSaving = false;
  errorMessage: string | null = null;
  productos: Producto[] = [];

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private toastService: ToastService
  ) {
    addIcons({ 
      cubeOutline, 
      pricetagOutline, 
      readerOutline,
      layersOutline,
      imageOutline,
      addOutline
    });

    this.productoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.maxLength(200)]],
      price: [null, [Validators.required, Validators.min(0.01)]],
      bulk_size: [null, [Validators.required, Validators.min(1)]],
      image_url: ['', [Validators.pattern(/https?:\/\/.+/)]]
    });
  }

  ngOnInit() {
    this.loadProductos();
  }

  async loadProductos() {
    this.isLoading = true;
    const { data, error } = await this.supabaseService.getProductos();
    this.isLoading = false;
    
    if (error) {
      this.errorMessage = error.message;
    } else {
      this.productos = data || [];
    }
  }

  async onCreateProducto() {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = null;

    const newProducto: Producto = this.productoForm.value;
    const { data, error } = await this.supabaseService.createProducto(newProducto);

    this.isSaving = false;

    if (error) {
      this.errorMessage = error.message;
      this.toastService.showError(error.message);
    } else {
      this.productos.unshift(data!);
      this.toastService.showSuccess(`Producto "${data!.name}" cargado correctamente.`);
      this.productoForm.reset();
    }
  }

  get f() { return this.productoForm.controls; }
}
