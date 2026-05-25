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
} from './auth.store';

describe('AuthStore', () => {
  const mockAuth = {};

  const userServiceMock = {
    ensureUserProfile: jasmine.createSpy('ensureUserProfile').and.resolveTo()
  };

  const storageMock = {
    removeSessionItem: jasmine.createSpy('removeSessionItem'),
    removeLocalItem: jasmine.createSpy('removeLocalItem')
  };

  const onAuthStateChangedSpy = jasmine.createSpy('onAuthStateChanged');
  const signInWithPopupSpy = jasmine.createSpy('signInWithPopup');
  const signOutSpy = jasmine.createSpy('signOut').and.resolveTo();
  const getAdditionalUserInfoSpy = jasmine.createSpy('getAdditionalUserInfo');

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
      ]
    });
    return TestBed.inject(AuthStore);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    userServiceMock.ensureUserProfile.calls.reset();
    storageMock.removeSessionItem.calls.reset();
    storageMock.removeLocalItem.calls.reset();
    onAuthStateChangedSpy.calls.reset();
    signInWithPopupSpy.calls.reset();
    signOutSpy.calls.reset();
    getAdditionalUserInfoSpy.calls.reset();
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
});
