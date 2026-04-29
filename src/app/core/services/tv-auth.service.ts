import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  doc,
  deleteDoc,
  getDoc,
  query,
  setDoc,
  updateDoc,
  where
} from '@angular/fire/firestore';
import { Observable, from, interval, switchMap, map, distinctUntilChanged, startWith, catchError, of, defer } from 'rxjs';
import { AuthStore } from '../stores/auth.store';

export interface DeviceDoc {
  deviceId: string;
  userId: string;
  name: string;
  createdAt: number;
  lastSeen: number;
}

export interface PendingTvCode {
  code: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class TvAuthService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);
  private readonly authStore = inject(AuthStore);

  private readonly DEVICE_ID_KEY = 'tb_device_id';
  private readonly SHOP_ID_KEY = 'tb_shop_id';
  private readonly PENDING_CODE_KEY = 'tb_pending_code';
  private readonly PENDING_EXPIRES_KEY = 'tb_pending_expires_at';

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  // ── Gestión de localStorage ──────────────────────────────────────────────

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
    this.clearPendingCode();
  }

  getPendingCode(): PendingTvCode | null {
    const code = localStorage.getItem(this.PENDING_CODE_KEY);
    const expiresAtRaw = localStorage.getItem(this.PENDING_EXPIRES_KEY);
    if (!code || !expiresAtRaw) return null;

    const expiresAt = Number(expiresAtRaw);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      this.clearPendingCode();
      return null;
    }

    return { code, expiresAt };
  }

  savePendingCode(code: string, expiresAt: number): void {
    localStorage.setItem(this.PENDING_CODE_KEY, code);
    localStorage.setItem(this.PENDING_EXPIRES_KEY, String(expiresAt));
  }

  clearPendingCode(): void {
    localStorage.removeItem(this.PENDING_CODE_KEY);
    localStorage.removeItem(this.PENDING_EXPIRES_KEY);
  }

  // ── Generación de código ─────────────────────────────────────────────────

  generateCode(): string {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  // ── Operaciones en device_codes ──────────────────────────────────────────

  async createDeviceCode(code: string, deviceId: string): Promise<void> {
    const expiresAt = Date.now() + 15 * 60 * 1000;
    const codeRef = doc(this.firestore, `device_codes/${code}`);
    await setDoc(codeRef, {
      user_code: code,
      userId: '',
      deviceId,
      createdAt: Date.now(),
      expiresAt
    });
    this.savePendingCode(code, expiresAt);
  }

  /** Hace polling cada 3 s y emite el userId cuando la TV es activada. */
  watchCodeActivation(code: string): Observable<string | null> {
    return this.runInCtx(() =>
      interval(3000).pipe(
        startWith(0),
        switchMap(() =>
          defer(() => from(getDoc(doc(this.firestore, `device_codes/${code}`)))).pipe(
            map(snap => {
              if (!snap.exists()) return null;
              const data = snap.data() as { userId: string; expiresAt: number };
              if (data.expiresAt < Date.now()) return null; // expirado
              return data.userId || null;
            }),
            catchError(() => of(null))
          )
        ),
        distinctUntilChanged()
      )
    );
  }

  /** Activa un código: escribe userId y crea el documento de dispositivo. */
  async activateCode(code: string): Promise<void> {
    const userId = this.authStore.user()?.uid;
    if (!userId) throw new Error('No autenticado');

    const codeRef = doc(this.firestore, `device_codes/${code}`);
    const snap = await getDoc(codeRef);

    if (!snap.exists()) throw new Error('Código no encontrado');

    const data = snap.data() as { userId: string; expiresAt: number; deviceId: string };
    if (data.expiresAt < Date.now()) throw new Error('El código ha expirado');
    if (data.userId) throw new Error('El código ya fue utilizado');

    await updateDoc(codeRef, { userId });

    const deviceRef = doc(this.firestore, `devices/${data.deviceId}`);
    await setDoc(deviceRef, {
      deviceId: data.deviceId,
      userId,
      name: 'TV',
      createdAt: Date.now(),
      lastSeen: Date.now()
    });
  }

  // ── Operaciones en devices ───────────────────────────────────────────────

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
    await updateDoc(doc(this.firestore, `devices/${deviceId}`), { name });
  }

  async unlinkDevice(deviceId: string): Promise<void> {
    await deleteDoc(doc(this.firestore, `devices/${deviceId}`));
  }

  async updateLastSeen(deviceId: string): Promise<void> {
    try {
      await updateDoc(doc(this.firestore, `devices/${deviceId}`), { lastSeen: Date.now() });
    } catch {
      // El dispositivo ya no existe, ignorar
    }
  }
}
