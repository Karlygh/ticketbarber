import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BrowserStorageService {
  getSessionItem(key: string): string | null {
    return typeof window === 'undefined' ? null : sessionStorage.getItem(key);
  }

  setSessionItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(key, value);
  }

  removeSessionItem(key: string): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(key);
  }

  getLocalItem(key: string): string | null {
    return typeof window === 'undefined' ? null : localStorage.getItem(key);
  }

  setLocalItem(key: string, value: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  }

  removeLocalItem(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
}
