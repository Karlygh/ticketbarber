import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

interface HomeBenefit {
  title: string;
  description: string;
}

interface HomeStep {
  title: string;
  description: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, HeaderComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  readonly authStore = inject(AuthStore);
  readonly currentYear = new Date().getFullYear();

  readonly benefits: HomeBenefit[] = [
    {
      title: 'Cola sin caos',
      description: 'Gestiona turnos en segundos y evita listas improvisadas en papel o WhatsApp.'
    },
    {
      title: 'Pantalla en tiempo real',
      description: 'Muestra el turno actual y proximos clientes en TV para ordenar la espera.'
    },
    {
      title: 'Panel para staff',
      description: 'El barbero avanza turnos, corrige incidencias y controla la jornada desde un solo panel.'
    }
  ];

  readonly flow: HomeStep[] = [
    {
      title: '1. Inicia sesion',
      description: 'Accede con Google desde el panel de staff para activar tu espacio de trabajo.'
    },
    {
      title: '2. Abre jornada',
      description: 'Configura la cola del dia y deja listo el flujo para clientes y pantalla TV.'
    },
    {
      title: '3. Atiende con orden',
      description: 'Avanza turnos al instante y manten visibilidad total de la cola durante todo el dia.'
    }
  ];
}
