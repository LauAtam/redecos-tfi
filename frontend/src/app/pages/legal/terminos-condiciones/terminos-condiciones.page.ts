import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { AppFacadeService } from '../../../app-facade.service';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

import { HeaderComponent } from '../../../core/components/header/header.component';

@Component({
  selector: 'app-terminos-condiciones',
  templateUrl: './terminos-condiciones.page.html',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, RouterLink, HeaderComponent]
})
export class TerminosCondicionesPage {
  private fb = inject(FormBuilder);
  private appFacade = inject(AppFacadeService);
  private toastCtrl = inject(ToastController);

  deleteForm = this.fb.nonNullable.group({
    reason: ['', [Validators.required, Validators.maxLength(500)]]
  });

  isSubmitting = false;

  isLoggedIn = computed(() => !!this.appFacade.currentUser());

  async requestDeletion() {
    if (this.deleteForm.invalid) {
      this.deleteForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    try {
      // In a real app we would call a backend endpoint here.
      // E.g. await this.appFacade.requestAccountDeletion(this.deleteForm.value.reason);
      const sessionResponse = await this.appFacade.getSession();
      if (!sessionResponse.data?.session) {
        throw new Error('Debe iniciar sesión para solicitar la eliminación de su cuenta.');
      }

      const response = await fetch(`${environment.apiUrl}/profiles/me/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionResponse.data.session.access_token}`
        },
        body: JSON.stringify({ reason: this.deleteForm.value.reason })
      });

      if (!response.ok) {
        throw new Error('Ocurrió un error al procesar su solicitud.');
      }

      const toast = await this.toastCtrl.create({
        message: 'Solicitud enviada. Nos contactaremos en las próximas 48hs para confirmar la supresión definitiva.',
        duration: 5000,
        color: 'success',
        position: 'top'
      });
      await toast.present();

      this.deleteForm.reset();
    } catch (error: any) {
      const toast = await this.toastCtrl.create({
        message: error.message || 'Error al procesar la solicitud.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await toast.present();
    } finally {
      this.isSubmitting = false;
    }
  }
}
