import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;
  let component: FooterComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the default currentYear', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain(String(new Date().getFullYear()));
  });

  it('should render a custom currentYear passed as @Input', () => {
    component.currentYear = 2030;
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('2030');
  });

  it('should render the brand logo', () => {
    const img: HTMLImageElement = fixture.nativeElement.querySelector('.footer-brand img');
    expect(img).toBeTruthy();
    expect(img.alt).toBe('Ticketbarber logo');
  });

  it('should render legal route links', () => {
    const links: NodeListOf<HTMLAnchorElement> =
      fixture.nativeElement.querySelectorAll('.footer-grid a');
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/legal/terminos');
    expect(hrefs).toContain('/legal/privacidad');
    expect(hrefs).toContain('/legal/cookies');
  });
});
