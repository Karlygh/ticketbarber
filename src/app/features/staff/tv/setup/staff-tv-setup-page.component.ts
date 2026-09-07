import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, OnDestroy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/stores/auth.store';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

interface StepDetail {
  subSteps: string[];
  warning?: string;
  tip?: string;
}

interface SetupStep {
  number: string;
  title: string;
  description: string;
  imageLabel: string;
  imageHint: string;
  imageSrc?: string;
  imageLabel2: string;
  imageHint2: string;
  imageSrc2?: string;
  detail: StepDetail;
}

type ImageSlot = 'primary' | 'secondary';

interface Prereq {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-staff-tv-setup-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './staff-tv-setup-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './staff-tv-setup-page.component.css'
})
export class StaffTvSetupPageComponent implements OnDestroy {
  readonly authStore = inject(AuthStore);
  readonly routes = APP_ROUTES;
  private readonly router = inject(Router);

  activeStepIndex = 0;
  activeImageStep: SetupStep | null = null;
  activeImageSlot: ImageSlot = 'primary';

  get activeImageSrc(): string | undefined {
    if (!this.activeImageStep) return undefined;
    return this.activeImageSlot === 'primary' ? this.activeImageStep.imageSrc : this.activeImageStep.imageSrc2;
  }

  get activeImageLabel(): string {
    if (!this.activeImageStep) return '';
    return this.activeImageSlot === 'primary' ? this.activeImageStep.imageLabel : this.activeImageStep.imageLabel2;
  }

  get activeStep(): SetupStep {
    return this.steps[this.activeStepIndex];
  }

  get isFirstStep(): boolean {
    return this.activeStepIndex === 0;
  }

  get isLastStep(): boolean {
    return this.activeStepIndex === this.steps.length - 1;
  }

  get progressLabel(): string {
    return `Paso ${this.activeStepIndex + 1} de ${this.steps.length}`;
  }

  get primaryCtaLabel(): string {
    return this.authStore.isAuthenticated() ? 'Vincular TV ahora' : 'Crear cuenta gratuita';
  }

  get primaryCtaLink(): string {
    return this.authStore.isAuthenticated() ? this.routes.tvPair : this.routes.staff.register;
  }

  selectStep(index: number): void {
    this.activeStepIndex = Math.min(Math.max(index, 0), this.steps.length - 1);
  }

  previousStep(): void {
    this.selectStep(this.activeStepIndex - 1);
  }

  nextStep(): void {
    if (this.isLastStep) {
      void this.router.navigateByUrl(this.primaryCtaLink);
      return;
    }
    this.selectStep(this.activeStepIndex + 1);
  }

  openImageModal(step: SetupStep, slot: ImageSlot = 'primary'): void {
    const src = slot === 'primary' ? step.imageSrc : step.imageSrc2;
    if (!src) {
      return;
    }
    this.activeImageStep = step;
    this.activeImageSlot = slot;
    this.updateBodyScrollLock();
  }

  closeImageModal(): void {
    this.activeImageStep = null;
    this.updateBodyScrollLock();
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    if (this.activeImageStep) {
      this.closeImageModal();
    }
  }

  private updateBodyScrollLock(): void {
    document.body.style.overflow = this.activeImageStep ? 'hidden' : '';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  readonly prereqs: Prereq[] = [
    { icon: '📺', label: 'Una TV o pantalla con navegador web' },
    { icon: '📶', label: 'Conexión Wi-Fi activa en el local' },
    { icon: '🔑', label: 'Una cuenta de barbero en Ticketbarber' }
  ];

  readonly steps: SetupStep[] = [
    {
      number: '01',
      title: 'Inicia sesión en la tablet',
      description:
        'Accede al panel de barberos desde tu tablet o móvil: desde ahí controlarás los turnos en tiempo real mientras la TV los muestra a tus clientes.',
      imageLabel: 'Imagen 1 del paso 1',
      imageHint: 'Sustituir por una captura del login staff en la tablet.',
      imageSrc: 'assets/1.png',
      imageLabel2: 'Imagen 2 del paso 1',
      imageHint2: 'Añadir una segunda captura complementaria del paso 1.',
      imageSrc2: 'assets/capinicio1.png',
      detail: {
        subSteps: [
          '1.1 Abre el navegador (Chrome recomendado) en tu tablet o móvil.',
          '1.2 Ve a la URL oficial de Ticketbarber.',
          '1.3 Pulsa "Iniciar sesión", rellena tus credenciales y accede a tu cuenta de barbero. Si no tienes cuenta, regístrate primero.',
          '1.4 Con la sesión iniciada, ya puedes entrar al panel de gestión de turnos.'
        ],
        warning: 'Inicia sesión siempre con la cuenta de barbero, no con una cuenta de cliente.',
        tip: 'Guarda la URL en favoritos de la tablet y de la TV para abrirla más rápido cada día.'
      }
    },
    {
      number: '02',
      title: 'Abre el navegador en la TV',
      description:
        'La TV solo necesita un navegador web, sin instalar ninguna app: funciona con cualquier smart TV, Chromecast, Fire TV Stick o dispositivo conectado a la pantalla.',
      imageLabel: 'Imagen 1 del paso 2',
      imageHint: 'Sustituir por una captura del navegador abierto en la TV.',
      imageSrc: 'assets/2.png',
      imageLabel2: 'Imagen 2 del paso 2',
      imageHint2: 'Añadir una segunda captura complementaria del paso 2.',
      imageSrc2: 'assets/cap2tv.jpg',
      detail: {
        subSteps: [
          '2.1 Enciende la TV y selecciona la entrada correcta (HDMI, TV, Chromecast, Fire TV Stick, etc.).',
          '2.2 Localiza el navegador web del sistema (Chrome, Silk Browser, etc.).',
          '2.3 Ábrelo y comprueba que hay conexión a internet; actívala antes si hace falta.',
          '2.4 Si el navegador pide una actualización, acéptala antes de continuar.'
        ],
        warning: 'Comprueba que la TV tiene Wi-Fi o cable de red activo: sin conexión, la vista no se actualizará.',
        tip: 'Usa siempre el mismo navegador en la TV para que conserve la vinculación entre apagados.'
      }
    },
    {
      number: '03',
      title: 'Escribe el dominio de la app',
      description:
        'Con el navegador abierto en la TV, escribe directamente la URL de Ticketbarber en la barra de direcciones: no hace falta buscar nada en Google.',
      imageLabel: 'Imagen 1 del paso 3',
      imageHint: 'Sustituir por una captura mostrando la URL de la app.',
      imageSrc: 'assets/4.png',
      imageLabel2: 'Imagen 2 del paso 3',
      imageHint2: 'Añadir una segunda captura complementaria del paso 3.',
      imageSrc2: 'assets/4b.png',
      detail: {
        subSteps: [
          '3.1 Haz clic en la barra de direcciones del navegador.',
          '3.2 Escribe el dominio completo de Ticketbarber, sin espacios ni errores.',
          '3.3 Pulsa Enter o el botón de ir del teclado.',
          '3.4 Espera a que cargue la página de inicio de la aplicación.'
        ],
        warning: 'No busques en Google: escribe la URL directamente en la barra de direcciones para evitar páginas equivocadas.',
        tip: 'Guarda luego la URL /tv en favoritos para abrir ese acceso directo cada mañana.'
      }
    },
    {
      number: '04',
      title: 'Genera el código desde tu móvil',
      description:
        'El código de vinculación se genera desde la cuenta del barbero y dura 15 minutos; solo hace falta para la primera vinculación o para recuperar una TV.',
      imageLabel: 'Imagen 1 del paso 4',
      imageHint: 'Sustituir por una captura de la pantalla Vincular TV con el código visible.',
      imageSrc: 'assets/55.png',
      imageLabel2: 'Imagen 2 del paso 4',
      imageHint2: 'Añadir una segunda captura complementaria del paso 4.',
      imageSrc2: 'assets/captcodigo.png',
      detail: {
        subSteps: [
          '4.1 Inicia sesión con la cuenta del negocio desde tu móvil, tablet o portátil.',
          '4.2 En el navbar pulsa "Vincular TV".',
          '4.3 Genera un código nuevo o copia el activo si ya tienes uno: son 6 dígitos para introducir en la TV.',
          '4.4 Si lo necesitas, pulsa "Generar nuevo código" para invalidar el anterior y crear otro.'
        ],
        warning: 'No compartas un código caducado: cada código se usa una sola vez y expira automáticamente.',
        tip: 'Mantén esta pantalla abierta mientras configuras la TV; no hace falta generar un código nuevo cada día.'
      }
    },
    {
      number: '05',
      title: 'Introduce el código y deja la TV lista',
      description:
        'La TV no necesita sesión permanente: abre la pantalla de activación, escribe el código una vez y espera a que se abra la cola de turnos.',
      imageLabel: 'Imagen 1 del paso 5',
      imageHint: 'Sustituir por una captura final de la vista TV funcionando.',
      imageSrc: 'assets/5.png',
      imageLabel2: 'Imagen 2 del paso 5',
      imageHint2: 'Añadir una segunda captura complementaria del paso 5.',
      imageSrc2: 'assets/cap5.png',
      detail: {
        subSteps: [
          '5.1 En la TV escribe la URL de la app y pulsa Enter.',
          '5.2 En la barra de búsqueda de Ticketbarber pulsa el botón "Ingresar código TV".',
          '5.3 Introduce el código que generaste antes desde tu tablet o móvil (paso 4).',
          '5.4 Con la TV vinculada, guarda la URL /tv en favoritos y activa pantalla completa para el uso diario.'
        ],
        tip: 'Si la TV se apaga sola, desactiva el ahorro de energía o apagado automático en sus ajustes, y evita el modo incógnito o los limpiadores de datos.'
      }
    }
  ];

  readonly tips: string[] = [
    'Activa pantalla completa para que se vea mejor desde lejos.',
    'Comprueba el Wi-Fi antes de introducir el código para evitar cortes.',
    'Para cambiar turnos o revisar la cola, vuelve al panel desde la tablet.'
  ];

  get secondaryCtaLabel(): string {
    return this.authStore.isAuthenticated() ? 'Volver al panel' : 'Conocer precios';
  }

  get secondaryCtaLink(): string {
    return this.authStore.isAuthenticated() ? this.routes.staff.root : this.routes.pricing;
  }
}

