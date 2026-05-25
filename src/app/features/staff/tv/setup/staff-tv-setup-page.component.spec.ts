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
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('openModal / closeModal', () => {
    it('sets activeStep when opening', () => {
      component.openModal(STEP_NO_IMAGE);
      expect(component.activeStep).toEqual(STEP_NO_IMAGE);
    });

    it('clears activeStep when closing', () => {
      component.openModal(STEP_NO_IMAGE);
      component.closeModal();
      expect(component.activeStep).toBeNull();
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
    it('closes image modal first when both are open', () => {
      component.openModal(STEP_NO_IMAGE);
      component.openImageModal(STEP_WITH_IMAGE);
      component.onEscape();
      expect(component.activeImageStep).toBeNull();
      expect(component.activeStep).toEqual(STEP_NO_IMAGE);
    });

    it('closes step modal when only step modal is open', () => {
      component.openModal(STEP_NO_IMAGE);
      component.onEscape();
      expect(component.activeStep).toBeNull();
    });

    it('is a no-op when no modals are open', () => {
      expect(() => component.onEscape()).not.toThrow();
    });
  });
});
