import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TvAuthService, TvBindingFailureReason } from '../../core/services/tv-auth.service';
import { TvCardsLightViewComponent } from './views/cards-light/tv-cards-light-view.component';
import { TvDefaultViewComponent } from './views/default/tv-default-view.component';
import { TvPlaceholderViewComponent } from './views/placeholder/tv-placeholder-view.component';
import { TvPageService } from './tv-page.service';

@Component({
  selector: 'app-tv-page',
  standalone: true,
  imports: [CommonModule, TvDefaultViewComponent, TvCardsLightViewComponent, TvPlaceholderViewComponent],
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

  async ngOnInit(): Promise<void> {
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

  private redirectToActivate(reason: TvBindingFailureReason): Promise<boolean> {
    return this.router.navigate(['/activate'], {
      queryParams: { reason }
    });
  }
}
