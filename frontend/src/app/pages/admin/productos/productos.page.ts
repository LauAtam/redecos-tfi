import { Component, OnInit, OnDestroy, inject, ViewChild, ElementRef } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

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
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
  IonCard,
  IonTextarea,
  IonThumbnail,
  IonModal,
  ActionSheetController,
  IonFab,
  IonFabButton,
  IonSelect,
  IonSelectOption,
  IonSearchbar,
  IonChip,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
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
  ellipsisVerticalOutline,
} from 'ionicons/icons';
import { AppFacadeService } from '../../../app-facade.service';
import { Producto, Categoria } from '../../../core/models/auth.models';
import { ToastService } from '../../../core/services/toast.service';
import { AlertController } from '@ionic/angular/standalone';
import { HeaderComponent } from '../../../core/components/header/header.component';
import { StockBadgeClassPipe } from '../../../core/pipes/stock-badge-class.pipe';

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
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonTextarea,
    IonThumbnail,
    IonModal,
    IonFab,
    IonFabButton,
    IonSelect,
    IonSelectOption,
    IonSearchbar,
    IonChip,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    HeaderComponent,
    StockBadgeClassPipe
  ],
})
export class ProductosPage implements OnInit, OnDestroy {
  @ViewChild('csvFileInput') csvFileInput!: ElementRef<HTMLInputElement>;
  
  private searchSubject = new Subject<string>();
  private searchSub: Subscription | null = null;
  
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
  categorias: Categoria[] = [];
  
  searchQuery = '';
  selectedCategoryId: string | null = null;
  currentPage = 1;
  limit = 20;
  hasMoreProducts = true;

  private fb = inject(FormBuilder);
  private appFacadeService = inject(AppFacadeService);
  private toastService = inject(ToastService);
  private alertController = inject(AlertController);
  private actionSheetController = inject(ActionSheetController);

  constructor() {
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
      ellipsisVerticalOutline,
    });

    this.productoForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.maxLength(200)]],
      price: [null, [Validators.required, Validators.min(0.01)]],
      bulk_size: [null, [Validators.required, Validators.min(1)]],
      image_url: ['', [Validators.pattern(/https?:\/\/.+/)]],
      category_id: [null],
      retail_price: [null, [Validators.min(0.01)]],
      stock: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit() {
    this.loadCategorias();
    this.loadProductos();

    // Configurar rate limiter (debounce) y longitud mínima
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((term) => {
      const trimmed = term.trim();
      if (trimmed.length === 0 || trimmed.length >= 3) {
        this.searchQuery = trimmed;
        this.loadProductos();
      }
    });
  }

  ngOnDestroy() {
    if (this.searchSub) {
      this.searchSub.unsubscribe();
    }
  }

  async loadCategorias() {
    const { data, error } = await this.appFacadeService.getCategorias();
    if (!error && data) {
      this.categorias = data;
    }
  }

  async loadProductos(append = false) {
    if (!append) {
      this.currentPage = 1;
      this.hasMoreProducts = true;
      this.isLoading = true;
    }

    const { data, error } = await this.appFacadeService.getProductos({
      search: this.searchQuery || undefined,
      categoryId: this.selectedCategoryId || undefined,
      page: this.currentPage,
      limit: this.limit,
    });

    if (!append) {
      this.isLoading = false;
    }

    if (error) {
      this.errorMessage = error.message;
    } else {
      const newProducts = data || [];
      if (append) {
        this.productos = [...this.productos, ...newProducts];
      } else {
        this.productos = newProducts;
      }
      
      if (newProducts.length < this.limit) {
        this.hasMoreProducts = false;
      }
    }
  }

  selectCategory(catId: string | null) {
    this.selectedCategoryId = catId;
    this.loadProductos();
  }

  onSearch(event: any) {
    const val = event.target.value;
    this.searchSubject.next(val || '');
  }

  async loadMore(event: any) {
    this.currentPage++;
    await this.loadProductos(true);
    event.target.complete();
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
      category_id: prod.category_id || null,
      retail_price: prod.retail_price || null,
      stock: prod.stock || 0,
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
              await this.appFacadeService.deleteProducto(prod.id!);
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
      await this.appFacadeService.createProducto(newProducto);

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
    const { data, error } = await this.appFacadeService.updateProducto(
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

  editProductFromDetail() {
    if (this.selectedProduct) {
      const prod = this.selectedProduct;
      this.closeProductDetail();
      this.onEditProduct(prod);
    }
  }

  async presentProductActionSheet() {
    if (!this.selectedProduct) return;
    const actionSheet = await this.actionSheetController.create({
      header: 'Opciones del Producto',
      buttons: [
        {
          text: 'Eliminar Producto',
          role: 'destructive',
          icon: 'trash-outline',
          handler: () => {
            const prod = this.selectedProduct!;
            this.closeProductDetail();
            this.onDeleteProduct(prod);
          }
        },
        {
          text: 'Cancelar',
          role: 'cancel'
        }
      ]
    });
    await actionSheet.present();
  }

  formatProductName(name: string): string {
    if (!name) return '';
    const trimmed = name.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
  }

  formatPrice(price: number | undefined): string {
    if (price === undefined || price === null) return '$0,00';
    return '$' + new Intl.NumberFormat('es-AR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  triggerCsvUpload() {
    this.csvFileInput.nativeElement.click();
  }

  async onCsvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.isLoading = true;
    this.errorMessage = null;

    const { data, error } = await this.appFacadeService.importCatalog(file);
    
    // Resetear valor para permitir subidas consecutivas del mismo archivo
    input.value = '';
    this.isLoading = false;

    if (error) {
      this.toastService.showError(error.message);
    } else if (data) {
      this.toastService.showSuccess(
        `Importación exitosa: se crearon/actualizaron ${data.importedCount} productos y ${data.categoriesCreated} categorías.`,
      );
      this.loadCategorias();
      this.loadProductos();
    }
  }

  get f() {
    return this.productoForm.controls;
  }
}
