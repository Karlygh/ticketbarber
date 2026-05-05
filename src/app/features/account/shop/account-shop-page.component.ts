import { Component, EnvironmentInjector, OnInit, inject, runInInjectionContext, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { AuthStore } from '../../../core/stores/auth.store';
import { ShopService } from '../../../core/services/shop.service';
import { WEEK_DAYS, defaultOpeningHours, OpeningHoursDay } from '../../../core/models/shop.model';
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

  readonly weekDays = WEEK_DAYS;

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

  basicForm!: FormGroup;
  hoursForm!: FormGroup;

  private initialLogoUrl = '';
  private initialBasic = {
    shopName: '',
    description: '',
    address: '',
    phone: ''
  };
  private initialOpeningHours: OpeningHoursDay[] = defaultOpeningHours();
  readonly tvPath = '/tv';

  get tvQueueUrl(): string {
    const uid = this.authStore.user()?.uid;
    if (!uid) return this.tvPath;
    if (typeof window === 'undefined') return `${this.tvPath}/${uid}`;
    return `${window.location.origin}${this.tvPath}/${uid}`;
  }

  get hoursArray(): FormArray {
    return this.hoursForm.get('openingHours') as FormArray;
  }

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  ngOnInit(): void {
    this.basicForm = this.fb.group({
      shopName:    ['', [Validators.required, Validators.maxLength(60)]],
      logoUrl:     [''],
      description: ['', Validators.maxLength(200)],
      address:     ['', Validators.maxLength(120)],
      phone:       ['', Validators.maxLength(20)]
    });

    this.hoursForm = this.fb.group({
      openingHours: this.fb.array(
        defaultOpeningHours().map(d =>
          this.fb.group({
            opens:  [d.opens, Validators.required],
            closes: [d.closes, Validators.required],
            closed: [d.closed]
          })
        )
      )
    });

    this.loadProfile();
  }

  private async loadProfile(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;
    this.loading.set(true);
    try {
      const profile = await this.shopService.getShopProfile(uid);
      if (profile) {
        this.basicForm.patchValue({
          shopName:    profile.shopName,
          logoUrl:     profile.logoUrl,
          description: profile.description,
          address:     profile.address,
          phone:       profile.phone
        });
        if (profile.openingHours?.length === 7) {
          profile.openingHours.forEach((day, i) => {
            this.hoursArray.at(i).patchValue(day);
          });
        }
        if (profile.logoUrl) {
          this.logoPreview.set(profile.logoUrl);
        }

        this.initialLogoUrl = profile.logoUrl || '';
        this.initialBasic = {
          shopName: profile.shopName || '',
          description: profile.description || '',
          address: profile.address || '',
          phone: profile.phone || ''
        };
        this.initialOpeningHours = profile.openingHours?.length === 7
          ? profile.openingHours.map(day => ({ ...day }))
          : defaultOpeningHours();
      } else {
        this.initialLogoUrl = '';
        this.initialBasic = {
          shopName: '',
          description: '',
          address: '',
          phone: ''
        };
        this.initialOpeningHours = defaultOpeningHours();
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
    if (!allowed.includes(file.type)) {
      this.logoUploadError.set('Solo se permiten imágenes JPG, PNG, WebP o SVG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.logoUploadError.set('El archivo no puede superar los 2 MB.');
      return;
    }

    const uid = this.authStore.user()?.uid;
    if (!uid) return;

    this.logoUploadError.set(null);
    this.logoUploading.set(true);
    this.logoUploadProgress.set(0);

    const storageRef = this.runInCtx(() => ref(this.storage, `users/${uid}/logo`));
    const task = this.runInCtx(() => uploadBytesResumable(storageRef, file));

    task.on(
      'state_changed',
      snap => this.logoUploadProgress.set(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => {
        console.error('Logo upload error:', err);
        this.logoUploadError.set('Error al subir el logo. Inténtalo de nuevo.');
        this.logoUploading.set(false);
      },
      async () => {
        const url = await this.runInCtx(() => getDownloadURL(task.snapshot.ref));
        this.logoPreview.set(url);
        this.basicForm.get('logoUrl')!.setValue(url);
        this.logoUploading.set(false);
      }
    );
  }

  async removeLogo(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;
    const storageRef = this.runInCtx(() => ref(this.storage, `users/${uid}/logo`));
    try {
      await this.runInCtx(() => deleteObject(storageRef));
    } catch { /* no importa si no existía */ }
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
    const current = this.hoursArray.getRawValue() as OpeningHoursDay[];
    return JSON.stringify(current) !== JSON.stringify(this.initialOpeningHours);
  }

  logoHasChanges(): boolean {
    const currentLogo = this.basicForm.get('logoUrl')!.value || '';
    return currentLogo !== this.initialLogoUrl;
  }

  revertBasic(): void {
    this.basicForm.patchValue(this.initialBasic);
    this.basicForm.markAsPristine();
    this.basicSaveError.set(null);
    this.basicSaveSuccess.set(false);
  }

  revertHours(): void {
    this.initialOpeningHours.forEach((day, i) => {
      this.hoursArray.at(i).patchValue(day);
    });
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
    if (!uid) return;
    if (!this.logoHasChanges()) return;

    this.logoSaving.set(true);
    this.logoSaveError.set(null);
    this.logoSaveSuccess.set(false);

    try {
      const logoUrl = this.basicForm.get('logoUrl')!.value || '';
      await this.shopService.updateShopProfile(uid, { logoUrl });
      this.initialLogoUrl = logoUrl;
      this.logoSaveSuccess.set(true);
      setTimeout(() => this.logoSaveSuccess.set(false), 3000);
    } catch (err) {
      const logoUrl = this.basicForm.get('logoUrl')!.value || '';
      const profile = await this.shopService.getShopProfile(uid);
      if (profile?.logoUrl === logoUrl) {
        this.initialLogoUrl = logoUrl;
        this.logoSaveSuccess.set(true);
        setTimeout(() => this.logoSaveSuccess.set(false), 3000);
      } else {
        console.error('Error guardando logo:', err);
        this.logoSaveError.set('No se pudo guardar el logo. Inténtalo de nuevo.');
      }
    } finally {
      this.logoSaving.set(false);
    }
  }

  async saveBasic(): Promise<void> {
    if (this.basicForm.get('shopName')!.invalid) {
      this.basicForm.get('shopName')!.markAsTouched();
      return;
    }

    const uid = this.authStore.user()?.uid;
    if (!uid) return;
    if (!this.basicHasChanges()) return;

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
      this.initialBasic = {
        shopName: data.shopName,
        description: data.description,
        address: data.address,
        phone: data.phone
      };
      this.basicSaveSuccess.set(true);
      setTimeout(() => this.basicSaveSuccess.set(false), 3000);
    } catch (err) {
      console.error('Error guardando información básica:', err);
      this.basicSaveError.set('No se pudo guardar la información básica. Inténtalo de nuevo.');
    } finally {
      this.basicSaving.set(false);
    }
  }

  async saveHours(): Promise<void> {
    const uid = this.authStore.user()?.uid;
    if (!uid) return;
    if (!this.hoursHasChanges()) return;

    this.hoursSaving.set(true);
    this.hoursSaveError.set(null);
    this.hoursSaveSuccess.set(false);

    try {
      const openingHours = this.hoursArray.getRawValue() as OpeningHoursDay[];
      await this.shopService.updateShopProfile(uid, { openingHours });
      this.initialOpeningHours = openingHours.map(day => ({ ...day }));
      this.hoursSaveSuccess.set(true);
      setTimeout(() => this.hoursSaveSuccess.set(false), 3000);
    } catch (err) {
      console.error('Error guardando horarios:', err);
      this.hoursSaveError.set('No se pudo guardar el horario. Inténtalo de nuevo.');
    } finally {
      this.hoursSaving.set(false);
    }
  }
}
