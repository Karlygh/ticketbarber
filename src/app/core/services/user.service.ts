import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { UserProfile } from '../models/user.model';

/**
 * Gestiona el documento users/{uid} en Firestore.
 * Se llama tras cada login para garantizar que el perfil exista.
 */
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly firestore = inject(Firestore);
  private readonly injector = inject(EnvironmentInjector);

  private runInCtx<T>(fn: () => T): T {
    return runInInjectionContext(this.injector, fn);
  }

  /**
   * Crea el perfil del usuario si no existe todavía (merge: false por defecto).
   * Llama a esto justo después de que el usuario autentica por primera vez.
   */
  async ensureUserProfile(user: User): Promise<void> {
    const ref = this.runInCtx(() => doc(this.firestore, `users/${user.uid}`));
    const snap = await this.runInCtx(() => getDoc(ref));
    if (!snap.exists()) {
      const profile: Omit<UserProfile, 'uid' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: this.runInCtx(() => serverTimestamp()) as ReturnType<typeof serverTimestamp>
      };
      await this.runInCtx(() => setDoc(ref, { uid: user.uid, ...profile }));
    }
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const ref = this.runInCtx(() => doc(this.firestore, `users/${uid}`));
    const snap = await this.runInCtx(() => getDoc(ref));
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }
}
