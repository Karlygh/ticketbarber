import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface ModernExperienceFeature {
  title: string;
  description: string;
}

export type ModernExperienceFloatingTone = 'blue' | 'green';
export type ModernExperienceFloatingSlot =
  | 'left-top'
  | 'left-bottom'
  | 'right-top'
  | 'right-mid'
  | 'right-bottom';

export interface ModernExperienceFloatingCard {
  title: string;
  value: string;
  detail: string;
  tone: ModernExperienceFloatingTone;
  slot: ModernExperienceFloatingSlot;
}

export interface ModernExperienceKpi {
  value: string;
  label: string;
}

@Component({
  selector: 'app-modern-experience-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modern-experience-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './modern-experience-section.component.css'
})
export class ModernExperienceSectionComponent {
  @Input({ required: true }) kicker = '';
  @Input({ required: true }) headline = '';
  @Input({ required: true }) subheadline = '';
  @Input({ required: true }) description = '';
  @Input({ required: true }) features: ReadonlyArray<ModernExperienceFeature> = [];
  @Input({ required: true }) floatingCards: ReadonlyArray<ModernExperienceFloatingCard> = [];
  @Input({ required: true }) kpis: ReadonlyArray<ModernExperienceKpi> = [];

  cardClass(slot: ModernExperienceFloatingSlot, tone: ModernExperienceFloatingTone): string[] {
    return [`floating-card--${slot}`, `floating-card--${tone}`];
  }
}


