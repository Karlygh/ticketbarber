import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { ShopProfile, defaultOpeningHours } from '../models/shop.model';

@Injectable({ providedIn: 'root' })
export class ShopService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  async getShopProfile(uid: string): Promise<ShopProfile | null> {
    const ref = doc(this.firestore, `shops/${uid}`);
    const snap = await this.runInCtx(() => getDoc(ref));
    if (!snap.exists()) return null;
    return snap.data() as ShopProfile;
  }

  async updateShopProfile(uid: string, data: Partial<Omit<ShopProfile, 'uid'>>): Promise<void> {
    const ref = doc(this.firestore, `shops/${uid}`);
    const snap = await this.runInCtx(() => getDoc(ref));
    if (snap.exists()) {
      await this.runInCtx(() => updateDoc(ref, { ...data, updatedAt: Date.now() }));
    } else {
      const defaults: ShopProfile = {
        uid,
        shopName: '',
        logoUrl: '',
        description: '',
        address: '',
        phone: '',
        openingHours: defaultOpeningHours(),
        ...data,
        updatedAt: Date.now()
      };
      await this.runInCtx(() => setDoc(ref, defaults));
    }
  }
}
