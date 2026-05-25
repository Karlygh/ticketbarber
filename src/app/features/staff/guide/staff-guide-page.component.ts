import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, HostListener, inject, NgZone, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { StaffBarbersPageComponent } from '../barbers/staff-barbers-page.component';
import { StaffPageComponent } from '../dashboard/staff-page.component';
import { STAFF_GUIDE_STEPS, StaffGuidePlacement, StaffGuideStep } from './staff-guide-tour';

type GuideRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
};

type GuideCardStyle = Record<string, string>;

@Component({
  selector: 'app-staff-guide-page',
  standalone: true,
  imports: [CommonModule, StaffPageComponent, StaffBarbersPageComponent],
  templateUrl: './staff-guide-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './staff-guide-page.component.css'
})
export class StaffGuidePageComponent implements AfterViewInit {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly zone = inject(NgZone);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly sanitizer = inject(DomSanitizer);

  readonly steps = STAFF_GUIDE_STEPS;
  readonly currentIndex = signal(0);
  readonly spotlightRect = signal<GuideRect | null>(null);
  readonly targetMissing = signal(false);
  readonly cardStyle = signal<GuideCardStyle>({});

  readonly currentStep = computed<StaffGuideStep>(() => this.steps[this.currentIndex()]);
  readonly currentView = computed(() => this.currentStep().view);
  readonly isFirstStep = computed(() => this.currentIndex() === 0);
  readonly isLastStep = computed(() => this.currentIndex() === this.steps.length - 1);
  readonly progressLabel = computed(() => `${this.currentIndex() + 1} / ${this.steps.length}`);
  readonly resolvedBody = computed(() => {
    const step = this.currentStep();
    if (this.targetMissing() && step.missingBody) {
      return step.missingBody;
    }
    return step.body;
  });
  readonly resolvedBodyHtml = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.toRichText(this.resolvedBody()))
  );

  constructor() {
    effect(() => {
      this.currentStep();
      this.zone.runOutsideAngular(() => {
        window.setTimeout(() => this.refreshSpotlight(), 80);
      });
    });
  }

  ngAfterViewInit(): void {
    this.refreshSpotlight();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.refreshSpotlight();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    this.refreshSpotlight(false);
  }

  previousStep(): void {
    if (this.isFirstStep()) {
      return;
    }
    this.currentIndex.update((value) => Math.max(0, value - 1));
  }

  nextStep(): void {
    if (this.isLastStep()) {
      void this.finishGuide();
      return;
    }
    this.currentIndex.update((value) => Math.min(this.steps.length - 1, value + 1));
  }

  closeGuide(): void {
    void this.router.navigateByUrl('/staff');
  }

  finishGuide(): Promise<boolean> {
    return this.router.navigateByUrl('/staff');
  }

  private refreshSpotlight(allowScroll = true): void {
    const step = this.currentStep();
    const targetId = step.targetId;
    if (!targetId) {
      this.targetMissing.set(true);
      this.spotlightRect.set(null);
      this.cardStyle.set(this.buildCardStyle(step.placement, null));
      this.cdr.markForCheck();
      return;
    }

    const selector = `[data-guide-id="${targetId}"]`;
    const element = this.document.querySelector(selector) as HTMLElement | null;

    if (!element) {
      this.targetMissing.set(true);
      this.spotlightRect.set(null);
      this.cardStyle.set(this.buildCardStyle(step.placement, null));
      this.cdr.markForCheck();
      return;
    }

    if (allowScroll) {
      element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    }

    this.zone.runOutsideAngular(() => {
      window.setTimeout(() => {
        const rect = element.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          this.zone.run(() => {
            this.targetMissing.set(true);
            this.spotlightRect.set(null);
            this.cardStyle.set(this.buildCardStyle(step.placement, null));
            this.cdr.markForCheck();
          });
          return;
        }

        const paddedRect: GuideRect = {
          top: Math.max(12, rect.top - 12),
          left: Math.max(12, rect.left - 12),
          width: rect.width + 24,
          height: rect.height + 24,
          right: Math.min(window.innerWidth - 12, rect.right + 12),
          bottom: Math.min(window.innerHeight - 12, rect.bottom + 12)
        };

        paddedRect.width = Math.max(0, paddedRect.right - paddedRect.left);
        paddedRect.height = Math.max(0, paddedRect.bottom - paddedRect.top);

        this.zone.run(() => {
          this.targetMissing.set(false);
          this.spotlightRect.set(paddedRect);
          this.cardStyle.set(this.buildCardStyle(step.placement, paddedRect));
          this.cdr.markForCheck();
        });
      }, allowScroll ? 240 : 0);
    });
  }

  private buildCardStyle(placement: StaffGuidePlacement, rect: GuideRect | null): GuideCardStyle {
    const margin = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.min(380, viewportWidth - 24);
    const style: GuideCardStyle = {
      maxWidth: `${maxWidth}px`
    };

    if (!rect || placement === 'center' || viewportWidth < 860) {
      style['top'] = '50%';
      style['left'] = '50%';
      style['transform'] = 'translate(-50%, -50%)';
      return style;
    }

    const estimatedCardWidth = maxWidth;
    const estimatedCardHeight = 260;
    let top = rect.top;
    let left = rect.left;

    if (placement === 'right') {
      top = rect.top + rect.height / 2 - estimatedCardHeight / 2;
      left = rect.right + margin;
    } else if (placement === 'left') {
      top = rect.top + rect.height / 2 - estimatedCardHeight / 2;
      left = rect.left - estimatedCardWidth - margin;
    } else if (placement === 'top') {
      top = rect.top - estimatedCardHeight - margin;
      left = rect.left + rect.width / 2 - estimatedCardWidth / 2;
    } else {
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2 - estimatedCardWidth / 2;
    }

    const clampedTop = Math.min(
      Math.max(12, top),
      Math.max(12, viewportHeight - estimatedCardHeight - 12)
    );
    const clampedLeft = Math.min(
      Math.max(12, left),
      Math.max(12, viewportWidth - estimatedCardWidth - 12)
    );

    style['top'] = `${clampedTop}px`;
    style['left'] = `${clampedLeft}px`;
    return style;
  }

  private toRichText(text: string): string {
    return text.replace(/\*\*(.+?)\*\*/g, '<strong class="guide-highlight">$1</strong>');
  }
}

