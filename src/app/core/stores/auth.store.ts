import { Injectable, signal, computed, inject, InjectionToken } from '@angular/core';
import { Auth, GoogleAuthProvider, User, getAdditionalUserInfo as _getAdditionalUserInfo, onAuthStateChanged as _onAuthStateChanged, reauthenticateWithPopup as _reauthenticateWithPopup, signInAnonymously as _signInAnonymously, signInWithPopup as _signInWithPopup, signOut as _signOut } from '@angular/fire/auth';
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
export const AUTH_SIGN_IN_ANONYMOUSLY = new InjectionToken<typeof _signInAnonymously>(
  'AUTH_SIGN_IN_ANONYMOUSLY', { providedIn: 'root', factory: () => _signInAnonymously });
export const AUTH_REAUTHENTICATE_WITH_POPUP = new InjectionToken<typeof _reauthenticateWithPopup>(
  'AUTH_REAUTHENTICATE_WITH_POPUP', { providedIn: 'root', factory: () => _reauthenticateWithPopup });

/**
 * Caducidad de sesión por inactividad (ENS op.acc.7). Firebase mantiene la
 * sesión indefinidamente, así que la vigencia se controla aquí.
 */
export const INACTIVITY_LIMIT_MS = 12 * 60 * 60 * 1000;
const LAST_ACTIVITY_KEY = 'tb_last_activity';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(Auth);
  private readonly userService = inject(UserService);
  private readonly storage = inject(BrowserStorageService);
  private readonly authOnStateChanged = inject(AUTH_ON_STATE_CHANGED);
  private readonly authSignInWithPopup = inject(AUTH_SIGN_IN_WITH_POPUP);
  private readonly authSignOut = inject(AUTH_SIGN_OUT);
  private readonly authGetAdditionalUserInfo = inject(AUTH_GET_ADDITIONAL_USER_INFO);
  private readonly authSignInAnonymously = inject(AUTH_SIGN_IN_ANONYMOUSLY);
  private readonly authReauthenticateWithPopup = inject(AUTH_REAUTHENTICATE_WITH_POPUP);
  private readonly rawUserState = signal<User | null>(null);
  private readonly readyState = signal(false);
  private readonly previousLoginState = signal<number | null>(null);
  private resolveReady!: () => void;
  private readonly readyPromise = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  /**
   * Sesión de staff. Excluye deliberadamente las sesiones anónimas de
   * dispositivo (TV): sin esto, una TV vinculada pasaría staffAuthGuard.
   */
  readonly user = computed(() => {
    const raw = this.rawUserState();
    return raw && !raw.isAnonymous ? raw : null;
  });

  /** Sesión anónima de un dispositivo TV vinculado. */
  readonly deviceUser = computed(() => {
    const raw = this.rawUserState();
    return raw && raw.isAnonymous ? raw : null;
  });

  readonly ready = computed(() => this.readyState());
  readonly isAuthenticated = computed(() => Boolean(this.user()));
  /** Acceso anterior a mostrar al usuario. ENS op.acc.5.r5.2. */
  readonly previousLoginAtMs = computed(() => this.previousLoginState());

  constructor() {
    this.authOnStateChanged(this.auth, (user) => {
      this.rawUserState.set(user);
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

    this.touchActivity();
    const previous = await this.userService.recordLogin(result.user.uid);
    this.previousLoginState.set(previous);
    await this.userService.recordAuthEvent(result.user.uid, { type: 'login_success' });

    return { isNewUser: info?.isNewUser ?? false };
  }

  /**
   * Inicia una sesión anónima para un dispositivo TV, de forma que las reglas
   * de Firestore puedan comprobar su vínculo en lugar de abrir la cola al
   * público. Reutiliza la sesión anónima existente si ya la hay.
   */
  async signInAsDevice(): Promise<User> {
    await this.waitUntilReady();

    const existing = this.deviceUser();
    if (existing) return existing;

    if (this.user()) {
      // El dueño está viendo la TV desde su propia sesión: ya tiene acceso.
      return this.user() as User;
    }

    const result = await this.authSignInAnonymously(this.auth);
    return result.user;
  }

  /**
   * Re-autenticación por identificación singular para operaciones sensibles
   * (borrado de cuenta, exportación de datos). ENS op.acc.6.r6.1.
   */
  async reauthenticate(): Promise<void> {
    const current = this.user();
    if (!current) {
      throw new Error('Debes iniciar sesión para realizar esta operación.');
    }
    await this.authReauthenticateWithPopup(current, new GoogleAuthProvider());
    this.touchActivity();
  }

  /** Marca actividad del usuario para el cómputo de inactividad. */
  touchActivity(): void {
    this.storage.setLocalItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }

  /**
   * Cierra la sesión si se superó el límite de inactividad.
   * Devuelve true si la sesión ha caducado. ENS op.acc.7.
   */
  async enforceInactivityLimit(): Promise<boolean> {
    const current = this.user();
    if (!current) return false;

    const raw = this.storage.getLocalItem(LAST_ACTIVITY_KEY);
    const last = Number(raw);

    if (!raw || !Number.isFinite(last)) {
      // Sesión anterior a esta política: se toma este momento como referencia.
      this.touchActivity();
      return false;
    }

    if (Date.now() - last <= INACTIVITY_LIMIT_MS) {
      this.touchActivity();
      return false;
    }

    await this.userService.recordAuthEvent(current.uid, {
      type: 'session_expired',
      reason: 'inactivity'
    });
    await this.signOut();
    return true;
  }

  async signOut(): Promise<void> {
    const userId = this.user()?.uid;
    if (userId) {
      await this.userService.recordAuthEvent(userId, { type: 'logout' });
    }

    this.previousLoginState.set(null);
    this.storage.removeSessionItem('pendingPriceId');
    this.storage.removeSessionItem('premiumCelebrationShown');
    this.storage.removeLocalItem('tb_shop_id');
    this.storage.removeLocalItem('tb_device_id');
    this.storage.removeLocalItem(LAST_ACTIVITY_KEY);
    if (userId) {
      this.storage.removeLocalItem(`tb_user_pair_code_${userId}`);
      this.storage.removeLocalItem(`tb_user_pair_expiry_${userId}`);
    }
    await this.authSignOut(this.auth);
  }
}
