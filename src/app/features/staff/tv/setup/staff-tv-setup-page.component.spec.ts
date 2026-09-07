jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { StaffTvSetupPageComponent } from './staff-tv-setup-page.component';
import { AuthStore } from '../../../../core/stores/auth.store';
import { SubscriptionStore } from '../../../../core/stores/subscription.store';

const mockAuthStore = { user: signal<any>({ uid: 'shop-1' }), isAuthenticated: signal(true), signOut: jest.fn() };
const mockSubscriptionStore = { subscriptionStatus: signal('active' as any), trialDaysLeft: signal(0) };

const STEP_NO_IMAGE = { number: '01', title: 'Paso 1', description: 'Desc', imageLabel: 'img', imageHint: 'hint', detail: { body: 'body', subSteps: [] } } as any;
const STEP_WITH_IMAGE = { ...STEP_NO_IMAGE, imageSrc: '/assets/screen.png' };

describe('StaffTvSetupPageComponent', () => {
  let component: StaffTvSetupPageComponent;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StaffTvSetupPageComponent],
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: mockAuthStore },
        { provide: SubscriptionStore, useValue: mockSubscriptionStore }
      ]
    });
    const fixture = TestBed.createComponent(StaffTvSetupPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('step navigation', () => {
    it('selects a step directly and exposes its progress', () => {
      component.selectStep(2);
      expect(component.activeStepIndex).toBe(2);
      expect(component.activeStep).toEqual(component.steps[2]);
      expect(component.progressLabel).toBe('Paso 3 de 5');
    });

    it('keeps navigation within the first and last step', () => {
      component.previousStep();
      expect(component.activeStepIndex).toBe(0);
      component.selectStep(99);
      expect(component.activeStepIndex).toBe(component.steps.length - 1);
      component.nextStep();
      expect(component.activeStepIndex).toBe(component.steps.length - 1);
    });

    it('moves forward one step', () => {
      component.nextStep();
      expect(component.activeStepIndex).toBe(1);
    });

    it('navigates to the authenticated completion CTA from the last step', () => {
      const navigateByUrl = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
      component.selectStep(component.steps.length - 1);
      component.nextStep();
      expect(navigateByUrl).toHaveBeenCalledWith('/tv/pair');
    });

    it('uses registration as the completion CTA for a visitor', () => {
      mockAuthStore.isAuthenticated.set(false);
      expect(component.primaryCtaLink).toBe('/staff/register');
      expect(component.primaryCtaLabel).toBe('Crear cuenta gratuita');
      mockAuthStore.isAuthenticated.set(true);
    });
  });

  describe('openImageModal / closeImageModal', () => {
    it('sets activeImageStep when step has imageSrc', () => {
      component.openImageModal(STEP_WITH_IMAGE);
      expect(component.activeImageStep).toEqual(STEP_WITH_IMAGE);
    });

    it('does not set activeImageStep when step has no imageSrc', () => {
      component.openImageModal(STEP_NO_IMAGE);
      expect(component.activeImageStep).toBeNull();
    });

    it('clears activeImageStep when closing', () => {
      component.openImageModal(STEP_WITH_IMAGE);
      component.closeImageModal();
      expect(component.activeImageStep).toBeNull();
    });
  });

  describe('onEscape', () => {
    it('closes the image modal with Escape', () => {
      component.openImageModal(STEP_WITH_IMAGE);
      component.onEscape();
      expect(component.activeImageStep).toBeNull();
    });

    it('is a no-op when no modals are open', () => {
      expect(() => component.onEscape()).not.toThrow();
    });
  });
});
