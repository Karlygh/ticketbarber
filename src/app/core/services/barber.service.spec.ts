jest.mock('@angular/fire/firestore');
jest.mock('@angular/fire/storage');
jest.mock('@angular/fire/auth');

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  Firestore,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  writeBatch
} from '@angular/fire/firestore';
import { Storage, deleteObject, getDownloadURL, ref as storageRef, uploadBytes } from '@angular/fire/storage';
import { BarberService } from './barber.service';
import { AuthStore } from '../stores/auth.store';

const collectionMock = collection as jest.Mock;
const collectionDataMock = collectionData as jest.Mock;
const docMock = doc as jest.Mock;
const getDocMock = getDoc as jest.Mock;
const getDocsMock = getDocs as jest.Mock;
const setDocMock = setDoc as jest.Mock;
const updateDocMock = updateDoc as jest.Mock;
const deleteDocMock = deleteDoc as jest.Mock;
const getCountFromServerMock = getCountFromServer as jest.Mock;
const writeBatchMock = writeBatch as jest.Mock;
const deleteObjectMock = deleteObject as jest.Mock;
const getDownloadURLMock = getDownloadURL as jest.Mock;
const uploadBytesMock = uploadBytes as jest.Mock;
const storageRefMock = storageRef as jest.Mock;

describe('BarberService', () => {
  let service: BarberService;
  const mockFirestore = {} as Firestore;
  const mockStorage = {} as Storage;
  const mockDocRef = { id: 'barber-doc-id' } as any;
  const mockColRef = {} as any;

  const authStoreMock = {
    user: jest.fn().mockReturnValue({ uid: 'shop-owner-uid' })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    collectionMock.mockReturnValue(mockColRef);
    docMock.mockReturnValue(mockDocRef);
    setDocMock.mockResolvedValue(undefined);
    updateDocMock.mockResolvedValue(undefined);
    deleteDocMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        BarberService,
        { provide: Firestore, useValue: mockFirestore },
        { provide: Storage, useValue: mockStorage },
        { provide: AuthStore, useValue: authStoreMock }
      ]
    });
    service = TestBed.inject(BarberService);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('observeBarbers', () => {
    it('emits mapped barber profiles sorted by sortOrder', () => {
      const raw = [
        { id: 'b1', name: 'Ana', status: 'available', isAvailableToday: 1, createdAtMs: '100', updatedAtMs: '200', sortOrder: '1', photoUrl: '' }
      ];
      collectionDataMock.mockReturnValue(of(raw));

      const result: any[] = [];
      service.observeBarbers().subscribe((barbers) => result.push(...barbers));

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expect.objectContaining({
        id: 'b1',
        name: 'Ana',
        isAvailableToday: true,
        createdAtMs: 100,
        sortOrder: 1
      }));
    });

    it('returns empty array when collectionData errors', () => {
      const { throwError } = require('rxjs');
      collectionDataMock.mockReturnValue(throwError(() => new Error('Firestore error')));

      let result: any[] | undefined;
      service.observeBarbers().subscribe((barbers) => { result = barbers; });

      expect(result).toEqual([]);
    });
  });

  describe('createBarber', () => {
    it('sets a new barber document with correct initial values', async () => {
      getCountFromServerMock.mockResolvedValue({ data: () => ({ count: 3 }) });

      await service.createBarber({ name: '  Carlos  ', photoUrl: '' });

      expect(setDocMock).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({
          name: 'Carlos',
          status: 'hidden',
          isAvailableToday: false,
          sortOrder: 3
        })
      );
    });
  });

  describe('updateBarber', () => {
    it('calls updateDoc with the provided fields and updatedAtMs', async () => {
      await service.updateBarber('barber-1', { name: 'Nuevo Nombre', status: 'available' });

      expect(updateDocMock).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({ name: 'Nuevo Nombre', status: 'available' })
      );
      const [, data] = updateDocMock.mock.calls[0] as any[];
      expect(typeof data.updatedAtMs).toBe('number');
    });
  });

  describe('setDailyAvailability', () => {
    it('sets active barbers as available and inactive as hidden', async () => {
      const barberDocs = [
        { id: 'b1', ref: { id: 'b1' } },
        { id: 'b2', ref: { id: 'b2' } }
      ];
      getDocsMock.mockResolvedValue({ forEach: (cb: any) => barberDocs.forEach(cb) });

      const mockBatch = { update: jest.fn(), commit: jest.fn().mockResolvedValue(undefined) };
      writeBatchMock.mockReturnValue(mockBatch);

      await service.setDailyAvailability(['b1']);

      expect(mockBatch.update).toHaveBeenCalledWith(
        { id: 'b1' },
        expect.objectContaining({ isAvailableToday: true, status: 'available' })
      );
      expect(mockBatch.update).toHaveBeenCalledWith(
        { id: 'b2' },
        expect.objectContaining({ isAvailableToday: false, status: 'hidden' })
      );
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('deleteBarber', () => {
    it('deletes photo from storage before deleting document', async () => {
      getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ photoUrl: 'gs://bucket/photo.jpg' }) });
      const mockRef = {} as any;
      storageRefMock.mockReturnValue(mockRef);
      deleteObjectMock.mockResolvedValue(undefined);

      await service.deleteBarber('barber-1');

      expect(deleteObjectMock).toHaveBeenCalledWith(mockRef);
      expect(deleteDocMock).toHaveBeenCalled();
    });

    it('deletes document even if storage deletion fails', async () => {
      getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ photoUrl: 'gs://bucket/photo.jpg' }) });
      storageRefMock.mockReturnValue({} as any);
      deleteObjectMock.mockRejectedValue(new Error('storage/object-not-found'));

      await service.deleteBarber('barber-1');

      expect(deleteDocMock).toHaveBeenCalled();
    });

    it('deletes document when barber has no photo', async () => {
      getDocMock.mockResolvedValue({ exists: () => true, data: () => ({ photoUrl: '' }) });

      await service.deleteBarber('barber-1');

      expect(deleteObjectMock).not.toHaveBeenCalled();
      expect(deleteDocMock).toHaveBeenCalled();
    });

    it('deletes document when barber document does not exist in Firestore', async () => {
      getDocMock.mockResolvedValue({ exists: () => false });

      await service.deleteBarber('barber-1');

      expect(deleteDocMock).toHaveBeenCalled();
    });
  });

  describe('uploadBarberPhoto', () => {
    it('uploads file and returns download URL', async () => {
      const mockFileRef = {} as any;
      storageRefMock.mockReturnValue(mockFileRef);
      uploadBytesMock.mockResolvedValue(undefined);
      getDownloadURLMock.mockResolvedValue('https://cdn.example.com/photo.jpg');

      const file = new File(['data'], 'photo.jpg', { type: 'image/jpeg' });
      const url = await service.uploadBarberPhoto(file);

      expect(uploadBytesMock).toHaveBeenCalledWith(mockFileRef, file, { contentType: 'image/jpeg' });
      expect(url).toBe('https://cdn.example.com/photo.jpg');
    });
  });

  describe('shopId guard', () => {
    it('throws when no user is authenticated', () => {
      authStoreMock.user.mockReturnValue(null);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          BarberService,
          { provide: Firestore, useValue: mockFirestore },
          { provide: Storage, useValue: mockStorage },
          { provide: AuthStore, useValue: { user: () => null } }
        ]
      });
      const unauthService = TestBed.inject(BarberService);
      expect(() => (unauthService as any).shopId).toThrow('No hay sesion activa');
    });
  });
});
