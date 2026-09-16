import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TvAuthService, TvBindingFailureReason } from '../../core/services/tv-auth.service';
import { TvCardsLightViewComponent } from './views/cards-light/tv-cards-light-view.component';
import { TvDefaultViewComponent } from './views/default/tv-default-view.component';
import { TvPlaceholderViewComponent } from './views/placeholder/tv-placeholder-view.component';
import { TvRoseSoftViewComponent } from './views/rose-soft/tv-rose-soft-view.component';
import { TvPageService } from './tv-page.service';

const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
// Reserves a margin around the 1920x1080 stage so TVs that crop a few
// percent of the edges (overscan) never cut off the header/footer.
const SAFE_MARGIN = 0.96;

@Component({
  selector: 'app-tv-page',
  standalone: true,
  imports: [CommonModule, TvDefaultViewComponent, TvCardsLightViewComponent, TvPlaceholderViewComponent, TvRoseSoftViewComponent],
  providers: [TvPageService],
  templateUrl: './tv-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './tv-page.component.css'
})
export class TvPageComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly tvAuthService = inject(TvAuthService);
  readonly service = inject(TvPageService);

  readonly scale = signal(1);

  async ngOnInit(): Promise<void> {
    this.updateScale();

    const routeShopId = this.route.snapshot.params['shopId'] as string | undefined;
    const binding = await this.tvAuthService.validateBinding();

    if (!binding.valid || !binding.shopId) {
      void this.redirectToActivate(binding.reason ?? 'missing');
      return;
    }

    if (routeShopId && routeShopId !== binding.shopId) {
      void this.router.navigate(['/tv']);
      return;
    }

    this.service.init(binding.shopId, (reason) => {
      void this.redirectToActivate(reason);
    });
  }

  ngOnDestroy(): void {
    this.service.destroy();
  }

  @HostListener('window:resize')
  updateScale(): void {
    const fit = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
    this.scale.set(fit * SAFE_MARGIN);
  }

  private redirectToActivate(reason: TvBindingFailureReason): Promise<boolean> {
    return this.router.navigate(['/activate'], {
      queryParams: { reason }
    });
  }
}
