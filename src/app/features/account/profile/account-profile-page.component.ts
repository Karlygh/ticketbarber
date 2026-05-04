import { Component, EnvironmentInjector, OnInit, inject, runInInjectionContext, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Auth, updateProfile } from '@angular/fire/auth';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { Firestore, doc, updateDoc } from '@angular/fire/firestore';
import { AuthStore } from '../../../core/stores/auth.store';
import { HeaderComponent } from '../../../shared/components/header/header.component';
import { FooterComponent } from '../../../shared/components/footer/footer.component';

@Component({
  selector: 'app-account-profile-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, HeaderComponent, FooterComponent],
  templateUrl: './account-profile-page.component.html',
  styleUrl: './account-profile-page.component.css'
})
export class AccountProfilePageComponent implements OnInit {
  private readonly auth = inject(Auth);
  private readonly storage = inject(Storage);
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly fb = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);

  readonly avatarPreview = signal<string | null>(null);
  readonly avatarUploading = signal(false);
  readonly avatarProgress = signal(0);
  readonly avatarError = signal<string | null>(null);

  form!: FormGroup;

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  ngOnInit(): void {
    const user = this.authStore.user();
    this.form = this.fb.group({
      displayName: [user?.displayName ?? '', [Validators.required, Validators.maxLength(60)]],
      photoURL:    [user?.photoURL ?? '']
    });
    if (user?.photoURL) {
      this.avatarPreview.set(user.photoURL);
    }
  }

  onAvatarSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.avatarError.set('Solo se permiten imágenes JPG, PNG o WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.avatarError.set('La imagen no puede superar los 2 MB.');
      return;
    }

    const uid = this.authStore.user()?.uid;
    if (!uid) return;

    this.avatarError.set(null);
    this.avatarUploading.set(true);
    this.avatarProgress.set(0);

    const storageRef = this.runInCtx(() => ref(this.storage, `users/${uid}/avatar`));
    const task = this.runInCtx(() => uploadBytesResumable(storageRef, file));

    task.on(
      'state_changed',
      snap => this.avatarProgress.set(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      err => {
        console.error('Avatar upload error:', err);
        this.avatarError.set('Error al subir la imagen. Inténtalo de nuevo.');
        this.avatarUploading.set(false);
      },
      async () => {
        const url = await this.runInCtx(() => getDownloadURL(task.snapshot.ref));
        this.avatarPreview.set(url);
        this.form.get('photoURL')!.setValue(url);
        this.avatarUploading.set(false);
      }
    );
  }

  async save(): Promise<void> {
    if (this.form.invalid) return;
    const currentUser = this.auth.currentUser;
    if (!currentUser) return;

    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    try {
      const { displayName, photoURL } = this.form.value as { displayName: string; photoURL: string };
      await this.runInCtx(() => updateProfile(currentUser, { displayName, photoURL: photoURL || null }));

      const userRef = this.runInCtx(() => doc(this.firestore, `users/${currentUser.uid}`));
      await this.runInCtx(() => updateDoc(userRef, { displayName, photoURL: photoURL || null }));

      this.saveSuccess.set(true);
      setTimeout(() => this.saveSuccess.set(false), 3000);
    } catch (err) {
      console.error('Error guardando perfil:', err);
      this.saveError.set('No se pudo guardar. Inténtalo de nuevo.');
    } finally {
      this.saving.set(false);
    }
  }
}
