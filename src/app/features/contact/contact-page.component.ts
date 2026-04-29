import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './contact-page.component.html',
  styleUrl: './contact-page.component.css'
})
export class ContactPageComponent {
  private readonly fb = new FormBuilder();
  readonly currentYear = new Date().getFullYear();
  readonly submitted = signal(false);

  readonly form = this.fb.nonNullable.group({
    businessName: ['', [Validators.required, Validators.minLength(2)]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(9)]],
    monthlyClients: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(20)]]
  });

  readonly canSubmit = computed(() => this.form.valid);

  sendEmail(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      return;
    }

    const value = this.form.getRawValue();
    const subject = `Consulta comercial Ticketbarber - ${value.businessName}`;
    const body = [
      `Barberia: ${value.businessName}`,
      `Nombre: ${value.fullName}`,
      `Email: ${value.email}`,
      `Telefono: ${value.phone}`,
      `Clientes al mes (aprox): ${value.monthlyClients}`,
      '',
      'Mensaje:',
      value.message
    ].join('\n');

    const mailto = `mailto:hola@ticketbarber.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  fieldError(fieldName: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[fieldName];
    if (!control.touched && !this.submitted()) {
      return null;
    }

    if (control.hasError('required')) {
      return 'Este campo es obligatorio.';
    }

    if (control.hasError('email')) {
      return 'Introduce un email valido.';
    }

    if (control.hasError('minlength')) {
      return 'Este campo es demasiado corto.';
    }

    return null;
  }
}
