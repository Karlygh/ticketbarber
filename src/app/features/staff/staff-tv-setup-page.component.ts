import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

interface SetupStep {
  number: string;
  title: string;
  description: string;
  imageLabel: string;
  imageHint: string;
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

  readonly steps: SetupStep[] = [
    {
      number: '01',
      title: 'Inicia sesión en la tablet',
      description:
        'Abre Ticketbarber en la tablet del negocio e inicia sesión con la cuenta del barbero para tener acceso al panel staff.',
      imageLabel: 'Imagen del paso 1',
      imageHint: 'Sustituir por una captura del login staff en la tablet.'
    },
    {
      number: '02',
      title: 'Abre el navegador en la TV',
      description:
        'En la televisión o dispositivo conectado, abre Google Chrome o el navegador disponible para poder cargar la app.',
      imageLabel: 'Imagen del paso 2',
      imageHint: 'Sustituir por una captura del navegador abierto en la TV.'
    },
    {
      number: '03',
      title: 'Escribe el dominio de la app',
      description:
        'Busca o escribe directamente el dominio de Ticketbarber en la barra del navegador para acceder a la plataforma.',
      imageLabel: 'Imagen del paso 3',
      imageHint: 'Sustituir por una captura mostrando la URL de la app.'
    },
    {
      number: '04',
      title: 'Abre la ruta /tv',
      description:
        'Una vez dentro de la app, entra en la ruta /tv para mostrar la pantalla de turnos que verán los clientes en la barbería.',
      imageLabel: 'Imagen del paso 4',
      imageHint: 'Sustituir por una captura con la ruta /tv visible.'
    },
    {
      number: '05',
      title: 'Deja la pantalla lista para clientes',
      description:
        'Comprueba que se ven el turno actual y los siguientes clientes. A partir de ahí, deja la TV fija para acompañar la gestión diaria.',
      imageLabel: 'Imagen del paso 5',
      imageHint: 'Sustituir por una captura final de la vista TV funcionando.'
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
    return this.authStore.isAuthenticated() ? '/staff' : '/pricing';
  }
}
