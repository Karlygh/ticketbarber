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

export interface DeviceDoc {
  deviceId: string;
  userId: string;
  name: string;
  createdAt: number;
  lastSeen: number;
  activationCode?: string;
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

@Injectable({ providedIn: 'root' })
export class TvAuthService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly authStore = inject(AuthStore);

  private readonly DEVICE_ID_KEY = 'tb_device_id';
  private readonly SHOP_ID_KEY = 'tb_shop_id';
  private readonly USER_CODE_KEY_PREFIX = 'tb_user_pair_code_';
  private readonly USER_CODE_EXPIRY_PREFIX = 'tb_user_pair_expiry_';

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  getDeviceId(): string {
    let id = localStorage.getItem(this.DEVICE_ID_KEY);
    if (!id) {
      id = 'tv_' + Array.from(crypto.getRandomValues(new Uint8Array(8)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem(this.DEVICE_ID_KEY, id);
    }
    return id;
  }

  getShopId(): string | null {
    return localStorage.getItem(this.SHOP_ID_KEY);
  }

  saveBinding(shopId: string): void {
    localStorage.setItem(this.SHOP_ID_KEY, shopId);
  }

  clearBinding(): void {
    localStorage.removeItem(this.SHOP_ID_KEY);
    localStorage.removeItem(this.DEVICE_ID_KEY);
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
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  async redeemCode(code: string): Promise<{ userId: string; deviceId: string }> {
    const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
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
      activationCode: normalizedCode
    });

    await this.runInCtx(() => batch.commit());
    this.saveBinding(data.userId);

    return { userId: data.userId, deviceId };
  }

  async getPairingCodeStatus(code: string): Promise<PairingCodeStatus> {
    const normalizedCode = code.replace(/\D/g, '').slice(0, 6);
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
    } catch {
      // El dispositivo ya no existe, ignorar.
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
    const code = localStorage.getItem(this.userCodeKey(userId));
    const expiresAtRaw = localStorage.getItem(this.userCodeExpiryKey(userId));
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
    localStorage.setItem(this.userCodeKey(userId), code);
    localStorage.setItem(this.userCodeExpiryKey(userId), String(expiresAt));
  }

  private clearStoredUserCode(userId: string): void {
    localStorage.removeItem(this.userCodeKey(userId));
    localStorage.removeItem(this.userCodeExpiryKey(userId));
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
