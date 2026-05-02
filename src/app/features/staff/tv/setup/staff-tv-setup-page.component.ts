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
          '1.2  Ve a la URL oficial de Ticketbarber ',
          '1.3  Pulsa "Iniciar sesión" ,rellena tus credenciales y accede a tu cuenta de barbero.Si no tienes cuenta, regístrate primero para crearla.',
          '1.4  Cuando hayas iniciado sesión correctamente, podrás acceder al panel de gestión de turnos.'
        ],
        warning: 'Asegúrate de iniciar sesión con la cuenta de barbero.',
        tip: 'Guarda la URL en favoritos de la tablet para abrirla más rápido cada día.'
      }
    },
    {
      number: '02',
      title: 'Abre el navegador en la TV',
      description:
        'En la televisión con el mando dirígete a "Ingresar codigo TV". No hace falta instalar nada extra.',
      imageLabel: 'Imagen del paso 2',
      imageHint: 'Sustituir por una captura del navegador abierto en la TV.',
      imageSrc: 'assets/2.png',
      detail: {
        body: 'La TV solo necesita un navegador web, sin instalar ninguna app adicional. Funciona con cualquier smart TV, Chromecast, Fire TV Stick o cualquier dispositivo conectado a la pantalla.',
        subSteps: [
          '2.1  Enciende la TV y selecciona la entrada correcta (HDMI, TV, Chromecast, Fire TV Stick, etc.).',
          '2.2  Localiza el navegador web del sistema (Chrome, Silk Browser, etc.).',
          '2.3  Ábrelo y comprueba que tienes conexión a internet.Si no tienes internet debes de activarlo antes de realizar este paso.',
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
      title: 'Genera el código desde tu móvil',
      description:
        'Con sesión iniciada en Ticketbarber, abre la opción Vincular TV desde el navbar para generar un código temporal para la TV.',
      imageLabel: 'Imagen del paso 4',
      imageHint: 'Sustituir por una captura de la pantalla Vincular TV con el código visible.',
      imageSrc: 'assets/5.png',
      detail: {
        body: 'El código de vinculación se genera desde la cuenta del barbero y dura 15 minutos. Mientras siga activo, volverás a ver ese mismo código al entrar en la pantalla de Vincular TV.',
        subSteps: [
          '4.1  Inicia sesión con la cuenta del negocio desde tu móvil, tablet o portátil.',
          '4.2  En el navbar pulsa "Vincular TV".',
          '4.3  Puedes generar un nuevo código o visualizar el código activo si ya lo generaste antes. Copia el código de 6 dígitos para introducirlo en la TV.',
          '4.4  Si lo necesitas, pulsa "Generar nuevo código" para invalidar el anterior y crear otro.'
        ],
        warning: 'No compartas un código caducado: cada código solo puede usarse una vez y expira automáticamente.',
        tip: 'Mantén esta pantalla abierta mientras configuras la TV para no perder de vista el contador.'
      }
    },
    {
      number: '05',
      title: 'Introduce el código en la TV y deja la pantalla lista',
      description:
        'En la TV abre /activate, introduce el código y, cuando termine la vinculación, deja la vista preparada para tus clientes.',
      imageLabel: 'Imagen del paso 5',
      imageHint: 'Sustituir por una captura final de la vista TV funcionando.',
      imageSrc: 'assets/5.png',
      detail: {
        body: 'La TV no necesita iniciar sesión. Solo tienes que abrir la pantalla pública de activación, escribir el código y esperar a que se abra automáticamente la cola de turnos.',
        subSteps: [
          '5.1  En la TV escribe la URL de la app seguida de /activate y pulsa Enter.',
          '5.2  Introduce el código de 6 dígitos que generaste desde tu cuenta.',
          '5.3  Espera a que la TV confirme la vinculación y cargue la cola en tiempo real.',
          '5.4  Activa pantalla completa y comprueba desde la sala que los turnos se leen bien.'
        ],
        tip: 'Si la TV se apaga sola pasado un rato, entra en los ajustes de la TV y desactiva el modo de ahorro de energía o apagado automático.'
      }
    }
  ];

  readonly tips: string[] = [
    'Activa el modo pantalla completa para que la información se vea mejor desde lejos.',
    'Guarda /activate en favoritos de la TV para volver a vincularla rápidamente si hace falta.',
    'Comprueba la conexión Wi-Fi antes de introducir el código para evitar cortes.',
    'Si necesitas cambiar turnos o revisar la cola, vuelve al panel de barberos desde la tablet.'
  ];

  get secondaryCtaLabel(): string {
    return this.authStore.isAuthenticated() ? 'Volver al panel' : 'Conocer precios';
  }

  get secondaryCtaLink(): string {
    return this.authStore.isAuthenticated() ? this.routes.staff.root : this.routes.pricing;
  }
}
