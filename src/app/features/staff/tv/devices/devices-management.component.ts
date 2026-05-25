import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DeviceDoc, TvAuthService } from '../../../../core/services/tv-auth.service';
import { APP_ROUTES } from '../../../../shared/routing/app-routes';
import { HeaderComponent } from '../../../../shared/components/header/header.component';

type DeviceConnectionStatus = 'recent' | 'stale';

@Component({
  selector: 'app-devices-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeaderComponent],
  templateUrl: './devices-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './devices-management.component.css'
})
export class DevicesManagementComponent implements OnInit {
  private readonly tvAuthService = inject(TvAuthService);
  private readonly destroyRef = inject(DestroyRef);
  readonly routes = APP_ROUTES;

  readonly devices = signal<DeviceDoc[]>([]);
  readonly unlinkingId = signal<string | null>(null);
  readonly renamingId = signal<string | null>(null);
  readonly newName = signal('');
  private readonly recentHeartbeatMs = 15 * 60 * 1000;

  ngOnInit(): void {
    this.tvAuthService.watchDevices().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => this.devices.set(d));
  }

  startRename(device: DeviceDoc): void {
    this.renamingId.set(device.deviceId);
    this.newName.set(device.name);
  }

  async confirmRename(): Promise<void> {
    const id = this.renamingId();
    const name = this.newName().trim();
    if (!id || !name) return;
    await this.tvAuthService.renameDevice(id, name);
    this.renamingId.set(null);
    this.newName.set('');
  }

  onRenameInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.newName.set(input?.value ?? '');
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.newName.set('');
  }

  async unlink(deviceId: string): Promise<void> {
    this.unlinkingId.set(deviceId);
    try {
      await this.tvAuthService.unlinkDevice(deviceId);
    } finally {
      this.unlinkingId.set(null);
    }
  }

  formatLastSeen(ts: number): string {
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'ahora mismo';
    if (diffMin < 60) return `hace ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `hace ${diffH} h`;
    return `hace ${Math.floor(diffH / 24)} días`;
  }

  formatCreatedAt(ts: number): string {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(ts);
  }

  connectionStatus(device: DeviceDoc): DeviceConnectionStatus {
    return Date.now() - device.lastSeen <= this.recentHeartbeatMs ? 'recent' : 'stale';
  }

  connectionLabel(device: DeviceDoc): string {
    return this.connectionStatus(device) === 'recent' ? 'Activa recientemente' : 'Sin conexión reciente';
  }
}
