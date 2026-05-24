import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { OpeningHoursDay, OpeningHoursSlot } from '../../../core/models/shop.model';
import { validateOpeningHoursDay } from '../../../core/utils/opening-hours.util';

export const DEFAULT_SHOP_HOURS_SLOT: OpeningHoursSlot = { opens: '09:00', closes: '19:00' };
export const SECOND_SHOP_HOURS_SLOT: OpeningHoursSlot = { opens: '16:00', closes: '20:00' };

export function createShopBasicForm(fb: FormBuilder): FormGroup {
  return fb.group({
    shopName: ['', [Validators.required, Validators.maxLength(60)]],
    logoUrl: [''],
    description: ['', Validators.maxLength(200)],
    address: ['', Validators.maxLength(120)],
    phone: ['', Validators.maxLength(20)]
  });
}

export function createShopHoursForm(fb: FormBuilder): FormGroup {
  return fb.group({
    slots: fb.array([createShopSlotFormGroup(fb, DEFAULT_SHOP_HOURS_SLOT)])
  });
}

export function createShopSlotFormGroup(fb: FormBuilder, slot: OpeningHoursSlot): FormGroup {
  return fb.group({
    opens: [slot.opens, Validators.required],
    closes: [slot.closes, Validators.required]
  });
}

export function getGlobalHoursFromSlots(slotsArray: FormArray): OpeningHoursDay {
  const slots = slotsArray.getRawValue() as OpeningHoursSlot[];
  return {
    closed: false,
    slots: slots
      .filter((slot) => !!slot?.opens && !!slot?.closes)
      .slice(0, 2)
      .map((slot) => ({ opens: slot.opens, closes: slot.closes }))
  };
}

export function patchGlobalHoursForm(fb: FormBuilder, hoursForm: FormGroup, day: OpeningHoursDay): void {
  const slots = day.slots.length > 0 ? day.slots : [DEFAULT_SHOP_HOURS_SLOT];
  hoursForm.setControl('slots', fb.array(slots.map((slot) => createShopSlotFormGroup(fb, slot))));
}

export function validateShopGlobalHours(slotsArray: FormArray): string | null {
  return validateOpeningHoursDay(getGlobalHoursFromSlots(slotsArray));
}
