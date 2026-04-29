import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { DeviceDoc, TvAuthService } from '../../core/services/tv-auth.service';

@Component({
  selector: 'app-devices-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './devices-management.component.html',
  styleUrl: './devices-management.component.css'
})
export class DevicesManagementComponent implements OnInit, OnDestroy {
  private readonly tvAuthService = inject(TvAuthService);

  readonly devices = signal<DeviceDoc[]>([]);
  readonly unlinkingId = signal<string | null>(null);
  readonly renamingId = signal<string | null>(null);
  readonly newName = signal('');

  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.tvAuthService.watchDevices().subscribe(d => this.devices.set(d));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
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
}
