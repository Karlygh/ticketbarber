jest.mock('@angular/fire/firestore');
jest.mock('@angular/fire/auth');

import { TestBed } from '@angular/core/testing';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { ShopService } from './shop.service';

const docMock = doc as jest.Mock;
const getDocMock = getDoc as jest.Mock;
const setDocMock = setDoc as jest.Mock;
const updateDocMock = updateDoc as jest.Mock;

describe('ShopService', () => {
  let service: ShopService;
  const mockDocRef = { id: 'fake-ref' } as any;
  const mockFirestore = {} as Firestore;

  beforeEach(() => {
    jest.clearAllMocks();
    docMock.mockReturnValue(mockDocRef);
    setDocMock.mockResolvedValue(undefined);
    updateDocMock.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        ShopService,
        { provide: Firestore, useValue: mockFirestore }
      ]
    });
    service = TestBed.inject(ShopService);
  });

  afterEach(() => TestBed.resetTestingModule());

  describe('getShopProfile', () => {
    it('returns null when document does not exist', async () => {
      getDocMock.mockResolvedValue({ exists: () => false });

      const result = await service.getShopProfile('shop-1');

      expect(result).toBeNull();
    });

    it('returns profile with defaults for missing fields', async () => {
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => ({ shopName: 'Mi Barbería', phone: '600000000' })
      });

      const result = await service.getShopProfile('shop-1');

      expect(result).toEqual(expect.objectContaining({
        uid: 'shop-1',
        shopName: 'Mi Barbería',
        phone: '600000000',
        description: '',
        address: '',
        logoUrl: ''
      }));
    });

    it('normalizes opening hours days to always include all 7 days', async () => {
      getDocMock.mockResolvedValue({
        exists: () => true,
        data: () => ({ shopName: 'Test', openingHours: [] })
      });

      const result = await service.getShopProfile('shop-1');

      expect(result?.openingHours).toHaveLength(7);
    });
  });

  describe('updateShopProfile', () => {
    it('calls updateDoc when the document already exists', async () => {
      getDocMock.mockResolvedValue({ exists: () => true });

      await service.updateShopProfile('shop-1', { shopName: 'Nuevo nombre' });

      expect(updateDocMock).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({ shopName: 'Nuevo nombre' })
      );
      expect(setDocMock).not.toHaveBeenCalled();
    });

    it('calls setDoc with defaults when document does not exist', async () => {
      getDocMock.mockResolvedValue({ exists: () => false });

      await service.updateShopProfile('shop-1', { shopName: 'Nueva' });

      expect(setDocMock).toHaveBeenCalledWith(
        mockDocRef,
        expect.objectContaining({ uid: 'shop-1', shopName: 'Nueva' })
      );
      expect(updateDocMock).not.toHaveBeenCalled();
    });

    it('normalizes opening hours when included in update', async () => {
      getDocMock.mockResolvedValue({ exists: () => true });
      const partialHours = [{ day: 1, opens: '09:00', closes: '18:00', closed: false }];

      await service.updateShopProfile('shop-1', { openingHours: partialHours as any });

      const [, data] = updateDocMock.mock.calls[0] as any[];
      expect(data.openingHours).toHaveLength(7);
    });

    it('stamps updatedAt on every update', async () => {
      getDocMock.mockResolvedValue({ exists: () => true });

      const before = Date.now();
      await service.updateShopProfile('shop-1', {});
      const after = Date.now();

      const [, data] = updateDocMock.mock.calls[0] as any[];
      expect(data.updatedAt).toBeGreaterThanOrEqual(before);
      expect(data.updatedAt).toBeLessThanOrEqual(after);
    });
  });
});
