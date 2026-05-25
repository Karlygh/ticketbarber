import {
  STAFF_PERMISSION_SUPPORT_MESSAGE,
  STAFF_WARNING_MESSAGES,
  toStaffSupportMessage
} from './staff-dashboard-messages.util';

describe('STAFF_WARNING_MESSAGES', () => {
  it('has closedDay and closeDayWithoutOpen messages', () => {
    expect(STAFF_WARNING_MESSAGES.closedDay).toBeTruthy();
    expect(STAFF_WARNING_MESSAGES.closeDayWithoutOpen).toBeTruthy();
  });
});

describe('toStaffSupportMessage', () => {
  it('returns permission message for "insufficient permissions" error', () => {
    const error = new Error('PERMISSION_DENIED: insufficient permissions');
    expect(toStaffSupportMessage(error, 'fallback')).toBe(STAFF_PERMISSION_SUPPORT_MESSAGE);
  });

  it('returns permission message for "storage/unauthorized" error', () => {
    const error = new Error('storage/unauthorized access denied');
    expect(toStaffSupportMessage(error, 'fallback')).toBe(STAFF_PERMISSION_SUPPORT_MESSAGE);
  });

  it('returns permission message for "permission_denied" error (case-insensitive)', () => {
    const error = new Error('PERMISSION_DENIED');
    expect(toStaffSupportMessage(error, 'fallback')).toBe(STAFF_PERMISSION_SUPPORT_MESSAGE);
  });

  it('returns the original error message for other errors', () => {
    const error = new Error('network timeout');
    expect(toStaffSupportMessage(error, 'fallback')).toBe('network timeout');
  });

  it('returns fallback for non-Error values', () => {
    expect(toStaffSupportMessage(null, 'fallback')).toBe('fallback');
    expect(toStaffSupportMessage(42, 'fallback')).toBe('fallback');
    expect(toStaffSupportMessage({}, 'fallback')).toBe('fallback');
  });
});
