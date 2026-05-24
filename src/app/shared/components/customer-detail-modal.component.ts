import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface CustomerDetailViewModel {
  name: string;
  arrivalTime: string;
  phone: string;
}

@Component({
  selector: 'app-customer-detail-modal',
  templateUrl: './customer-detail-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./customer-detail-modal.component.css']
})
export class CustomerDetailModalComponent {
  @Input() customer: CustomerDetailViewModel | null = null;
  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  close(): void {
    this.closed.emit();
  }
}

