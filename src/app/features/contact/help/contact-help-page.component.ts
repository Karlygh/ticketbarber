import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact-help-page',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './contact-help-page.component.html',
  styleUrl: './contact-help-page.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactHelpPageComponent {}
