import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { ContactRequest, ContactResponse } from '../../core/models/contact.model';
import { APP_ROUTES } from '../../shared/routing/app-routes';

interface CallableError {
  code?: string;
  message?: string;
}

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './contact-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './contact-page.component.css'
})
export class ContactPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly functions = inject(Functions);
  private readonly destroyRef = inject(DestroyRef);
  private successTimeoutId: ReturnType<typeof setTimeout> | null = null;
  
  readonly routes = APP_ROUTES;
  readonly currentYear = new Date().getFullYear();
  readonly submitted = signal(false);
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  // Preparar la función callable en el constructor
  private readonly sendContactEmailFn = httpsCallable<ContactRequest, ContactResponse>(
    this.functions,
    'sendContactEmail'
  );

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    phone: [''], // Opcional
    message: ['', [Validators.required, Validators.minLength(20)]]
  });

  async sendMessage(): Promise<void> {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    
    if (!this.form.valid) {
      return;
    }

    // Resetear estados
    this.loading.set(true);
    this.error.set(null);
    this.success.set(false);

    try {
      const formData = this.form.getRawValue();
      
      // Preparar datos para la Cloud Function
      const contactData: ContactRequest = {
        name: formData.name,
        email: formData.email,
        subject: formData.subject,
        phone: formData.phone || undefined,
        message: formData.message
      };

      // Llamar a la Cloud Function
      const result = await this.sendContactEmailFn(contactData);

      // Éxito
      if (result.data.success) {
        this.success.set(true);
        this.form.reset();
        this.submitted.set(false);
        
        // Auto-ocultar mensaje de éxito después de 10 segundos
        if (this.successTimeoutId) clearTimeout(this.successTimeoutId);
        this.successTimeoutId = setTimeout(() => {
          this.success.set(false);
          this.successTimeoutId = null;
        }, 10000);
      }

    } catch (err: unknown) {
      const callableError = err as CallableError;

      // Manejar diferentes tipos de errores
      if (callableError.code === 'functions/resource-exhausted') {
        this.error.set('Has alcanzado el límite de envíos. Por favor, intenta más tarde.');
      } else if (callableError.code === 'functions/invalid-argument') {
        this.error.set(callableError.message || 'Datos del formulario inválidos. Verifica e intenta de nuevo.');
      } else {
        this.error.set('Error al enviar el mensaje. Por favor, intenta de nuevo o contáctanos por email directo.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.successTimeoutId) {
        clearTimeout(this.successTimeoutId);
        this.successTimeoutId = null;
      }
    });
  }

  fieldError(fieldName: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[fieldName];
    
    if (!control.touched && !this.submitted()) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio';
    }

    if (control.hasError('email')) {
      return 'Introduce un email válido';
    }

    if (control.hasError('minlength')) {
      const minLength = control.getError('minlength')?.requiredLength;
      return `Este campo debe tener al menos ${minLength} caracteres`;
    }

    return null;
  }
}
