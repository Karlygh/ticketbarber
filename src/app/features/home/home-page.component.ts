import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
  inject
} from '@angular/core';
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
export class HomePageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly authStore = inject(AuthStore);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly currentYear = new Date().getFullYear();
  @ViewChildren('revealSection') private revealSections!: QueryList<ElementRef<HTMLElement>>;

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
    question: '¿Cómo utilizarás TicketBarber?',
    answer: 'Cada vez que abras tu jornada, entrarás en tu panel de staff y seleccionarás los barberos que estarán activos ese día. Automáticamente, esos barberos aparecerán en la pantalla de la TV junto con la cola de clientes y el estado de los turnos en tiempo real.'
    },
    {
    question: '¿Necesito instalar algo en mi local?',
    answer: 'Sí, pero muy poca cosa. TicketBarber funciona en la nube, así que no necesitas instalaciones complicadas ni equipos especiales. Solo necesitarías una TV o pantalla donde quieras mostrar la cola de clientes, por ejemplo en la zona de espera, y una tablet, móvil u ordenador para usarlo en recepción y gestionar los tickets, clientes y turnos. Con eso ya podrías empezar a usar TicketBarber desde cualquier dispositivo con conexión a internet.'
    },
    {
    question: '¿Mis clientes necesitan descargar la app?',
    answer: 'No. Tus clientes no necesitan descargar nada. TicketBarber está pensado para peluquerías, barberías y profesionales autónomos que quieren gestionar la cola de clientes de forma sencilla. Solo tú accedes a la plataforma para vincular tu cuenta con la TV donde quieras mostrar la cola y gestionar los turnos desde recepción.'
    },
   {
  question: '¿Cuánto tardo en configurar TicketBarber para mi peluquería?',
  answer: 'En unos 5 minutos puedes tener TicketBarber listo para usar. Solo tienes que registrarte, configurar los datos de tu peluquería y tus barberos, y vincular tu teléfono con la TV mediante un código. Después de eso, ya podrás empezar a gestionar la cola de clientes y disfrutar de TicketBarber.'
},
  ];

  activeFaqIndex = 0;
  testimonialIndex = 0;
  previousTestimonialIndex = 0;
  isTestimonialAnimating = false;
  heroReady = false;
  revealVisibility: Record<string, boolean> = {};
  reducedMotion = false;
  isMobileMotion = false;
  parallaxOffsetY = 0;
  private mediaReduceQuery: MediaQueryList | null = null;
  private mediaMobileQuery: MediaQueryList | null = null;
  private revealObserver: IntersectionObserver | null = null;
  private parallaxTicking = false;
  private testimonialTimer: ReturnType<typeof setInterval> | null = null;
  private testimonialAnimTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onReduceMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches;
    this.cdr.markForCheck();
  };
  private readonly onMobileMotionChange = (event: MediaQueryListEvent): void => {
    this.isMobileMotion = event.matches;
    this.cdr.markForCheck();
  };

  ngOnInit(): void {
    if (typeof window !== 'undefined') {
      this.mediaReduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.mediaMobileQuery = window.matchMedia('(max-width: 860px)');
      this.reducedMotion = this.mediaReduceQuery.matches;
      this.isMobileMotion = this.mediaMobileQuery.matches;
      this.mediaReduceQuery.addEventListener('change', this.onReduceMotionChange);
      this.mediaMobileQuery.addEventListener('change', this.onMobileMotionChange);
    }

    this.startTestimonialAutoplay();

    if (!this.reducedMotion) {
      setTimeout(() => {
        this.heroReady = true;
        this.cdr.markForCheck();
      }, 80);
    } else {
      this.heroReady = true;
    }
  }

  ngAfterViewInit(): void {
    this.setupRevealObserver();
  }

  ngOnDestroy(): void {
    this.clearTestimonialAutoplay();
    this.clearTestimonialAnimation();
    this.revealObserver?.disconnect();

    this.mediaReduceQuery?.removeEventListener('change', this.onReduceMotionChange);
    this.mediaMobileQuery?.removeEventListener('change', this.onMobileMotionChange);
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.reducedMotion || this.isMobileMotion || this.parallaxTicking) {
      return;
    }

    this.parallaxTicking = true;
    requestAnimationFrame(() => {
      const y = typeof window !== 'undefined' ? window.scrollY : 0;
      this.parallaxOffsetY = Math.max(-20, Math.min(20, y * 0.03));
      this.parallaxTicking = false;
      this.cdr.markForCheck();
    });
  }

  selectFaq(index: number): void {
    this.activeFaqIndex = this.activeFaqIndex === index ? -1 : index;
  }

  prevTestimonial(): void {
    this.previousTestimonialIndex = this.testimonialIndex;
    this.testimonialIndex = (this.testimonialIndex - 1 + this.testimonials.length) % this.testimonials.length;
    this.triggerTestimonialAnimation();
    this.resetTestimonialAutoplay();
  }

  nextTestimonial(): void {
    this.previousTestimonialIndex = this.testimonialIndex;
    this.testimonialIndex = (this.testimonialIndex + 1) % this.testimonials.length;
    this.triggerTestimonialAnimation();
    this.resetTestimonialAutoplay();
  }

  goToTestimonial(index: number): void {
    this.previousTestimonialIndex = this.testimonialIndex;
    this.testimonialIndex = index;
    this.triggerTestimonialAnimation();
    this.resetTestimonialAutoplay();
  }

  getFaqContentId(index: number): string {
    return `faq-content-${index}`;
  }

  shouldReveal(id: string): boolean {
    return this.reducedMotion || !!this.revealVisibility[id];
  }

  private setupRevealObserver(): void {
    if (this.reducedMotion || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      for (const section of this.revealSections.toArray()) {
        const id = section.nativeElement.dataset['revealId'];
        if (id) {
          this.revealVisibility[id] = true;
        }
      }
      this.cdr.markForCheck();
      return;
    }

    this.revealObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const element = entry.target as HTMLElement;
          const id = element.dataset['revealId'];
          if (!id) {
            continue;
          }

          this.revealVisibility[id] = true;
          this.revealObserver?.unobserve(element);
        }

        this.cdr.markForCheck();
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );

    for (const section of this.revealSections.toArray()) {
      this.revealObserver.observe(section.nativeElement);
    }
  }

  private triggerTestimonialAnimation(): void {
    if (this.reducedMotion) {
      this.isTestimonialAnimating = false;
      return;
    }

    this.isTestimonialAnimating = true;
    this.clearTestimonialAnimation();
    this.testimonialAnimTimer = setTimeout(() => {
      this.isTestimonialAnimating = false;
      this.cdr.markForCheck();
    }, 460);
  }

  private clearTestimonialAnimation(): void {
    if (this.testimonialAnimTimer !== null) {
      clearTimeout(this.testimonialAnimTimer);
      this.testimonialAnimTimer = null;
    }
  }

  private startTestimonialAutoplay(): void {
    this.testimonialTimer = setInterval(() => {
      this.previousTestimonialIndex = this.testimonialIndex;
      this.testimonialIndex = (this.testimonialIndex + 1) % this.testimonials.length;
      this.triggerTestimonialAnimation();
      this.cdr.markForCheck();
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
