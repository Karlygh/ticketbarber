import { BarberProfile } from '../../../core/models/barber.model';
import { TvQueueRow } from '../../../core/stores/queue.store';

export type TvViewId = 'default' | 'cards-light' | 'view-3' | 'rose-soft';

export interface TvCurrentTicketViewModel {
  row: TvQueueRow;
  displayName: string;
  serviceName: string;
  waitLabel: string;
}

export interface TvUpcomingTicketViewModel {
  row: TvQueueRow;
  displayName: string;
  serviceName: string;
  waitLabel: string;
  etaLabel: string;
}

export interface TvBarberGroupViewModel {
  barber: BarberProfile;
  accentColor: string;
  initials: string;
  current: TvCurrentTicketViewModel | null;
  upcomingAll: TvUpcomingTicketViewModel[];
  upcomingVisible: TvUpcomingTicketViewModel[];
}

export interface TvGlobalWaitingRowViewModel {
  barberId: string;
  barberName: string;
  accentColor: string;
  row: TvUpcomingTicketViewModel;
}

export interface TvShopViewModel {
  name: string;
  logoUrl: string;
  address: string;
  phone: string;
  todayHours: string;
  elapsedLabel: string;
}

export interface TvViewModel {
  activeView: TvViewId;
  densityMode: 'dense' | 'regular';
  layoutClass: string;
  singleBarberMode: boolean;
  groups: TvBarberGroupViewModel[];
  globalWaitingRows: TvGlobalWaitingRowViewModel[];
  shop: TvShopViewModel;
  clockLabel: string;
}
