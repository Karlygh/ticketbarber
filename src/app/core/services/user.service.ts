import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from '@angular/fire/firestore';
import { User } from '@angular/fire/auth';
import { AuthEvent, UserProfile } from '../models/user.model';
import { logError } from '../utils/logger.util';

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

  /**
   * Rota lastLoginAtMs -> previousLoginAtMs y devuelve el acceso anterior,
   * que es el que se muestra al usuario. ENS op.acc.5.r5.2.
   */
  async recordLogin(uid: string): Promise<number | null> {
    const ref = this.runInCtx(() => doc(this.firestore, `users/${uid}`));
    const snap = await this.runInCtx(() => getDoc(ref));
    const previous = snap.exists() ? (snap.data() as UserProfile).lastLoginAtMs ?? null : null;

    await this.runInCtx(() =>
      setDoc(ref, { lastLoginAtMs: Date.now(), previousLoginAtMs: previous }, { merge: true })
    );
    return previous;
  }

  /**
   * Registra un evento de acceso en users/{uid}/auth_events.
   * Nunca debe interrumpir el flujo de login: los fallos solo se loguean.
   * ENS op.acc.5.r5.1.
   */
  async recordAuthEvent(uid: string, event: Omit<AuthEvent, 'atMs' | 'userAgent'>): Promise<void> {
    try {
      const col = this.runInCtx(() => collection(this.firestore, `users/${uid}/auth_events`));
      await this.runInCtx(() =>
        addDoc(col, {
          ...event,
          atMs: Date.now(),
          userAgent: navigator.userAgent.slice(0, 256)
        } satisfies AuthEvent)
      );
    } catch (error) {
      logError('No se pudo registrar el evento de acceso', error);
    }
  }
}
