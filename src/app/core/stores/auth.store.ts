import { Injectable, signal, computed, inject } from '@angular/core';
import { Auth, GoogleAuthProvider, User, onAuthStateChanged, signInWithPopup, signOut } from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly auth = inject(Auth);
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
    onAuthStateChanged(this.auth, (user) => {
      this.userState.set(user);
      if (!this.readyState()) {
        this.readyState.set(true);
        this.resolveReady();
      }
    });
  }

  waitUntilReady(): Promise<void> {
    if (this.readyState()) {
      return Promise.resolve();
    }
    return this.readyPromise;
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(this.auth, provider);
  }

  async signOut(): Promise<void> {
    await signOut(this.auth);
  }
}
