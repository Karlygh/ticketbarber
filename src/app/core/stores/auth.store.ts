import { Injectable, signal, computed, inject, InjectionToken } from '@angular/core';
import { Auth, GoogleAuthProvider, User, getAdditionalUserInfo as _getAdditionalUserInfo, onAuthStateChanged as _onAuthStateChanged, signInWithPopup as _signInWithPopup, signOut as _signOut, UserCredential } from '@angular/fire/auth';
import { BrowserStorageService } from '../services/browser-storage.service';
import { UserService } from '../services/user.service';

export const AUTH_ON_STATE_CHANGED = new InjectionToken<typeof _onAuthStateChanged>(
  'AUTH_ON_STATE_CHANGED', { providedIn: 'root', factory: () => _onAuthStateChanged });
export const AUTH_SIGN_IN_WITH_POPUP = new InjectionToken<typeof _signInWithPopup>(
  'AUTH_SIGN_IN_WITH_POPUP', { providedIn: 'root', factory: () => _signInWithPopup });
export const AUTH_SIGN_OUT = new InjectionToken<typeof _signOut>(
  'AUTH_SIGN_OUT', { providedIn: 'root', factory: () => _signOut });
export const AUTH_GET_ADDITIONAL_USER_INFO = new InjectionToken<typeof _getAdditionalUserInfo>(
  'AUTH_GET_ADDITIONAL_USER_INFO', { providedIn: 'root', factory: () => _getAdditionalUserInfo });

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(Auth);
  private readonly userService = inject(UserService);
  private readonly storage = inject(BrowserStorageService);
  private readonly authOnStateChanged = inject(AUTH_ON_STATE_CHANGED);
  private readonly authSignInWithPopup = inject(AUTH_SIGN_IN_WITH_POPUP);
  private readonly authSignOut = inject(AUTH_SIGN_OUT);
  private readonly authGetAdditionalUserInfo = inject(AUTH_GET_ADDITIONAL_USER_INFO);
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
    this.authOnStateChanged(this.auth, (user) => {
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
    const result = await this.authSignInWithPopup(this.auth, provider);
    // Garantizar que el documento users/{uid} existe en Firestore
    await this.userService.ensureUserProfile(result.user);
    const info = this.authGetAdditionalUserInfo(result);
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
    await this.authSignOut(this.auth);
  }
}
