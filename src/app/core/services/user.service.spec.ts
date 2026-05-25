jest.mock('@angular/fire/firestore');
jest.mock('@angular/fire/auth');

import { TestBed } from '@angular/core/testing';
import { Firestore, doc, getDoc, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { UserService } from './user.service';

const docMock = doc as jest.Mock;
const getDocMock = getDoc as jest.Mock;
const setDocMock = setDoc as jest.Mock;
const serverTimestampMock = serverTimestamp as jest.Mock;

describe('UserService', () => {
  let service: UserService;
  const mockDocRef = { id: 'fake-ref' } as any;
  const mockFirestore = {} as Firestore;

  beforeEach(() => {
    jest.clearAllMocks();
    docMock.mockReturnValue(mockDocRef);
    serverTimestampMock.mockReturnValue({ _type: 'server_timestamp' });
    setDocMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: Firestore, useValue: mockFirestore }
      ]
    });
    service = TestBed.inject(UserService);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('ensureUserProfile', () => {
    it('creates a profile document when user does not exist', async () => {
      getDocMock.mockResolvedValue({ exists: () => false });

      await service.ensureUserProfile({ uid: 'u1', email: 'a@b.com', displayName: 'Test', photoURL: null } as any);

      expect(setDocMock).toHaveBeenCalledTimes(1);
      expect(setDocMock).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({ uid: 'u1', email: 'a@b.com' })
      );
    });

    it('does not call setDoc when profile already exists', async () => {
      getDocMock.mockResolvedValue({ exists: () => true });

      await service.ensureUserProfile({ uid: 'u1' } as any);

      expect(setDocMock).not.toHaveBeenCalled();
    });

    it('stores createdAt using serverTimestamp', async () => {
      const fakeTimestamp = { _type: 'server_timestamp' };
      serverTimestampMock.mockReturnValue(fakeTimestamp);
      getDocMock.mockResolvedValue({ exists: () => false });

      await service.ensureUserProfile({ uid: 'u1', email: null, displayName: null, photoURL: null } as any);

      const [, data] = setDocMock.mock.calls[0] as any[];
      expect(data).toEqual(expect.objectContaining({ createdAt: fakeTimestamp }));
    });
  });

  describe('getUserProfile', () => {
    it('returns the profile data when document exists', async () => {
      const profileData = { uid: 'u1', displayName: 'Test', email: 'a@b.com' };
      getDocMock.mockResolvedValue({ exists: () => true, data: () => profileData });

      const result = await service.getUserProfile('u1');

      expect(result).toEqual(profileData as any);
    });

    it('returns null when document does not exist', async () => {
      getDocMock.mockResolvedValue({ exists: () => false });

      const result = await service.getUserProfile('u1');

      expect(result).toBeNull();
    });
  });
});
