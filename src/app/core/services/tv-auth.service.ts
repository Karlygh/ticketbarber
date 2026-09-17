import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDoc,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, of } from 'rxjs';
import { AuthStore } from '../stores/auth.store';
import { logError } from '../utils/logger.util';
import { BrowserStorageService } from './browser-storage.service';

/**
 * Longitud del código de vinculación de TV.
 * Con 6 dígitos el espacio era de 10^6, enumerable por fuerza bruta; con 8 es
 * de 10^8, y el código sigue siendo de un solo uso y con 15 min de vigencia
 * (ENS op.acc.2).
 */
export const PAIRING_CODE_LENGTH = 8;

export interface DeviceDoc {
  deviceId: string;
  userId: string;
  name: string;
  createdAt: number;
  lastSeen: number;
  activationCode?: string;
  active?: boolean;
  revokedAt?: number;
  /**
   * uid de la sesión anónima de este dispositivo. Es lo que permite a las
   * reglas de Firestore autorizar la lectura de la cola sin abrirla al
   * público (ENS op.acc.2 / mp.info.1).
   */
  anonUid?: string;
}

export interface ActiveTvCode {
  code: string;
  expiresAt: number;
}

export interface PairingCodeStatus {
  exists: boolean;
  consumed: boolean;
  expired: boolean;
  deviceId: string | null;
}

interface DeviceCodeDoc {
  user_code: string;
  userId: string;
  deviceId: string;
  createdAt: number;
  expiresAt: number;
  consumedAt: number;
  revokedAt: number;
}

export interface TvBindingValidation {
  valid: boolean;
  shopId: string | null;
  deviceId: string | null;
  reason?: 'missing' | 'not_found' | 'owner_mismatch' | 'revoked' | 'unavailable';
}

export type TvBindingFailureReason = NonNullable<TvBindingValidation['reason']>;

@Injectable({ providedIn: 'root' })
export class TvAuthService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly authStore = inject(AuthStore);
  private readonly storage = inject(BrowserStorageService);

  private readonly DEVICE_ID_KEY = 'tb_device_id';
  private readonly SHOP_ID_KEY = 'tb_shop_id';
  private readonly BOUND_DEVICE_ID_KEY = 'tb_bound_device_id';
  private readonly USER_CODE_KEY_PREFIX = 'tb_user_pair_code_';
  private readonly USER_CODE_EXPIRY_PREFIX = 'tb_user_pair_expiry_';

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  getDeviceId(): string {
    let id = this.storage.getLocalItem(this.DEVICE_ID_KEY);
    if (!id) {
      id = 'tv_' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      this.storage.setLocalItem(this.DEVICE_ID_KEY, id);
    }
    return id;
  }

  getShopId(): string | null {
    return this.storage.getLocalItem(this.SHOP_ID_KEY);
  }

  getBoundDeviceId(): string | null {
    const boundId = this.storage.getLocalItem(this.BOUND_DEVICE_ID_KEY);
    if (boundId) return boundId;

    const legacyDeviceId = this.storage.getLocalItem(this.DEVICE_ID_KEY);
    if (legacyDeviceId) {
      this.storage.setLocalItem(this.BOUND_DEVICE_ID_KEY, legacyDeviceId);
      return legacyDeviceId;
    }

    return null;
  }

  saveBinding(shopId: string, deviceId?: string): void {
    this.storage.setLocalItem(this.SHOP_ID_KEY, shopId);
    if (deviceId) {
      this.storage.setLocalItem(this.BOUND_DEVICE_ID_KEY, deviceId);
      this.storage.setLocalItem(this.DEVICE_ID_KEY, deviceId);
    }
  }

  clearBinding(): void {
    this.storage.removeLocalItem(this.SHOP_ID_KEY);
    this.storage.removeLocalItem(this.BOUND_DEVICE_ID_KEY);
  }

  async validateBinding(): Promise<TvBindingValidation> {
    const shopId = this.getShopId();
    const deviceId = this.getBoundDeviceId();

    if (!shopId || !deviceId) {
      this.clearBinding();
      return { valid: false, shopId: null, deviceId: null, reason: 'missing' };
    }

    let deviceSnap;
    try {
      // La TV necesita una sesión (anónima) para que las reglas puedan
      // comprobar su vínculo antes de dejarle leer la cola.
      await this.authStore.signInAsDevice();
      deviceSnap = await this.runInCtx(() => getDoc(doc(this.firestore, `devices/${deviceId}`)));
    } catch (error) {
      logError('No se pudo validar el vínculo de la TV', error);
      return { valid: false, shopId, deviceId, reason: 'unavailable' };
    }

    if (!deviceSnap.exists()) {
      this.clearBinding();
      return { valid: false, shopId, deviceId, reason: 'not_found' };
    }

    const device = deviceSnap.data() as Partial<DeviceDoc>;
    if (device.userId !== shopId) {
      this.clearBinding();
      return { valid: false, shopId, deviceId, reason: 'owner_mismatch' };
    }

    const revoked = Number(device.revokedAt ?? 0) > 0;
    const inactive = device.active === false;
    if (revoked || inactive) {
      this.clearBinding();
      return { valid: false, shopId, deviceId, reason: 'revoked' };
    }

    // La sesión anónima puede rotar (datos del navegador borrados, TV
    // reiniciada). Se re-vincula al uid actual para no perder el acceso.
    const anonUid = this.authStore.deviceUser()?.uid;
    if (anonUid) {
      try {
        if (device.anonUid !== anonUid) {
          await this.runInCtx(() => updateDoc(doc(this.firestore, `devices/${deviceId}`), { anonUid }));
        }
        await this.registerDeviceSession(anonUid, shopId, deviceId);
      } catch (error) {
        logError('No se pudo restablecer la sesión del dispositivo', error);
        return { valid: false, shopId, deviceId, reason: 'unavailable' };
      }
    }

    this.storage.setLocalItem(this.DEVICE_ID_KEY, deviceId);
    return { valid: true, shopId, deviceId };
  }

  async getActivePairingCode(): Promise<ActiveTvCode | null> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return null;

    const stored = this.getStoredUserCode(userId);
    if (!stored) {
      return null;
    }

    const snap = await this.runInCtx(() => getDoc(doc(this.firestore, `device_codes/${stored.code}`)));
    if (!snap.exists()) {
      this.clearStoredUserCode(userId);
      return null;
    }

    const data = snap.data() as DeviceCodeDoc;
    if (!this.isReusableCode(data, userId, stored.code)) {
      this.clearStoredUserCode(userId);
      return null;
    }

    return { code: stored.code, expiresAt: data.expiresAt };
  }

  async ensurePairingCode(forceNew = false): Promise<ActiveTvCode> {
    const userId = this.requireAuthenticatedUserId();

    if (forceNew) {
      await this.invalidateActivePairingCode();
    } else {
      const current = await this.getActivePairingCode();
      if (current) {
        return current;
      }
    }

    return this.createPairingCode(userId);
  }

  async invalidateActivePairingCode(): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return;

    const stored = this.getStoredUserCode(userId);
    if (!stored) return;

    try {
      const codeRef = doc(this.firestore, `device_codes/${stored.code}`);
      const snap = await this.runInCtx(() => getDoc(codeRef));
      if (!snap.exists()) {
        return;
      }

      const data = snap.data() as DeviceCodeDoc;
      if (data.userId !== userId || data.consumedAt || data.revokedAt) {
        return;
      }

      await this.runInCtx(() => updateDoc(codeRef, {
        expiresAt: Date.now() - 1,
        revokedAt: Date.now()
      }));
    } finally {
      this.clearStoredUserCode(userId);
    }
  }

  generateCode(): string {
    // crypto en lugar de Math.random: un generador predecible haría inútil
    // ampliar el espacio de códigos.
    const digits = crypto.getRandomValues(new Uint8Array(PAIRING_CODE_LENGTH));
    return Array.from(digits, (byte) => String(byte % 10)).join('');
  }

  /** Deja el código en su forma canónica: solo dígitos y longitud fija. */
  private normalizeCode(code: string): string {
    return code.replace(/\D/g, '').slice(0, PAIRING_CODE_LENGTH);
  }

  async redeemCode(code: string): Promise<{ userId: string; deviceId: string }> {
    const normalizedCode = this.normalizeCode(code);

    // Sesión de dispositivo antes de leer el código: las reglas ya no exponen
    // device_codes de forma pública.
    const session = await this.authStore.signInAsDevice();

    const codeRef = doc(this.firestore, `device_codes/${normalizedCode}`);
    const snap = await this.runInCtx(() => getDoc(codeRef));

    if (!snap.exists()) throw new Error('Código no encontrado');

    const data = snap.data() as DeviceCodeDoc;
    if (data.expiresAt < Date.now() || data.revokedAt) throw new Error('El código ha expirado');
    if (data.consumedAt) throw new Error('El código ya fue utilizado');

    const deviceId = this.getDeviceId();
    const now = Date.now();
    const deviceRef = doc(this.firestore, `devices/${deviceId}`);
    const batch = writeBatch(this.firestore);

    batch.update(codeRef, {
      consumedAt: now,
      deviceId
    });
    batch.set(deviceRef, {
      deviceId,
      userId: data.userId,
      name: 'TV',
      createdAt: now,
      lastSeen: now,
      activationCode: normalizedCode,
      active: true,
      revokedAt: 0,
      anonUid: session.uid
    });

    await this.runInCtx(() => batch.commit());
    // Debe ir después del commit: la regla de device_sessions comprueba que
    // el documento del dispositivo ya existe.
    await this.registerDeviceSession(session.uid, data.userId, deviceId);
    this.saveBinding(data.userId, deviceId);

    return { userId: data.userId, deviceId };
  }

  /**
   * Publica el índice anonUid -> tienda que usan las reglas de Firestore para
   * autorizar la lectura de la cola desde la TV.
   */
  private async registerDeviceSession(anonUid: string, userId: string, deviceId: string): Promise<void> {
    await this.runInCtx(() =>
      setDoc(doc(this.firestore, `device_sessions/${anonUid}`), { userId, deviceId })
    );
  }

  async getPairingCodeStatus(code: string): Promise<PairingCodeStatus> {
    const normalizedCode = this.normalizeCode(code);
    const snap = await this.runInCtx(() => getDoc(doc(this.firestore, `device_codes/${normalizedCode}`)));

    if (!snap.exists()) {
      return {
        exists: false,
        consumed: false,
        expired: true,
        deviceId: null
      };
    }

    const data = snap.data() as DeviceCodeDoc;
    return {
      exists: true,
      consumed: !!data.consumedAt,
      expired: data.expiresAt <= Date.now() || !!data.revokedAt,
      deviceId: data.deviceId || null
    };
  }

  watchDevices(): Observable<DeviceDoc[]> {
    const userId = this.authStore.user()?.uid;
    if (!userId) return of([]);

    const q = query(
      collection(this.firestore, 'devices'),
      where('userId', '==', userId)
    );
    return this.runInCtx(() =>
      collectionData(q, { idField: 'deviceId' }) as Observable<DeviceDoc[]>
    );
  }

  async renameDevice(deviceId: string, name: string): Promise<void> {
    await this.runInCtx(() => updateDoc(doc(this.firestore, `devices/${deviceId}`), { name }));
  }

  async unlinkDevice(deviceId: string): Promise<void> {
    await this.runInCtx(() => deleteDoc(doc(this.firestore, `devices/${deviceId}`)));
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    try {
      await this.runInCtx(() => updateDoc(doc(this.firestore, `devices/${deviceId}`), { lastSeen: Date.now() }));
    } catch (error) {
      // El dispositivo ya no existe o se ha revocado. No es fatal para la
      // vista, pero debe quedar registrado (ENS op.exp.8).
      logError('No se pudo actualizar lastSeen del dispositivo', error);
    }
  }

  private async createPairingCode(userId: string): Promise<ActiveTvCode> {
    const code = await this.generateAvailableCode();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const codeRef = doc(this.firestore, `device_codes/${code}`);

    await this.runInCtx(() => setDoc(codeRef, {
      user_code: code,
      userId,
      deviceId: '',
      createdAt: Date.now(),
      expiresAt,
      consumedAt: 0,
      revokedAt: 0
    }));
    this.saveStoredUserCode(userId, code, expiresAt);
    return { code, expiresAt };
  }

  private async generateAvailableCode(): Promise<string> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const code = this.generateCode();
      const codeRef = doc(this.firestore, `device_codes/${code}`);
      const snap = await this.runInCtx(() => getDoc(codeRef));
      if (!snap.exists()) {
        return code;
      }

      const data = snap.data() as Partial<DeviceCodeDoc>;
      const isInactive = !data.expiresAt || data.expiresAt <= Date.now() || !!data.consumedAt || !!data.revokedAt;
      if (isInactive) {
        return code;
      }
    }

    throw new Error('No se pudo generar un código válido. Inténtalo de nuevo.');
  }

  private requireAuthenticatedUserId(): string {
    const userId = this.authStore.user()?.uid;
    if (!userId) {
      throw new Error('Debes iniciar sesión para vincular una TV.');
    }
    return userId;
  }

  private getStoredUserCode(userId: string): ActiveTvCode | null {
    const code = this.storage.getLocalItem(this.userCodeKey(userId));
    const expiresAtRaw = this.storage.getLocalItem(this.userCodeExpiryKey(userId));
    if (!code || !expiresAtRaw) {
      return null;
    }

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      this.clearStoredUserCode(userId);
      return null;
    }

    return { code, expiresAt };
  }

  private saveStoredUserCode(userId: string, code: string, expiresAt: number): void {
    this.storage.setLocalItem(this.userCodeKey(userId), code);
    this.storage.setLocalItem(this.userCodeExpiryKey(userId), String(expiresAt));
  }

  private clearStoredUserCode(userId: string): void {
    this.storage.removeLocalItem(this.userCodeKey(userId));
    this.storage.removeLocalItem(this.userCodeExpiryKey(userId));
  }

  private userCodeKey(userId: string): string {
    return `${this.USER_CODE_KEY_PREFIX}${userId}`;
  }

  private userCodeExpiryKey(userId: string): string {
    return `${this.USER_CODE_EXPIRY_PREFIX}${userId}`;
  }

  private isReusableCode(data: DeviceCodeDoc, userId: string, code: string): boolean {
    return (
      data.userId === userId &&
      data.user_code === code &&
      data.expiresAt > Date.now() &&
      !data.consumedAt &&
      !data.revokedAt
    );
  }
}
