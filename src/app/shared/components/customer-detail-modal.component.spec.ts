import { TestBed } from '@angular/core/testing';
import { CustomerDetailModalComponent, CustomerDetailViewModel } from './customer-detail-modal.component';

describe('CustomerDetailModalComponent', () => {
  let component: CustomerDetailModalComponent;

  const sampleCustomer: CustomerDetailViewModel = {
    name: 'Ana García',
    arrivalTime: '10:30',
    phone: '600 123 456'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [CustomerDetailModalComponent] });
    const fixture = TestBed.createComponent(CustomerDetailModalComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('stores the customer Input', () => {
    component.customer = sampleCustomer;
    expect(component.customer?.name).toBe('Ana García');
  });

  it('emits closed when close() is called', () => {
    const spy = jest.spyOn(component.closed, 'emit');
    component.close();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('onEscape() calls close()', () => {
    const spy = jest.spyOn(component, 'close');
    component.onEscape();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('emits closed when Escape triggers onEscape', () => {
    const spy = jest.spyOn(component.closed, 'emit');
    component.onEscape();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('accepts null customer without errors', () => {
    component.customer = null;
    expect(component.customer).toBeNull();
  });
});
