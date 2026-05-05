import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch
} from '@angular/fire/firestore';
import { Storage, deleteObject, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { BarberProfile, BarberStatus, CreateBarberInput } from '../models/barber.model';
import { AuthStore } from '../stores/auth.store';

@Injectable({ providedIn: 'root' })
export class BarberService {
  private readonly firestore = inject(Firestore);
  private readonly storage = inject(Storage);
  private readonly injector = inject(EnvironmentInjector);
  private readonly authStore = inject(AuthStore);

  private get shopId(): string {
    const uid = this.authStore.user()?.uid;
    if (!uid) {
      throw new Error('No hay sesion activa');
    }
    return uid;
  }

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  private barbersPath(shopId = this.shopId): string {
    return `shops/${shopId}/barbers`;
  }

  observeBarbers(): Observable<BarberProfile[]> {
    const ref = this.runInCtx(() => collection(this.firestore, this.barbersPath()));
    return this.runInCtx(() => collectionData(query(ref, orderBy('sortOrder', 'asc')), { idField: 'id' })).pipe(
      map((rows) => rows.map((row) => this.toBarber(row as BarberProfile))),
      catchError(() => of([]))
    );
  }

  observeBarbersForShop(shopId: string): Observable<BarberProfile[]> {
    const ref = this.runInCtx(() => collection(this.firestore, this.barbersPath(shopId)));
    return this.runInCtx(() => collectionData(query(ref, orderBy('sortOrder', 'asc')), { idField: 'id' })).pipe(
      map((rows) => rows.map((row) => this.toBarber(row as BarberProfile))),
      catchError(() => of([]))
    );
  }

  async createBarber(input: CreateBarberInput): Promise<void> {
    const colRef = this.runInCtx(() => collection(this.firestore, this.barbersPath()));
    const docRef = this.runInCtx(() => doc(colRef));
    const nowMs = Date.now();
    const count = await this.runInCtx(() => getCountFromServer(colRef));
    await this.runInCtx(() =>
      setDoc(docRef, {
        name: input.name.trim(),
        photoUrl: input.photoUrl ?? '',
        status: 'hidden',
        isAvailableToday: false,
        createdAtMs: nowMs,
        updatedAtMs: nowMs,
        sortOrder: count.data().count
      })
    );
  }

  async updateBarber(barberId: string, data: Partial<Pick<BarberProfile, 'name' | 'photoUrl' | 'status' | 'isAvailableToday' | 'sortOrder'>>): Promise<void> {
    await this.runInCtx(() =>
      updateDoc(doc(this.firestore, `${this.barbersPath()}/${barberId}`), {
        ...data,
        updatedAtMs: Date.now()
      })
    );
  }

  async setBarberStatus(barberId: string, status: BarberStatus): Promise<void> {
    await this.updateBarber(barberId, { status });
  }

  async setDailyAvailability(activeBarberIds: string[]): Promise<void> {
    const nowMs = Date.now();
    const barbersRef = this.runInCtx(() => collection(this.firestore, this.barbersPath()));
    const snap = await this.runInCtx(() => getDocs(query(barbersRef)));
    const batch = this.runInCtx(() => writeBatch(this.firestore));
    snap.forEach((barberDoc) => {
      const isActive = activeBarberIds.includes(barberDoc.id);
      batch.update(barberDoc.ref, {
        isAvailableToday: isActive,
        status: isActive ? 'available' : 'hidden',
        updatedAtMs: nowMs
      });
    });
    await batch.commit();
  }

  async deleteBarber(barberId: string): Promise<void> {
    const barberRef = doc(this.firestore, `${this.barbersPath()}/${barberId}`);
    const snap = await this.runInCtx(() => getDoc(barberRef));
    if (snap.exists()) {
      const data = snap.data() as Partial<BarberProfile>;
      if (data.photoUrl) {
        try {
          await deleteObject(ref(this.storage, data.photoUrl));
        } catch {
          // Ignore stale file references.
        }
      }
    }
    await this.runInCtx(() => deleteDoc(barberRef));
  }

  async uploadBarberPhoto(file: File): Promise<string> {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const fileRef = ref(this.storage, `shops/${this.shopId}/barbers/${Date.now()}-${safeName}`);
    await uploadBytes(fileRef, file, { contentType: file.type });
    return getDownloadURL(fileRef);
  }

  private toBarber(value: BarberProfile): BarberProfile {
    return {
      id: value.id,
      name: value.name ?? '',
      photoUrl: value.photoUrl || undefined,
      status: (value.status as BarberStatus) ?? 'hidden',
      isAvailableToday: Boolean(value.isAvailableToday),
      createdAtMs: Number(value.createdAtMs ?? 0),
      updatedAtMs: Number(value.updatedAtMs ?? 0),
      sortOrder: Number(value.sortOrder ?? 0)
    };
  }
}
