jest.mock('@angular/fire/auth');
jest.mock('@angular/fire/firestore');

import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { StaffTrialStartPageComponent } from './staff-trial-start-page.component';

describe('StaffTrialStartPageComponent', () => {
  let component: StaffTrialStartPageComponent;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StaffTrialStartPageComponent],
      providers: [provideRouter([])]
    });
    const fixture = TestBed.createComponent(StaffTrialStartPageComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('exposes the list of activation features', () => {
    expect(component.activationFeatures.length).toBeGreaterThan(0);
    expect(component.activationFeatures[0]).toEqual(
      expect.objectContaining({ title: expect.any(String), description: expect.any(String) })
    );
  });

  it('continueWithGoogle navigates to the register route', () => {
    const spy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.continueWithGoogle();
    expect(spy).toHaveBeenCalledWith(component.routes.staff.register);
  });

  it('viewPlans navigates to the pricing route', () => {
    const spy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.viewPlans();
    expect(spy).toHaveBeenCalledWith(component.routes.pricing);
  });

  it('goBack navigates to root when there is no history', () => {
    Object.defineProperty(window, 'history', { value: { length: 1 }, writable: true });
    const spy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    component.goBack();
    expect(spy).toHaveBeenCalledWith(component.routes.root);
  });
});
