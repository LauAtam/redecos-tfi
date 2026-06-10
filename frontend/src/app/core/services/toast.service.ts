import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, alertCircleOutline, warningOutline } from 'ionicons/icons';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  constructor(private toastController: ToastController) {
    // Registramos los iconos que vamos a usar en los toasts
    addIcons({
      checkmarkCircleOutline,
      alertCircleOutline,
      warningOutline,
    });
  }

  async showSuccess(message: string, duration: number = 3000) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      icon: 'checkmark-circle-outline',
      color: 'success',
      buttons: [
        {
          text: 'OK',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  async showError(message: string, duration: number = 4000) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      icon: 'alert-circle-outline',
      color: 'danger',
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }

  async showWarning(message: string, duration: number = 3500) {
    const toast = await this.toastController.create({
      message,
      duration,
      position: 'bottom',
      icon: 'warning-outline',
      color: 'warning',
      buttons: [
        {
          text: 'Entendido',
          role: 'cancel',
        },
      ],
    });
    await toast.present();
  }
}
