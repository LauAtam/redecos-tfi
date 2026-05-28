import { ErrorHandler, Injectable, inject } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private toastController = inject(ToastController);

  async handleError(error: any): Promise<void> {
    console.error('Error no capturado:', error);

    const message = error?.message || 'Ha ocurrido un error inesperado. Por favor, intente nuevamente.';

    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color: 'danger',
    });

    await toast.present();
  }
}
