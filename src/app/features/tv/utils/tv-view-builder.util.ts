import { BarberProfile } from '../../../core/models/barber.model';
import { OpeningHoursDay } from '../../../core/models/shop.model';
import { Ticket } from '../../../core/models/ticket.model';
import { barberInitials } from '../../../core/utils/barber-display.util';
import {
  barberAccentColor,
  capitalizeDisplayName,
  formatElapsedSinceOpening,
  formatTvApproxTime,
  formatTvClock,
  formatTvWait
} from '../../../core/utils/tv-display.util';
import { buildTvQueueRows } from '../../../core/utils/tv-queue.util';
import { TvQueueRow } from '../../../core/stores/queue.store';
import {
  TvBarberGroupViewModel,
  TvGlobalWaitingRowViewModel,
  TvUpcomingTicketViewModel,
  TvViewId,
  TvViewModel
} from '../models/tv-view.model';

interface BarberTvGroup {
  barber: BarberProfile;
  current: TvQueueRow | null;
  upcomingAll: TvQueueRow[];
  upcomingVisible: TvQueueRow[];
}

interface GlobalWaitingRow {
  barberId: string;
  barberName: string;
  row: TvQueueRow;
}

interface BuildTvViewModelInput {
  activeBarbers: BarberProfile[];
  tickets: Ticket[];
  nowMs: number;
  activeView: TvViewId;
  shop: {
    name: string;
    logoUrl: string;
    address: string;
    phone: string;
    todayHours: string;
    openingHours: OpeningHoursDay[];
  };
}

export function buildTvViewModel(input: BuildTvViewModelInput): TvViewModel {
  const groups = buildBarberTvGroups(input.activeBarbers, input.tickets, input.nowMs);
  const groupsMap = new Map(groups.map((group) => [group.barber.id, group]));
  const globalWaitingRows = buildGlobalWaitingRows(groups).map<TvGlobalWaitingRowViewModel>((item) => ({
    barberId: item.barberId,
    barberName: item.barberName,
    accentColor: groupsMap.get(item.barberId)?.accentColor ?? barberAccentColor(item.barberId),
    row: toUpcomingRowViewModel(item.row)
  }));

  return {
    activeView: input.activeView,
    densityMode: input.activeBarbers.length >= 4 ? 'dense' : 'regular',
    layoutClass: `count-${Math.min(Math.max(input.activeBarbers.length, 1), 4)}`,
    singleBarberMode: input.activeBarbers.length <= 1,
    groups,
    globalWaitingRows,
    shop: {
      name: input.shop.name,
      logoUrl: input.shop.logoUrl,
      address: input.shop.address,
      phone: input.shop.phone,
      todayHours: input.shop.todayHours,
      elapsedLabel: formatElapsedSinceOpening(input.shop.openingHours, input.nowMs)
    },
    clockLabel: formatTvClock(input.nowMs)
  };
}

function buildBarberTvGroups(activeBarbers: BarberProfile[], tickets: Ticket[], nowMs: number): TvBarberGroupViewModel[] {
  return activeBarbers.slice(0, 4).map((barber) => {
    const rows = ticketsForBarber(tickets, barber.id, nowMs);
    const current = rows.find((row) => row.ticket.status === 'current') ?? null;
    const upcomingAll = rows.filter((row) => row.ticket.status !== 'current');
    const upcomingVisible = upcomingAll.slice(0, Math.min(upcomingAll.length, 2));

    const group: BarberTvGroup = {
      barber,
      current,
      upcomingAll,
      upcomingVisible
    };

    return {
      barber: group.barber,
      accentColor: barberAccentColor(group.barber.id),
      initials: barberInitials(group.barber.name),
      current: group.current
        ? {
            row: group.current,
            displayName: capitalizeDisplayName(group.current.ticket.displayName),
            serviceName: group.current.ticket.serviceNameSnapshot,
            waitLabel: formatTvWait(group.current.waitMin)
          }
        : null,
      upcomingAll: group.upcomingAll.map((row) => toUpcomingRowViewModel(row)),
      upcomingVisible: group.upcomingVisible.map((row) => toUpcomingRowViewModel(row))
    };
  });
}

function buildGlobalWaitingRows(groups: TvBarberGroupViewModel[]): GlobalWaitingRow[] {
  const rowsByBarber = groups.map((group) => ({
    barberId: group.barber.id,
    barberName: group.barber.name,
    rows: group.upcomingAll.slice(2).map((upcoming) => upcoming.row)
  }));

  const result: GlobalWaitingRow[] = [];
  let index = 0;

  while (rowsByBarber.some((entry) => index < entry.rows.length)) {
    for (const entry of rowsByBarber) {
      if (index < entry.rows.length) {
        result.push({
          barberId: entry.barberId,
          barberName: entry.barberName,
          row: entry.rows[index]
        });
      }
    }
    index += 1;
  }

  return result;
}

function ticketsForBarber(tickets: Ticket[], barberId: string, nowMs: number): TvQueueRow[] {
  const active = tickets
    .filter((ticket) => ticket.barberId === barberId && ticket.status !== 'done')
    .sort((a, b) => a.position - b.position || a.createdAtMs - b.createdAtMs);

  return buildTvQueueRows(active, nowMs);
}

function toUpcomingRowViewModel(row: TvQueueRow): TvUpcomingTicketViewModel {
  return {
    row,
    displayName: capitalizeDisplayName(row.ticket.displayName),
    serviceName: row.ticket.serviceNameSnapshot,
    waitLabel: formatTvWait(row.waitMin),
    etaLabel: formatTvApproxTime(row.etaAtMs)
  };
}
