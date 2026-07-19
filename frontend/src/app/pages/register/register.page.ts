import { Component, inject } from '@angular/core';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  IonContent,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  mailOutline,
  lockClosedOutline,
  eyeOutline,
  eyeOffOutline,
  idCardOutline,
} from 'ionicons/icons';
import { AppFacadeService } from '../../app-facade.service';
import { HeaderComponent } from '../../core/components/header/header.component';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterModule,
    IonContent,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonSpinner,
    HeaderComponent
  ],
})
export class RegisterPage {
  registerForm: FormGroup;
  otpForm: FormGroup;
  step: 'form' | 'verification' = 'form';
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage: string | null = null;
  registeredEmail: string = '';

  private fb = inject(FormBuilder);
  private appFacadeService = inject(AppFacadeService);
  private router = inject(Router);

  constructor() {
    addIcons({
      personOutline,
      mailOutline,
      lockClosedOutline,
      eyeOutline,
      eyeOffOutline,
      idCardOutline,
    });

    this.registerForm = this.fb.group(
      {
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );

    this.otpForm = this.fb.group({
      token: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (
      password &&
      confirmPassword &&
      password.value !== confirmPassword.value
    ) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }

    return null;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  async onRegister() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { firstName, lastName, email, password } = this.registerForm.value;
    this.registeredEmail = email;

    const { user, error } = await this.appFacadeService.register(
      email,
      password,
      firstName,
      lastName,
    );

    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      // Cambio al paso de verificación
      this.step = 'verification';
    }
  }

  async onVerifyOtp() {
    if (this.otpForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = null;

    const { token } = this.otpForm.value;
    const { user, error } = await this.appFacadeService.verifyOtp(this.registeredEmail, token);

    this.isLoading = false;

    if (error) {
      this.errorMessage = error.message;
    } else {
      this.router.navigate(['/cliente/home']);
    }
  }

  get f() {
    return this.registerForm.controls;
  }

  get otpF() {
    return this.otpForm.controls;
  }
}
