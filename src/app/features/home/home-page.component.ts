import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthStore } from '../../core/stores/auth.store';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { HeaderComponent } from '../../shared/components/header/header.component';

interface HomeBenefit {
  title: string;
  description: string;
  metric: string;
}

interface HomeStep {
  step: string;
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

  // ── Carousel ────────────────────────────────────────────────────────────────
  readonly carouselImages = [
    'assets/app-1.jpg',
    'assets/app-2.jpg',
    'assets/turnoespera.png',
    'assets/5.png',
  ];

  currentIndex = 0;
  slideDirection: 'next' | 'prev' = 'next';
  isAnimating = false;
  private autoplayTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.clearAutoplay();
  }

  nextSlide(): void {
    if (this.isAnimating) return;
    this.slideDirection = 'next';
    this.triggerSlide((this.currentIndex + 1) % this.carouselImages.length);
    this.resetAutoplay();
  }

  prevSlide(): void {
    if (this.isAnimating) return;
    this.slideDirection = 'prev';
    this.triggerSlide((this.currentIndex - 1 + this.carouselImages.length) % this.carouselImages.length);
    this.resetAutoplay();
  }

  goTo(index: number): void {
    if (this.isAnimating || index === this.currentIndex) return;
    this.slideDirection = index > this.currentIndex ? 'next' : 'prev';
    this.triggerSlide(index);
    this.resetAutoplay();
  }

  private triggerSlide(nextIndex: number): void {
    this.isAnimating = true;
    this.currentIndex = nextIndex;
    setTimeout(() => { this.isAnimating = false; }, 450);
  }

  private startAutoplay(): void {
    this.autoplayTimer = setInterval(() => this.nextSlide(), 5000);
  }

  private clearAutoplay(): void {
    if (this.autoplayTimer !== null) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  private resetAutoplay(): void {
    this.clearAutoplay();
    this.startAutoplay();
  }
  // ────────────────────────────────────────────────────────────────────────────

  readonly benefits: HomeBenefit[] = [
    {
      title: 'Experiencia premium para cada cliente',
      description: 'Tus clientes saben cuando les toca y perciben orden desde que entran en la barberia.',
      metric: 'Menos incertidumbre en sala de espera'
    },
    {
      title: 'Operacion diaria con menos friccion',
      description: 'El equipo avanza turnos en segundos sin depender de notas sueltas o mensajes cruzados.',
      metric: 'Flujo claro durante toda la jornada'
    },
    {
      title: 'Imagen de negocio moderno',
      description: 'Digitalizas la gestion sin complicar al staff y elevas la percepcion de calidad del local.',
      metric: 'Posicionamiento premium frente a competencia'
    }
  ];

  readonly flow: HomeStep[] = [
    {
      step: 'Paso 1',
      title: 'Activa tu espacio en minutos',
      description: 'Creas tu acceso, defines datos basicos y dejas la barberia lista para empezar en el mismo dia.'
    },
    {
      step: 'Paso 2',
      title: 'Abre jornada con un flujo claro',
      description: 'Tu equipo gestiona la cola desde un panel simple y los clientes ven el estado en tiempo real.'
    },
    {
      step: 'Paso 3',
      title: 'Consolida una rutina profesional',
      description: 'Cada dia trabajas con mas orden, menos interrupciones y mejor sensacion para el cliente final.'
    }
  ];

  readonly faqs: HomeFaq[] = [
    {
      question: 'Cuanto tarda implementar Ticketbarber en una barberia pequena?',
      answer: 'La activacion inicial esta pensada para hacerse rapido. En una primera sesion ya puedes operar con tu equipo.'
    },
    {
      question: 'Necesito conocimientos tecnicos para usarlo?',
      answer: 'No. El panel esta disenado para uso diario de staff, con flujo directo y curva de aprendizaje corta.'
    },
    {
      question: 'Que pasa si tengo dudas antes de pagar?',
      answer: 'Puedes contactar con el equipo desde el formulario y recibir respuesta personalizada para tu caso.'
    }
  ];
}
