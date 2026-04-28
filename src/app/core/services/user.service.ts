import { Injectable, inject } from '@angular/core';
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

  /**
   * Crea el perfil del usuario si no existe todavía (merge: false por defecto).
   * Llama a esto justo después de que el usuario autentica por primera vez.
   */
  async ensureUserProfile(user: User): Promise<void> {
    const ref = doc(this.firestore, `users/${user.uid}`);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const profile: Omit<UserProfile, 'uid' | 'createdAt'> & { createdAt: ReturnType<typeof serverTimestamp> } = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: serverTimestamp() as ReturnType<typeof serverTimestamp>
      };
      await setDoc(ref, { uid: user.uid, ...profile });
    }
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const ref = doc(this.firestore, `users/${uid}`);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as UserProfile) : null;
  }
}
