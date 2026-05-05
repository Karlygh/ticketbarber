import { Component, EnvironmentInjector, OnInit, inject, runInInjectionContext, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Storage, deleteObject, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage';
import { AuthStore } from '../../../core/stores/auth.store';
import { ShopService } from '../../../core/services/shop.service';
import { OpeningHoursDay, OpeningHoursSlot, defaultOpeningHours } from '../../../core/models/shop.model';
import { normalizeOpeningHoursDays, validateOpeningHoursDay } from '../../../core/utils/opening-hours.util';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-account-shop-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, HeaderComponent, FooterComponent],
  templateUrl: './account-shop-page.component.html',
  styleUrl: './account-shop-page.component.css'
})
export class AccountShopPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly storage = inject(Storage);
  private readonly injector = inject(EnvironmentInjector);
  private readonly authStore = inject(AuthStore);
  private readonly shopService = inject(ShopService);

  readonly loading = signal(true);
  readonly basicSaving = signal(false);
  readonly hoursSaving = signal(false);
  readonly logoSaving = signal(false);
  readonly basicSaveError = signal<string | null>(null);
  readonly hoursSaveError = signal<string | null>(null);
  readonly logoSaveError = signal<string | null>(null);
  readonly basicSaveSuccess = signal(false);
  readonly hoursSaveSuccess = signal(false);
  readonly logoSaveSuccess = signal(false);

  readonly logoPreview = signal<string | null>(null);
  readonly logoUploading = signal(false);
  readonly logoUploadProgress = signal(0);
  readonly logoUploadError = signal<string | null>(null);
  readonly globalHoursError = signal<string | null>(null);

  basicForm!: FormGroup;
  hoursForm!: FormGroup;

  private initialLogoUrl = '';
  private initialBasic = { shopName: '', description: '', address: '', phone: '' };
  private initialGlobalHours: OpeningHoursDay = { closed: false, slots: [{ opens: '09:00', closes: '19:00' }] };
  readonly tvPath = '/tv';

  get tvQueueUrl(): string {
    const uid = this.authStore.user()?.uid;
    if (!uid) return this.tvPath;
    if (typeof window === 'undefined') return `${this.tvPath}/${uid}`;
    return `${window.location.origin}${this.tvPath}/${uid}`;
  }

  get slotsArray(): FormArray {
    return this.hoursForm.get('slots') as FormArray;
  }

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  ngOnInit(): void {
    this.basicForm = this.fb.group({
      shopName: ['', [Validators.required, Validators.maxLength(60)]],
      logoUrl: [''],
      description: ['', Validators.maxLength(200)],
      address: ['', Validators.maxLength(120)],
      phone: ['', Validators.maxLength(20)]
    });

    this.hoursForm = this.fb.group({
      slots: this.fb.array([this.createSlotFormGroup({ opens: '09:00', closes: '19:00' })])
    });

    this.hoursForm.valueChanges.subscribe(() => this.globalHoursError.set(this.validateGlobalHours()));
    this.loadProfile();
  }

  private createSlotFormGroup(slot: OpeningHoursSlot): FormGroup {
    return this.fb.group({
      opens: [slot.opens, Validators.required],
      closes: [slot.closes, Validators.required]
    });
  }

  private getGlobalHoursFromForm(): OpeningHoursDay {
    const slots = this.slotsArray.getRawValue() as OpeningHoursSlot[];
    return {
      closed: false,
      slots: slots
        .filter((slot) => !!slot?.opens && !!slot?.closes)
        .slice(0, 2)
        .map((slot) => ({ opens: slot.opens, closes: slot.closes }))
    };
  }

  private patchGlobalHours(day: OpeningHoursDay): void {
    const slots = day.slots.length > 0 ? day.slots : [{ opens: '09:00', closes: '19:00' }];
    this.hoursForm.setControl('slots', this.fb.array(slots.map((slot) => this.createSlotFormGroup(slot))));
    this.globalHoursError.set(this.validateGlobalHours());
  }

  private validateGlobalHours(): string | null {
    return validateOpeningHoursDay(this.getGlobalHoursFromForm());
  }

  addSecondSlot(): void {
    if (this.slotsArray.length >= 2) return;
    this.slotsArray.push(this.createSlotFormGroup({ opens: '16:00', closes: '20:00' }));
    this.hoursForm.markAsDirty();
    this.globalHoursError.set(this.validateGlobalHours());
  }

  removeSecondSlot(): void {
    if (this.slotsArray.length <= 1) return;
    this.slotsArray.removeAt(1);
    this.hoursForm.markAsDirty();
    this.globalHoursError.set(this.validateGlobalHours());
  }

  private async loadProfile(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;
    this.loading.set(true);
    try {
      const profile = await this.shopService.getShopProfile(uid);
      if (profile) {
        this.basicForm.patchValue({
          shopName: profile.shopName,
          logoUrl: profile.logoUrl,
          description: profile.description,
          address: profile.address,
          phone: profile.phone
        });

        const openingHours = normalizeOpeningHoursDays(profile.openingHours);
        const representative = openingHours.find((d) => !d.closed && d.slots.length > 0) ?? openingHours[0] ?? defaultOpeningHours()[0];
        this.patchGlobalHours({ closed: false, slots: representative.slots.map((slot) => ({ ...slot })) });

        if (profile.logoUrl) this.logoPreview.set(profile.logoUrl);
        this.initialLogoUrl = profile.logoUrl || '';
        this.initialBasic = {
          shopName: profile.shopName || '',
          description: profile.description || '',
          address: profile.address || '',
          phone: profile.phone || ''
        };
        this.initialGlobalHours = {
          closed: false,
          slots: representative.slots.map((slot) => ({ ...slot }))
        };
      } else {
        this.initialLogoUrl = '';
        this.initialBasic = { shopName: '', description: '', address: '', phone: '' };
        this.initialGlobalHours = { closed: false, slots: [{ opens: '09:00', closes: '19:00' }] };
        this.patchGlobalHours(this.initialGlobalHours);
      }

      this.basicForm.markAsPristine();
      this.hoursForm.markAsPristine();
    } finally {
      this.loading.set(false);
    }
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) return void this.logoUploadError.set('Solo se permiten imágenes JPG, PNG, WebP o SVG.');
    if (file.size > 2 * 1024 * 1024) return void this.logoUploadError.set('El archivo no puede superar los 2 MB.');
    const uid = this.authStore.user()?.uid;
    if (!uid) return;

    this.logoUploadError.set(null);
    this.logoUploading.set(true);
    this.logoUploadProgress.set(0);
    const storageRef = this.runInCtx(() => ref(this.storage, `users/${uid}/logo`));
    const task = this.runInCtx(() => uploadBytesResumable(storageRef, file));
    task.on('state_changed',
      (snap) => this.logoUploadProgress.set(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => {
        this.logoUploadError.set('Error al subir el logo. Inténtalo de nuevo.');
        this.logoUploading.set(false);
      },
      async () => {
        const url = await this.runInCtx(() => getDownloadURL(task.snapshot.ref));
        this.logoPreview.set(url);
        this.basicForm.get('logoUrl')!.setValue(url);
        this.logoUploading.set(false);
      });
  }

  async removeLogo(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;
    const storageRef = this.runInCtx(() => ref(this.storage, `users/${uid}/logo`));
    try { await this.runInCtx(() => deleteObject(storageRef)); } catch {}
    this.logoPreview.set(null);
    this.basicForm.get('logoUrl')!.setValue('');
  }

  basicHasChanges(): boolean {
    const current = this.basicForm.getRawValue();
    return current.shopName !== this.initialBasic.shopName
      || current.description !== this.initialBasic.description
      || current.address !== this.initialBasic.address
      || current.phone !== this.initialBasic.phone;
  }

  hoursHasChanges(): boolean {
    return JSON.stringify(this.getGlobalHoursFromForm()) !== JSON.stringify(this.initialGlobalHours);
  }

  logoHasChanges(): boolean {
    return (this.basicForm.get('logoUrl')!.value || '') !== this.initialLogoUrl;
  }

  revertBasic(): void {
    this.basicForm.patchValue(this.initialBasic);
    this.basicForm.markAsPristine();
    this.basicSaveError.set(null);
    this.basicSaveSuccess.set(false);
  }

  revertHours(): void {
    this.patchGlobalHours(this.initialGlobalHours);
    this.hoursForm.markAsPristine();
    this.hoursSaveError.set(null);
    this.hoursSaveSuccess.set(false);
  }

  revertLogo(): void {
    this.logoPreview.set(this.initialLogoUrl || null);
    this.basicForm.get('logoUrl')!.setValue(this.initialLogoUrl);
    this.logoSaveError.set(null);
    this.logoSaveSuccess.set(false);
  }

  async saveLogo(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid || !this.logoHasChanges()) return;
    this.logoSaving.set(true);
    this.logoSaveError.set(null);
    this.logoSaveSuccess.set(false);
    try {
      const logoUrl = this.basicForm.get('logoUrl')!.value || '';
      await this.shopService.updateShopProfile(uid, { logoUrl });
      this.initialLogoUrl = logoUrl;
      this.logoSaveSuccess.set(true);
      setTimeout(() => this.logoSaveSuccess.set(false), 3000);
    } catch {
      this.logoSaveError.set('No se pudo guardar el logo. Inténtalo de nuevo.');
    } finally {
      this.logoSaving.set(false);
    }
  }

  async saveBasic(): Promise<void> {
    if (this.basicForm.get('shopName')!.invalid) return void this.basicForm.get('shopName')!.markAsTouched();
    const uid = this.authStore.user()?.uid;
    if (!uid || !this.basicHasChanges()) return;
    this.basicSaving.set(true);
    this.basicSaveError.set(null);
    this.basicSaveSuccess.set(false);
    try {
      const data = this.basicForm.getRawValue();
      await this.shopService.updateShopProfile(uid, {
        shopName: data.shopName,
        description: data.description,
        address: data.address,
        phone: data.phone
      });
      this.initialBasic = { shopName: data.shopName, description: data.description, address: data.address, phone: data.phone };
      this.basicSaveSuccess.set(true);
      setTimeout(() => this.basicSaveSuccess.set(false), 3000);
    } catch {
      this.basicSaveError.set('No se pudo guardar la información básica. Inténtalo de nuevo.');
    } finally {
      this.basicSaving.set(false);
    }
  }

  async saveHours(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid || !this.hoursHasChanges()) return;

    const error = this.validateGlobalHours();
    if (error) {
      this.globalHoursError.set(error);
      this.hoursSaveError.set('Revisa el horario: hay tramos inválidos.');
      return;
    }

    const globalHours = this.getGlobalHoursFromForm();
    const openingHours: OpeningHoursDay[] = Array.from({ length: 7 }).map(() => ({
      closed: false,
      slots: globalHours.slots.map((slot) => ({ ...slot }))
    }));

    this.hoursSaving.set(true);
    this.hoursSaveError.set(null);
    this.hoursSaveSuccess.set(false);
    try {
      await this.shopService.updateShopProfile(uid, { openingHours });
      this.initialGlobalHours = { closed: false, slots: globalHours.slots.map((slot) => ({ ...slot })) };
      this.patchGlobalHours(this.initialGlobalHours);
      this.hoursSaveSuccess.set(true);
      setTimeout(() => this.hoursSaveSuccess.set(false), 3000);
    } catch {
      this.hoursSaveError.set('No se pudo guardar el horario. Inténtalo de nuevo.');
    } finally {
      this.hoursSaving.set(false);
    }
  }
}
