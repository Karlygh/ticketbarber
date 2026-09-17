import { TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { BrowserStorageService } from '../services/browser-storage.service';
import { UserService } from '../services/user.service';
import {
  AuthStore,
  AUTH_ON_STATE_CHANGED,
  AUTH_SIGN_IN_WITH_POPUP,
  AUTH_SIGN_OUT,
  AUTH_GET_ADDITIONAL_USER_INFO,
  AUTH_SIGN_IN_ANONYMOUSLY,
  AUTH_REAUTHENTICATE_WITH_POPUP,
  INACTIVITY_LIMIT_MS,
} from './auth.store';

describe('AuthStore', () => {
  const mockAuth = {};

  const userServiceMock = {
    ensureUserProfile: jasmine.createSpy('ensureUserProfile').and.resolveTo(),
    recordLogin: jasmine.createSpy('recordLogin').and.resolveTo(null),
    recordAuthEvent: jasmine.createSpy('recordAuthEvent').and.resolveTo()
  };

  const storageMock = {
    removeSessionItem: jasmine.createSpy('removeSessionItem'),
    removeLocalItem: jasmine.createSpy('removeLocalItem'),
    setLocalItem: jasmine.createSpy('setLocalItem'),
    getLocalItem: jasmine.createSpy('getLocalItem').and.returnValue(null)
  };

  const onAuthStateChangedSpy = jasmine.createSpy('onAuthStateChanged');
  const signInWithPopupSpy = jasmine.createSpy('signInWithPopup');
  const signOutSpy = jasmine.createSpy('signOut').and.resolveTo();
  const getAdditionalUserInfoSpy = jasmine.createSpy('getAdditionalUserInfo');
  const signInAnonymouslySpy = jasmine.createSpy('signInAnonymously');
  const reauthenticateWithPopupSpy = jasmine.createSpy('reauthenticateWithPopup').and.resolveTo();

  function setup(initialUser: any = null): AuthStore {
    onAuthStateChangedSpy.and.callFake((_: any, cb: any) => {
      cb(initialUser);
      return () => {};
    });
    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: Auth, useValue: mockAuth },
        { provide: UserService, useValue: userServiceMock },
        { provide: BrowserStorageService, useValue: storageMock },
        { provide: AUTH_ON_STATE_CHANGED, useValue: onAuthStateChangedSpy },
        { provide: AUTH_SIGN_IN_WITH_POPUP, useValue: signInWithPopupSpy },
        { provide: AUTH_SIGN_OUT, useValue: signOutSpy },
        { provide: AUTH_GET_ADDITIONAL_USER_INFO, useValue: getAdditionalUserInfoSpy },
        { provide: AUTH_SIGN_IN_ANONYMOUSLY, useValue: signInAnonymouslySpy },
        { provide: AUTH_REAUTHENTICATE_WITH_POPUP, useValue: reauthenticateWithPopupSpy },
      ]
    });
    return TestBed.inject(AuthStore);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    userServiceMock.ensureUserProfile.calls.reset();
    userServiceMock.recordLogin.calls.reset();
    userServiceMock.recordLogin.and.resolveTo(null);
    userServiceMock.recordAuthEvent.calls.reset();
    storageMock.removeSessionItem.calls.reset();
    storageMock.removeLocalItem.calls.reset();
    storageMock.setLocalItem.calls.reset();
    storageMock.getLocalItem.calls.reset();
    storageMock.getLocalItem.and.returnValue(null);
    onAuthStateChangedSpy.calls.reset();
    signInWithPopupSpy.calls.reset();
    signOutSpy.calls.reset();
    getAdditionalUserInfoSpy.calls.reset();
    signInAnonymouslySpy.calls.reset();
    reauthenticateWithPopupSpy.calls.reset();
  });

  describe('initial state', () => {
    it('starts with no user when auth emits null', () => {
      const store = setup(null);
      expect(store.user()).toBeNull();
      expect(store.isAuthenticated()).toBeFalse();
    });

    it('marks ready after the first auth state emission', () => {
      const store = setup(null);
      expect(store.ready()).toBeTrue();
    });

    it('sets user signal when auth emits a user', () => {
      const mockUser = { uid: 'user-1' } as any;
      const store = setup(mockUser);
      expect(store.user()).toBe(mockUser);
      expect(store.isAuthenticated()).toBeTrue();
    });
  });

  describe('waitUntilReady', () => {
    it('resolves immediately when already ready', async () => {
      const store = setup(null);
      await expectAsync(store.waitUntilReady()).toBeResolved();
    });
  });

  describe('signOut', () => {
    it('removes all session and local storage keys', async () => {
      const mockUser = { uid: 'uid-99' } as any;
      const store = setup(mockUser);

      await store.signOut();

      expect(storageMock.removeSessionItem).toHaveBeenCalledWith('pendingPriceId');
      expect(storageMock.removeSessionItem).toHaveBeenCalledWith('premiumCelebrationShown');
      expect(storageMock.removeLocalItem).toHaveBeenCalledWith('tb_shop_id');
      expect(storageMock.removeLocalItem).toHaveBeenCalledWith('tb_device_id');
      expect(storageMock.removeLocalItem).toHaveBeenCalledWith('tb_user_pair_code_uid-99');
      expect(storageMock.removeLocalItem).toHaveBeenCalledWith('tb_user_pair_expiry_uid-99');
    });

    it('calls firebase signOut', async () => {
      const store = setup(null);

      await store.signOut();

      expect(signOutSpy).toHaveBeenCalled();
    });
  });

  describe('signInWithGoogle', () => {
    it('calls ensureUserProfile with the authenticated user', async () => {
      const mockUser = { uid: 'new-user' } as any;
      const store = setup(null);
      signInWithPopupSpy.and.resolveTo({ user: mockUser } as any);
      getAdditionalUserInfoSpy.and.returnValue({ isNewUser: true } as any);

      await store.signInWithGoogle();

      expect(userServiceMock.ensureUserProfile).toHaveBeenCalledWith(mockUser);
    });

    it('returns isNewUser: true for first-time users', async () => {
      const store = setup(null);
      signInWithPopupSpy.and.resolveTo({ user: { uid: 'u1' } } as any);
      getAdditionalUserInfoSpy.and.returnValue({ isNewUser: true } as any);

      const result = await store.signInWithGoogle();

      expect(result.isNewUser).toBeTrue();
    });

    it('returns isNewUser: false for returning users', async () => {
      const store = setup(null);
      signInWithPopupSpy.and.resolveTo({ user: { uid: 'u1' } } as any);
      getAdditionalUserInfoSpy.and.returnValue({ isNewUser: false } as any);

      const result = await store.signInWithGoogle();

      expect(result.isNewUser).toBeFalse();
    });

    it('returns isNewUser: false when getAdditionalUserInfo returns null', async () => {
      const store = setup(null);
      signInWithPopupSpy.and.resolveTo({ user: { uid: 'u1' } } as any);
      getAdditionalUserInfoSpy.and.returnValue(null);

      const result = await store.signInWithGoogle();

      expect(result.isNewUser).toBeFalse();
    });
  });

  describe('sesiones de dispositivo (TV)', () => {
    it('no considera autenticada una sesión anónima', () => {
      // Si user() devolviese la sesión anónima, una TV vinculada pasaría
      // staffAuthGuard y entraría al panel de gestión.
      const store = setup({ uid: 'anon-1', isAnonymous: true } as any);

      expect(store.user()).toBeNull();
      expect(store.isAuthenticated()).toBeFalse();
      expect(store.deviceUser()?.uid).toBe('anon-1');
    });

    it('reutiliza la sesión anónima existente', async () => {
      const store = setup({ uid: 'anon-1', isAnonymous: true } as any);

      const result = await store.signInAsDevice();

      expect(result.uid).toBe('anon-1');
      expect(signInAnonymouslySpy).not.toHaveBeenCalled();
    });

    it('abre una sesión anónima cuando no hay ninguna', async () => {
      const store = setup(null);
      signInAnonymouslySpy.and.resolveTo({ user: { uid: 'anon-new' } } as any);

      const result = await store.signInAsDevice();

      expect(signInAnonymouslySpy).toHaveBeenCalled();
      expect(result.uid).toBe('anon-new');
    });
  });

  describe('enforceInactivityLimit', () => {
    it('cierra la sesión cuando se supera el límite', async () => {
      const store = setup({ uid: 'uid-1', isAnonymous: false } as any);
      storageMock.getLocalItem.and.returnValue(
        String(Date.now() - INACTIVITY_LIMIT_MS - 1000)
      );

      await expectAsync(store.enforceInactivityLimit()).toBeResolvedTo(true);
      expect(signOutSpy).toHaveBeenCalled();
    });

    it('mantiene la sesión dentro del límite', async () => {
      const store = setup({ uid: 'uid-1', isAnonymous: false } as any);
      storageMock.getLocalItem.and.returnValue(String(Date.now() - 1000));

      await expectAsync(store.enforceInactivityLimit()).toBeResolvedTo(false);
      expect(signOutSpy).not.toHaveBeenCalled();
    });

    it('no caduca sesiones anteriores a la política', async () => {
      const store = setup({ uid: 'uid-1', isAnonymous: false } as any);
      storageMock.getLocalItem.and.returnValue(null);

      await expectAsync(store.enforceInactivityLimit()).toBeResolvedTo(false);
      expect(signOutSpy).not.toHaveBeenCalled();
    });
  });
});
