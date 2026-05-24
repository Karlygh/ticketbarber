import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
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
import {
  HOME_EXPERIENCE_COPY,
  HOME_EXPERIENCE_FEATURES,
  HOME_EXPERIENCE_FLOATING_CARDS,
  HOME_EXPERIENCE_KPIS,
  HOME_FAQS,
  HOME_HERO_METRICS,
  HOME_QUICK_BENEFITS,
  HOME_START_STEPS,
  HOME_TESTIMONIALS,
  HOME_TOOL_FEATURES
} from './home-page.content';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FooterComponent, HeaderComponent, ModernExperienceSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly authStore = inject(AuthStore);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly currentYear = new Date().getFullYear();
  readonly homeVideoReady = false;
  @ViewChildren('revealSection') private revealSections!: QueryList<ElementRef<HTMLElement>>;

  readonly heroMetrics = HOME_HERO_METRICS;
  readonly quickBenefits = HOME_QUICK_BENEFITS;
  readonly experienceKicker = HOME_EXPERIENCE_COPY.kicker;
  readonly experienceHeadline = HOME_EXPERIENCE_COPY.headline;
  readonly experienceSubheadline = HOME_EXPERIENCE_COPY.subheadline;
  readonly experienceDescription = HOME_EXPERIENCE_COPY.description;
  readonly experienceFeatures = HOME_EXPERIENCE_FEATURES;
  readonly experienceFloatingCards = HOME_EXPERIENCE_FLOATING_CARDS;
  readonly experienceKpis = HOME_EXPERIENCE_KPIS;
  readonly toolFeatures = HOME_TOOL_FEATURES;
  readonly testimonials = HOME_TESTIMONIALS;
  readonly startSteps = HOME_START_STEPS;
  readonly faqs = HOME_FAQS;

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

  openHomeVideo(): void {
    if (!this.homeVideoReady) {
      return;
    }
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
