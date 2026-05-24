import { Injectable, signal, computed, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, User, getAdditionalUserInfo, onAuthStateChanged, signInWithPopup, signOut } from '@angular/fire/auth';
import { BrowserStorageService } from '../services/browser-storage.service';
import { UserService } from '../services/user.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(Auth);
  private readonly userService = inject(UserService);
  private readonly storage = inject(BrowserStorageService);
  private readonly userState = signal<User | null>(null);
  private readonly readyState = signal(false);
  private resolveReady!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  readonly user = computed(() => this.userState());
  readonly ready = computed(() => this.readyState());
  readonly isAuthenticated = computed(() => Boolean(this.userState()));

  constructor() {
    onAuthStateChanged(this.auth, (user) => {
      this.userState.set(user);
      if (!this.readyState()) {
        this.readyState.set(true);
        this.resolveReady();
      }
    });
  }

  waitUntilReady(): Promise<void> {
    if (this.readyState()) return Promise.resolve();
    return this.readyPromise;
  }

  async signInWithGoogle(): Promise<{ isNewUser: boolean }> {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    // Garantizar que el documento users/{uid} existe en Firestore
    await this.userService.ensureUserProfile(result.user);
    const info = getAdditionalUserInfo(result);
    return { isNewUser: info?.isNewUser ?? false };
  }

  async signOut(): Promise<void> {
    const userId = this.userState()?.uid;
    this.storage.removeSessionItem('pendingPriceId');
    this.storage.removeSessionItem('premiumCelebrationShown');
    this.storage.removeLocalItem('tb_shop_id');
    this.storage.removeLocalItem('tb_device_id');
    if (userId) {
      this.storage.removeLocalItem(`tb_user_pair_code_${userId}`);
      this.storage.removeLocalItem(`tb_user_pair_expiry_${userId}`);
    }
    await signOut(this.auth);
  }
}
