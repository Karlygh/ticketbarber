import { buildTvViewModel } from './tv-view-builder.util';
import { BarberProfile } from '../../../core/models/barber.model';
import { Ticket } from '../../../core/models/ticket.model';

describe('buildTvViewModel', () => {
  const nowMs = 1_700_000_000_000;

  const baseInput = {
    activeBarbers: [] as BarberProfile[],
    tickets: [] as Ticket[],
    nowMs,
    activeView: 'default' as const,
    shop: {
      name: 'TestShop',
      logoUrl: '',
      address: '',
      phone: '',
      todayHours: 'Cerrado',
      openingHours: []
    }
  };

  function makeBarber(id: string, name: string): BarberProfile {
    return {
      id,
      name,
      photoUrl: undefined,
      status: 'available',
      isAvailableToday: true,
      createdAtMs: 0,
      updatedAtMs: 0,
      sortOrder: 0
    };
  }

  function makeCurrentTicket(id: string, barberId: string, durationMin = 20): Ticket {
    return {
      id,
      barberId,
      barberNameSnapshot: 'Leo',
      customerName: 'Ana',
      displayName: 'Ana',
      serviceId: 's1',
      serviceNameSnapshot: 'Corte',
      estimatedDurationMin: durationMin,
      status: 'current',
      position: 1,
      createdAtMs: nowMs - 500_000,
      startedAtMs: nowMs - 5 * 60_000,
      completedAtMs: null
    };
  }

  function makeWaitingTicket(id: string, barberId: string, position: number, durationMin = 10): Ticket {
    return {
      id,
      barberId,
      barberNameSnapshot: 'Leo',
      customerName: 'Luis',
      displayName: 'Luis',
      serviceId: 's1',
      serviceNameSnapshot: 'Corte',
      estimatedDurationMin: durationMin,
      status: 'waiting',
      position,
      createdAtMs: nowMs - 100_000,
      startedAtMs: null,
      completedAtMs: null
    };
  }

  it('returns empty groups and singleBarberMode true when no barbers', () => {
    const vm = buildTvViewModel(baseInput);
    expect(vm.groups.length).toBe(0);
    expect(vm.singleBarberMode).toBeTrue();
    expect(vm.globalWaitingRows.length).toBe(0);
  });

  it('passes activeView through to the ViewModel', () => {
    const vm = buildTvViewModel({ ...baseInput, activeView: 'cards-light' });
    expect(vm.activeView).toBe('cards-light');
  });

  it('returns densityMode regular and correct layoutClass for 2 barbers', () => {
    const vm = buildTvViewModel({
      ...baseInput,
      activeBarbers: [makeBarber('b1', 'Leo'), makeBarber('b2', 'Max')]
    });
    expect(vm.densityMode).toBe('regular');
    expect(vm.layoutClass).toBe('count-2');
    expect(vm.singleBarberMode).toBeFalse();
  });

  it('returns densityMode dense and count-4 for 4 barbers', () => {
    const barbers = ['b1', 'b2', 'b3', 'b4'].map((id, i) => makeBarber(id, `Barber ${i}`));
    const vm = buildTvViewModel({ ...baseInput, activeBarbers: barbers });
    expect(vm.densityMode).toBe('dense');
    expect(vm.layoutClass).toBe('count-4');
  });

  it('caps layoutClass at count-4 for more than 4 barbers', () => {
    const barbers = ['b1', 'b2', 'b3', 'b4', 'b5'].map((id, i) => makeBarber(id, `Barber ${i}`));
    const vm = buildTvViewModel({ ...baseInput, activeBarbers: barbers });
    expect(vm.layoutClass).toBe('count-4');
    expect(vm.groups.length).toBe(4);
  });

  it('builds group with current ticket and correct displayName', () => {
    const barber = makeBarber('b1', 'Leo');
    const ticket = makeCurrentTicket('t1', 'b1', 20);
    const vm = buildTvViewModel({ ...baseInput, activeBarbers: [barber], tickets: [ticket] });

    const group = vm.groups[0];
    expect(group.current).not.toBeNull();
    expect(group.current!.displayName).toBe('Ana');
    expect(group.current!.serviceName).toBe('Corte');
    expect(group.upcomingAll.length).toBe(0);
  });

  it('separates current from upcoming tickets correctly', () => {
    const barber = makeBarber('b1', 'Leo');
    const current = makeCurrentTicket('t1', 'b1', 20);
    const waiting1 = makeWaitingTicket('t2', 'b1', 2);
    const waiting2 = makeWaitingTicket('t3', 'b1', 3);

    const vm = buildTvViewModel({ ...baseInput, activeBarbers: [barber], tickets: [current, waiting1, waiting2] });

    const group = vm.groups[0];
    expect(group.current).not.toBeNull();
    expect(group.upcomingAll.length).toBe(2);
    expect(group.upcomingVisible.length).toBe(2);
  });

  it('limits upcomingVisible to 2 tickets per barber', () => {
    const barber = makeBarber('b1', 'Leo');
    const tickets = [
      makeCurrentTicket('t1', 'b1', 20),
      makeWaitingTicket('t2', 'b1', 2),
      makeWaitingTicket('t3', 'b1', 3),
      makeWaitingTicket('t4', 'b1', 4)
    ];

    const vm = buildTvViewModel({ ...baseInput, activeBarbers: [barber], tickets });

    const group = vm.groups[0];
    expect(group.upcomingAll.length).toBe(3);
    expect(group.upcomingVisible.length).toBe(2);
  });

  it('builds globalWaitingRows from overflow tickets (beyond 2 per barber)', () => {
    const barber = makeBarber('b1', 'Leo');
    const tickets = [
      makeCurrentTicket('t1', 'b1', 20),
      makeWaitingTicket('t2', 'b1', 2),
      makeWaitingTicket('t3', 'b1', 3),
      makeWaitingTicket('t4', 'b1', 4)
    ];

    const vm = buildTvViewModel({ ...baseInput, activeBarbers: [barber], tickets });

    expect(vm.globalWaitingRows.length).toBe(1);
    expect(vm.globalWaitingRows[0].barberId).toBe('b1');
    expect(vm.globalWaitingRows[0].barberName).toBe('Leo');
  });

  it('includes shop info in the ViewModel', () => {
    const vm = buildTvViewModel({
      ...baseInput,
      shop: { ...baseInput.shop, name: 'Mi Barbería', todayHours: '10:00 - 20:00' }
    });
    expect(vm.shop.name).toBe('Mi Barbería');
    expect(vm.shop.todayHours).toBe('10:00 - 20:00');
  });
});
