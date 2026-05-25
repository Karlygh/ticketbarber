import { FormBuilder, FormArray } from '@angular/forms';
import {
  DEFAULT_SHOP_HOURS_SLOT,
  createShopBasicForm,
  createShopHoursForm,
  createShopSlotFormGroup,
  getGlobalHoursFromSlots,
  patchGlobalHoursForm,
  validateShopGlobalHours
} from './account-shop-form.util';

describe('createShopBasicForm', () => {
  const fb = new FormBuilder();

  it('is invalid when shopName is empty', () => {
    const form = createShopBasicForm(fb);
    expect(form.valid).toBeFalse();
  });

  it('is valid when shopName is provided within limits', () => {
    const form = createShopBasicForm(fb);
    form.get('shopName')!.setValue('Mi Barbería');
    expect(form.valid).toBeTrue();
  });

  it('shopName exceeding 60 chars makes form invalid', () => {
    const form = createShopBasicForm(fb);
    form.get('shopName')!.setValue('A'.repeat(61));
    expect(form.get('shopName')!.valid).toBeFalse();
  });

  it('description exceeding 200 chars makes form invalid', () => {
    const form = createShopBasicForm(fb);
    form.get('shopName')!.setValue('Barber');
    form.get('description')!.setValue('X'.repeat(201));
    expect(form.get('description')!.valid).toBeFalse();
  });

  it('address exceeding 120 chars makes form invalid', () => {
    const form = createShopBasicForm(fb);
    form.get('address')!.setValue('X'.repeat(121));
    expect(form.get('address')!.valid).toBeFalse();
  });

  it('phone exceeding 20 chars makes form invalid', () => {
    const form = createShopBasicForm(fb);
    form.get('phone')!.setValue('1'.repeat(21));
    expect(form.get('phone')!.valid).toBeFalse();
  });
});

describe('createShopHoursForm', () => {
  const fb = new FormBuilder();

  it('creates a form group with a slots FormArray', () => {
    const form = createShopHoursForm(fb);
    expect(form.get('slots')).toBeInstanceOf(FormArray);
  });

  it('initializes slots with one default slot', () => {
    const form = createShopHoursForm(fb);
    const slots = form.get('slots') as FormArray;
    expect(slots.length).toBe(1);
    expect(slots.at(0).get('opens')!.value).toBe(DEFAULT_SHOP_HOURS_SLOT.opens);
    expect(slots.at(0).get('closes')!.value).toBe(DEFAULT_SHOP_HOURS_SLOT.closes);
  });
});

describe('createShopSlotFormGroup', () => {
  const fb = new FormBuilder();

  it('creates a form group with opens and closes controls', () => {
    const group = createShopSlotFormGroup(fb, { opens: '10:00', closes: '18:00' });
    expect(group.get('opens')!.value).toBe('10:00');
    expect(group.get('closes')!.value).toBe('18:00');
  });

  it('is invalid when opens is empty', () => {
    const group = createShopSlotFormGroup(fb, { opens: '', closes: '18:00' });
    expect(group.get('opens')!.valid).toBeFalse();
  });

  it('is invalid when closes is empty', () => {
    const group = createShopSlotFormGroup(fb, { opens: '09:00', closes: '' });
    expect(group.get('closes')!.valid).toBeFalse();
  });
});

describe('getGlobalHoursFromSlots', () => {
  const fb = new FormBuilder();

  it('returns closed=false and the slots from the form', () => {
    const form = createShopHoursForm(fb);
    const slots = form.get('slots') as FormArray;
    const result = getGlobalHoursFromSlots(slots);
    expect(result.closed).toBeFalse();
    expect(result.slots.length).toBe(1);
    expect(result.slots[0]).toEqual({ opens: '09:00', closes: '19:00' });
  });

  it('filters out slots with empty opens or closes', () => {
    const slots = fb.array([
      createShopSlotFormGroup(fb, { opens: '09:00', closes: '13:00' }),
      createShopSlotFormGroup(fb, { opens: '', closes: '18:00' })
    ]);
    const result = getGlobalHoursFromSlots(slots);
    expect(result.slots.length).toBe(1);
  });

  it('caps at 2 slots even if FormArray has more', () => {
    const slots = fb.array([
      createShopSlotFormGroup(fb, { opens: '09:00', closes: '13:00' }),
      createShopSlotFormGroup(fb, { opens: '15:00', closes: '18:00' }),
      createShopSlotFormGroup(fb, { opens: '20:00', closes: '22:00' })
    ]);
    const result = getGlobalHoursFromSlots(slots);
    expect(result.slots.length).toBe(2);
  });

  it('returns empty slots array for empty FormArray', () => {
    const slots = fb.array([]);
    const result = getGlobalHoursFromSlots(slots);
    expect(result.slots).toEqual([]);
  });
});

describe('patchGlobalHoursForm', () => {
  const fb = new FormBuilder();

  it('patches the form with slots from the day', () => {
    const form = createShopHoursForm(fb);
    patchGlobalHoursForm(fb, form, {
      closed: false,
      slots: [{ opens: '10:00', closes: '14:00' }]
    });
    const slots = form.get('slots') as FormArray;
    expect(slots.length).toBe(1);
    expect(slots.at(0).get('opens')!.value).toBe('10:00');
  });

  it('uses default slot when day has no slots', () => {
    const form = createShopHoursForm(fb);
    patchGlobalHoursForm(fb, form, { closed: false, slots: [] });
    const slots = form.get('slots') as FormArray;
    expect(slots.length).toBe(1);
    expect(slots.at(0).get('opens')!.value).toBe(DEFAULT_SHOP_HOURS_SLOT.opens);
  });
});

describe('validateShopGlobalHours', () => {
  const fb = new FormBuilder();

  it('returns null for valid non-overlapping slots', () => {
    const slots = fb.array([
      createShopSlotFormGroup(fb, { opens: '09:00', closes: '13:00' }),
      createShopSlotFormGroup(fb, { opens: '15:00', closes: '19:00' })
    ]);
    expect(validateShopGlobalHours(slots)).toBeNull();
  });

  it('returns an error string for overlapping slots', () => {
    const slots = fb.array([
      createShopSlotFormGroup(fb, { opens: '09:00', closes: '14:00' }),
      createShopSlotFormGroup(fb, { opens: '13:00', closes: '18:00' })
    ]);
    expect(validateShopGlobalHours(slots)).toBeTruthy();
  });
});
