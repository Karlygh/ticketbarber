import { BrowserStorageService } from './browser-storage.service';

describe('BrowserStorageService', () => {
  let service: BrowserStorageService;

  beforeEach(() => {
    service = new BrowserStorageService();
    sessionStorage.clear();
    localStorage.clear();
  });

  // --- Session Storage ---

  describe('session storage', () => {
    it('stores and retrieves a value', () => {
      service.setSessionItem('key1', 'value1');
      expect(service.getSessionItem('key1')).toBe('value1');
    });

    it('returns null for a non-existent key', () => {
      expect(service.getSessionItem('missing')).toBeNull();
    });

    it('returns null after removing a key', () => {
      service.setSessionItem('key1', 'value1');
      service.removeSessionItem('key1');
      expect(service.getSessionItem('key1')).toBeNull();
    });

    it('stores empty string value', () => {
      service.setSessionItem('empty', '');
      expect(service.getSessionItem('empty')).toBe('');
    });

    it('keeps independent keys separate', () => {
      service.setSessionItem('a', '1');
      service.setSessionItem('b', '2');
      expect(service.getSessionItem('a')).toBe('1');
      expect(service.getSessionItem('b')).toBe('2');
    });
  });

  // --- Local Storage ---

  describe('local storage', () => {
    it('stores and retrieves a value', () => {
      service.setLocalItem('key1', 'value1');
      expect(service.getLocalItem('key1')).toBe('value1');
    });

    it('returns null for a non-existent key', () => {
      expect(service.getLocalItem('missing')).toBeNull();
    });

    it('returns null after removing a key', () => {
      service.setLocalItem('key1', 'value1');
      service.removeLocalItem('key1');
      expect(service.getLocalItem('key1')).toBeNull();
    });

    it('stores empty string value', () => {
      service.setLocalItem('empty', '');
      expect(service.getLocalItem('empty')).toBe('');
    });

    it('persists across service instances', () => {
      service.setLocalItem('persistent', 'yes');
      const newInstance = new BrowserStorageService();
      expect(newInstance.getLocalItem('persistent')).toBe('yes');
    });
  });
});
