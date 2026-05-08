import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
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

interface ExperienceFeature {
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
  imports: [CommonModule, RouterLink, FooterComponent, HeaderComponent],
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

  readonly experienceFeatures: ExperienceFeature[] = [
    { title: 'Sin instalaciones', description: '100% en la nube, lista para usar.' },
    { title: 'Notificaciones en tiempo real', description: 'SMS o push cuando sea su turno.' },
    { title: 'Tu marca, tu estilo', description: 'Personaliza la app con tu logo y colores.' }
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
      location: 'CDMX',
      quote:
        'Desde que usamos TicketBarber, nuestros clientes esperan menos y estan mas felices. Nos ayudo a organizarnos y a profesionalizar nuestro servicio.'
    },
    {
      business: 'Barberia Norte',
      location: 'Madrid',
      quote:
        'Ahora el equipo trabaja con mucha mas claridad. La cola se entiende, el cliente confia y el local transmite otro nivel.'
    },
    {
      business: 'Distrito Fade',
      location: 'Barcelona',
      quote:
        'La sensacion de orden se nota desde la entrada. TicketBarber nos ayudo a mejorar operacion y experiencia sin complicar al staff.'
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
      answer: 'No. TicketBarber funciona en la nube y esta pensado para que empieces rapido sin instalaciones complicadas.'
    },
    {
      question: 'Mis clientes necesitan descargar la app?',
      answer: 'No siempre. Puedes adaptar la experiencia segun tu operativa y ofrecer acceso simple a la fila y al estado de turnos.'
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
