import { CommonModule } from '@angular/common';
import { Component, inject, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../../../core/stores/auth.store';
import { FooterComponent } from '../../../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../../../shared/components/header/header.component';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';

interface StepDetail {
  body: string;
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
  detail: StepDetail;
}

interface Prereq {
  icon: string;
  label: string;
}

@Component({
  selector: 'app-staff-tv-setup-page',
  standalone: true,
  imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent],
  templateUrl: './staff-tv-setup-page.component.html',
  styleUrl: './staff-tv-setup-page.component.css'
})
export class StaffTvSetupPageComponent {
  readonly authStore = inject(AuthStore);
  readonly routes = APP_ROUTES;

  activeStep: SetupStep | null = null;

  openModal(step: SetupStep): void {
    this.activeStep = step;
    document.body.style.overflow = 'hidden';
  }

  closeModal(): void {
    this.activeStep = null;
    document.body.style.overflow = '';
  }

  @HostListener('keydown.escape')
  onEscape(): void {
    this.closeModal();
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
        'Abre Ticketbarber en la tablet del negocio e inicia sesión con tu cuenta de barbero para acceder al panel de gestión de turnos.',
      imageLabel: 'Imagen del paso 1',
      imageHint: 'Sustituir por una captura del login staff en la tablet.',
      imageSrc: 'assets/1.png',
      detail: {
        body: 'Antes de poner en marcha la pantalla TV, necesitas tener acceso al panel de barberos desde tu tablet o móvil. Desde ahí controlarás los turnos en tiempo real mientras la TV los muestra automáticamente a tus clientes.',
        subSteps: [
          '1.1  Abre el navegador (Chrome recomendado) en tu tablet o móvil.',
          '1.2  Ve a la URL de Ticketbarber e introduce tu email y contraseña.',
          '1.3  Pulsa "Iniciar sesión" y espera a que cargue el panel de barberos.',
          '1.4  Comprueba que ves el listado de turnos — eso significa que todo está correcto.'
        ],
        warning: 'Asegúrate de iniciar sesión con la cuenta de barbero.',
        tip: 'Guarda la URL en favoritos de la tablet para abrirla más rápido cada día.'
      }
    },
    {
      number: '02',
      title: 'Abre el navegador en la TV',
      description:
        'En la televisión o dispositivo conectado, abre Chrome o el navegador disponible. No hace falta instalar nada extra.',
      imageLabel: 'Imagen del paso 2',
      imageHint: 'Sustituir por una captura del navegador abierto en la TV.',
      imageSrc: 'assets/2.png',
      detail: {
        body: 'La TV solo necesita un navegador web, sin instalar ninguna app adicional. Funciona con cualquier smart TV, Chromecast, Fire TV Stick o cualquier dispositivo conectado a la pantalla.',
        subSteps: [
          '2.1  Enciende la TV y selecciona la entrada correcta (HDMI, Chromecast, etc.).',
          '2.2  Localiza el navegador web del sistema (Chrome, Silk Browser, etc.).',
          '2.3  Ábrelo y comprueba que tienes conexión a internet.',
          '2.4  Si el navegador pide actualización, acéptala antes de continuar.'
        ],
        warning: 'Comprueba que la TV tiene Wi-Fi o cable de red activo antes de continuar. Sin conexión, la vista no se actualizará.',
        tip: 'Chrome funciona mejor para mostrar la vista /tv sin problemas de compatibilidad.'
      }
    },
    {
      number: '03',
      title: 'Escribe el dominio de la app',
      description:
        'Con el navegador abierto en la TV, escribe directamente la URL de Ticketbarber en la barra de direcciones para acceder.',
      imageLabel: 'Imagen del paso 3',
      imageHint: 'Sustituir por una captura mostrando la URL de la app.',
      imageSrc: 'assets/4.png',
      detail: {
        body: 'Con el navegador abierto en la TV, accede a Ticketbarber escribiendo la dirección directamente. No necesitas buscar nada en Google — solo escribir la URL exacta para llegar más rápido.',
        subSteps: [
          '3.1  Haz clic en la barra de direcciones del navegador.',
          '3.2  Escribe el dominio completo de Ticketbarber (sin espacios ni errores).',
          '3.3  Pulsa Enter o el botón de ir del teclado.',
          '3.4  Espera a que cargue la página de inicio de la aplicación.'
        ],
        warning: 'No busques en Google — escribe la URL directamente en la barra de direcciones para evitar entrar en páginas equivocadas.',
        tip: 'Puedes usar un teclado Bluetooth conectado a la TV para escribir con más comodidad.'
      }
    },
    {
      number: '04',
      title: 'Accede a la vista TV',
      description:
        'Con sesión iniciada en la app, abre la pantalla TV desde el panel de barbero. Solo los barberos con sesión activa pueden verla.',
      imageLabel: 'Imagen del paso 4',
      imageHint: 'Sustituir por una captura con la ruta /tv visible.',
      imageSrc: 'assets/5.png',
      detail: {
        body: 'La vista TV solo está disponible para barberos con sesión iniciada. Una vez que hayas accedido a la app con tu cuenta, tienes dos formas de llegar a ella:',
        subSteps: [
          '4.1  Opción A — Desde el panel: al iniciar sesión la app te lleva al panel de barbero. Pulsa el botón "Vista TV" o "TV" que encontrarás ahí.',
          '4.2  Opción B — Desde la URL: en la barra de direcciones escribe la URL de la app seguida de /tv y pulsa Enter.',
          '4.3  Si has iniciado sesión, la app te redirigirá a la pantalla automáticamente.',
        ],
        warning: 'La vista /tv requiere sesión iniciada con cuenta de barbero. Sin login, la app redirigirá al inicio de sesión.',
        tip: 'Guarda la URL de /tv en favoritos de la TV. Si la sesión sigue activa al día siguiente, entrará directamente sin tener que logarse de nuevo.'
      }
    },
    {
      number: '05',
      title: 'Deja la pantalla lista para clientes',
      description:
        'Activa la pantalla completa, comprueba que los turnos se ven bien desde la sala y deja la TV encendida durante todo el horario.',
      imageLabel: 'Imagen del paso 5',
      imageHint: 'Sustituir por una captura final de la vista TV funcionando.',
      imageSrc: 'assets/3.png',
      detail: {
        body: 'Ya tienes todo en marcha. Solo queda ajustar la pantalla para que los clientes lo vean perfectamente desde cualquier punto de la sala y dejar la TV funcionando sin tocarla durante el día.',
        subSteps: [
          '5.1  Busca la opción "Pantalla completa" en el menú del navegador.',
          '5.2  Comprueba desde la sala de espera que los turnos se leen con claridad.',
          '5.3  Ajusta el brillo de la TV si la imagen aparece demasiado oscura o intensa.',
          '5.4  Deja la pantalla encendida durante todo el horario de apertura del negocio, pon un temporizador en su TV si fuese necesario.'
        ],
        tip: 'Si la TV se apaga sola pasado un rato, entra en los ajustes de la TV y desactiva el modo de ahorro de energía o apagado automático.'
      }
    }
  ];

  readonly tips: string[] = [
    'Activa el modo pantalla completa para que la información se vea mejor desde lejos.',
    'Guarda la URL completa de la pantalla TV en favoritos para abrirla más rápido cada día.',
    'Comprueba la conexión Wi-Fi antes de abrir la vista /tv para evitar cortes.',
    'Si necesitas cambiar turnos o revisar la cola, vuelve al panel de barberos desde la tablet.'
  ];

  get secondaryCtaLabel(): string {
    return this.authStore.isAuthenticated() ? 'Volver al panel' : 'Conocer precios';
  }

  get secondaryCtaLink(): string {
    return this.authStore.isAuthenticated() ? this.routes.staff.root : this.routes.pricing;
  }
}
