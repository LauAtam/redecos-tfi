import { Component, OnInit } from '@angular/core';

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
  IonModal,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cubeOutline,
  pricetagOutline,
  readerOutline,
  layersOutline,
  imageOutline,
  addOutline,
  pencilOutline,
  trashOutline,
  closeOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../../supabase.service';
import { Producto } from '../../../core/models/auth.models';
import { ToastService } from '../../../core/services/toast.service';
import { AlertController } from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-productos',
  templateUrl: './productos.page.html',
  styleUrls: ['./productos.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
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
    IonModal,
    HeaderComponent
  ],
})
export class ProductosPage implements OnInit {
  productoForm: FormGroup;
  isLoading = false;
  isSaving = false;
  showForm = false;
  isEditing = false;
  editingProductId: string | null = null;
  selectedProduct: Producto | null = null;
  isDetailModalOpen = false;
  errorMessage: string | null = null;
  productos: Producto[] = [];

  constructor(
    private fb: FormBuilder,
    private supabaseService: SupabaseService,
    private toastService: ToastService,
    private alertController: AlertController,
  ) {
    addIcons({
      cubeOutline,
      pricetagOutline,
      readerOutline,
      layersOutline,
      imageOutline,
      addOutline,
      pencilOutline,
      trashOutline,
      closeOutline,
    });

    this.productoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.maxLength(200)]],
      price: [null, [Validators.required, Validators.min(0.01)]],
      bulk_size: [null, [Validators.required, Validators.min(1)]],
      image_url: ['', [Validators.pattern(/https?:\/\/.+/)]],
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

  toggleForm(show: boolean) {
    this.showForm = show;
    if (!show) {
      this.isEditing = false;
      this.editingProductId = null;
      this.errorMessage = null;
      this.productoForm.reset();
    }
  }

  onEditProduct(prod: Producto) {
    this.isEditing = true;
    this.editingProductId = prod.id || null;
    this.productoForm.patchValue({
      name: prod.name,
      description: prod.description || '',
      price: prod.price,
      bulk_size: prod.bulk_size,
      image_url: prod.image_url || '',
    });
    this.showForm = true;
  }

  async onDeleteProduct(prod: Producto) {
    const alert = await this.alertController.create({
      header: 'Confirmar eliminación',
      message: `¿Estás seguro de que querés eliminar el producto "${prod.name}" del catálogo? Esta acción no se puede deshacer.`,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            this.isLoading = true;
            const { success, error } =
              await this.supabaseService.deleteProducto(prod.id!);
            this.isLoading = false;

            if (error) {
              this.toastService.showError(error.message);
            } else {
              this.productos = this.productos.filter((p) => p.id !== prod.id);
              this.toastService.showSuccess(
                `Producto "${prod.name}" eliminado correctamente.`,
              );
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async onSubmit() {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      return;
    }

    if (this.isEditing && this.editingProductId) {
      await this.onUpdateProduct();
    } else {
      await this.onCreateProducto();
    }
  }

  async onCreateProducto() {
    this.isSaving = true;
    this.errorMessage = null;

    const newProducto: Producto = this.productoForm.value;
    const { data, error } =
      await this.supabaseService.createProducto(newProducto);

    this.isSaving = false;

    if (error) {
      this.errorMessage = error.message;
      this.toastService.showError(error.message);
    } else {
      if (data) {
        this.productos.unshift(data);
      }
      this.toastService.showSuccess(
        `Producto "${newProducto.name}" cargado correctamente.`,
      );
      this.toggleForm(false);
    }
  }

  async onUpdateProduct() {
    this.isSaving = true;
    this.errorMessage = null;

    const updatedData: Partial<Producto> = this.productoForm.value;
    const { data, error } = await this.supabaseService.updateProducto(
      this.editingProductId!,
      updatedData,
    );

    this.isSaving = false;

    if (error) {
      this.errorMessage = error.message;
      this.toastService.showError(error.message);
    } else {
      if (data) {
        // Reemplazar en la lista local
        const index = this.productos.findIndex(
          (p) => p.id === this.editingProductId,
        );
        if (index !== -1) {
          this.productos[index] = data;
        }
      }
      this.toastService.showSuccess(
        `Producto "${updatedData.name}" actualizado correctamente.`,
      );
      this.toggleForm(false);
    }
  }

  showProductDetail(prod: Producto) {
    this.selectedProduct = prod;
    this.isDetailModalOpen = true;
    console.log(prod);
  }

  closeProductDetail() {
    this.isDetailModalOpen = false;
    this.selectedProduct = null;
  }

  get f() {
    return this.productoForm.controls;
  }
}
