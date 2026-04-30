import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-customer-detail-modal',
  templateUrl: './customer-detail-modal.component.html',
  styleUrls: ['./customer-detail-modal.component.css']
})
export class CustomerDetailModalComponent {
  @Input() customer: any;
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
