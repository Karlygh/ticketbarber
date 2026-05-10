import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ModernExperienceFeature,
  ModernExperienceFloatingCard,
  ModernExperienceKpi,
  ModernExperienceSectionComponent
} from './components/modern-experience-section.component';
import { AuthStore } from '../../core/stores/auth.store';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

interface HeroMetric {
  value: string;
  label: string;
}

interface QuickBenefit {
  title: string;
  description: string;
}

interface ToolFeature {
  title: string;
  description: string;
}

interface Testimonial {
  business: string;
  location: string;
  quote: string;
  image: string;
}

interface StartStep {
  number: string;
  title: string;
  description: string;
}

interface HomeFaq {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, HeaderComponent, ModernExperienceSectionComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit, OnDestroy {
  readonly authStore = inject(AuthStore);
  readonly currentYear = new Date().getFullYear();

  readonly heroMetrics: HeroMetric[] = [
    { value: '+2,500', label: 'Clientes confían' },
    { value: '4.9/5', label: 'Valoracion de usuarios' }
  ];

  readonly quickBenefits: QuickBenefit[] = [
    { title: 'Menos esperas', description: 'Clientes mas satisfechos' },
    { title: 'Mas organizacion', description: 'Equipo y procesos al dia' },
    { title: 'Mas clientes felices', description: 'Mejores resenas y recomendaciones' },
    { title: 'Mas crecimiento', description: 'Enfocate en lo que importa' }
  ];

  readonly experienceKicker = 'Experiencia moderna para tus clientes';
  readonly experienceHeadline = 'Tus clientes saben exactamente';
  readonly experienceSubheadline = 'cuando les toca.';
  readonly experienceDescription =
    'Una experiencia simple, rapida y profesional para organizar turnos, mejorar la espera y transmitir confianza en todo momento.';

  readonly experienceFeatures: ModernExperienceFeature[] = [
    { title: 'Sin instalaciones', description: 'Funciona 100% en la nube desde TV, tablet, movil o PC.' },
    { title: 'Clientes autogeneran tickets', description: 'El cliente toma su turno y ve su posicion en tiempo real.' },
    { title: 'MULTI-Barberos', description: 'Todo tu equipo en un solo sistema con colas y tiempos sincronizados.' }
  ];

  readonly experienceFloatingCards: ModernExperienceFloatingCard[] = [
    { title: 'Ticket activo', value: 'Carlos', detail: 'Corte clasico · 5 min', tone: 'blue', slot: 'left-top' },
    { title: 'En espera', value: '5 clientes', detail: 'Antes de ti', tone: 'blue', slot: 'left-bottom' },
    { title: 'Resumen del dia', value: '23', detail: 'Turnos completados', tone: 'blue', slot: 'right-top' },
    { title: '+12 clientes hoy', value: '8 min', detail: 'Tiempo medio de atencion', tone: 'blue', slot: 'right-mid' },
    { title: 'Turno llamado', value: 'Carlos', detail: 'Puesto 2 · ahora', tone: 'green', slot: 'right-bottom' }
  ];

  readonly experienceKpis: ModernExperienceKpi[] = [
    { value: '+2,500', label: 'Tickets generados esta semana' },
    { value: '98%', label: 'Clientes satisfechos' },
    { value: '-35%', label: 'Menos tiempo de espera' },
    { value: '4.9 / 5', label: 'Calificacion promedio' }
  ];

  readonly toolFeatures: ToolFeature[] = [
    {
      title: 'Gestion de turnos',
      description: 'Organiza tu dia, evita aglomeraciones y tiempos muertos.'
    },
    {
      title: 'Estadisticas y reportes',
      description: 'Conoce tus horas pico, servicios mas pedidos y rendimiento del equipo.'
    },
    {
      title: 'Gestion de clientes',
      description: 'Historial de visitas, servicios realizados y preferencias.'
    },
    {
      title: 'Multi-sucursal',
      description: 'Administra todas tus sucursales desde un solo lugar.'
    }
  ];

  readonly testimonials: Testimonial[] = [
    {
      business: 'The Classic Cut',
      location: 'Alicante',
      quote:
        'Desde que usamos TicketBarber, nuestros clientes esperan menos y estan mas felices. Nos ayudo a organizarnos y a profesionalizar nuestro servicio.',
      image: '/assets/empresa1.jpg'
    },
    {
      business: 'Barberia Norte',
      location: 'Madrid',
      quote:
        'Ahora el equipo trabaja con mucha mas claridad. La cola se entiende, el cliente confia y el local transmite otro nivel.',
      image: '/assets/empresa2.jpg'
    },
    {
      business: 'Distrito Fade',
      location: 'Oviedo',
      quote:
        'La sensacion de orden se nota desde la entrada. TicketBarber nos ayudo a mejorar operacion y experiencia sin complicar al staff.',
      image: '/assets/empresa3.jpg'
    }
  ];

  readonly startSteps: StartStep[] = [
    {
      number: '1',
      title: 'Crea tu cuenta',
      description: 'Registrate en minutos y configura tu barberia.'
    },
    {
      number: '2',
      title: 'Invita a tu equipo',
      description: 'Agrega a tus barberos y define servicio y horarios.'
    },
    {
      number: '3',
      title: 'Listo!',
      description: 'Empieza a recibir clientes y optimiza tu dia.'
    }
  ];

  readonly faqs: HomeFaq[] = [
    {
      question: 'Cuanto cuesta usar TicketBarber?',
      answer: 'Puedes empezar con una prueba gratis de 7 dias y despues elegir el plan que mejor encaje con tu barberia.'
    },
    {
      question: 'Necesito instalar algo en mi local?',
      answer: 'No. TicketBarber funciona en la nube y esta pensado para que empieces rapido sin instalaciones complicadas desde cualquier dispositivo.'
    },
    {
      question: 'Mis clientes necesitan descargar la app?',
      answer: 'No solo tienes que entrar en ticketbarber y vincular tu cuenta con la tv donde quieres mostrar la cola de clientes. Ofrecer acceso simple a la fila y al estado de turnos.'
    },
    {
      question: 'Puedo cancelar en cualquier momento?',
      answer: 'Si. La idea es que pruebes con libertad y decidas si te aporta valor real antes de comprometerte.'
    }
  ];

  activeFaqIndex = 0;
  testimonialIndex = 0;
  private testimonialTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startTestimonialAutoplay();
  }

  ngOnDestroy(): void {
    this.clearTestimonialAutoplay();
  }

  selectFaq(index: number): void {
    this.activeFaqIndex = this.activeFaqIndex === index ? -1 : index;
  }

  prevTestimonial(): void {
    this.testimonialIndex =
      (this.testimonialIndex - 1 + this.testimonials.length) % this.testimonials.length;
    this.resetTestimonialAutoplay();
  }

  nextTestimonial(): void {
    this.testimonialIndex = (this.testimonialIndex + 1) % this.testimonials.length;
    this.resetTestimonialAutoplay();
  }

  goToTestimonial(index: number): void {
    this.testimonialIndex = index;
    this.resetTestimonialAutoplay();
  }

  private startTestimonialAutoplay(): void {
    this.testimonialTimer = setInterval(() => {
      this.testimonialIndex = (this.testimonialIndex + 1) % this.testimonials.length;
    }, 5500);
  }

  private clearTestimonialAutoplay(): void {
    if (this.testimonialTimer !== null) {
      clearInterval(this.testimonialTimer);
      this.testimonialTimer = null;
    }
  }

  private resetTestimonialAutoplay(): void {
    this.clearTestimonialAutoplay();
    this.startTestimonialAutoplay();
  }
}
