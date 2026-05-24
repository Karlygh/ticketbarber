export const APP_ROUTES = {
  root: '/',
  home: '/',
  contact: '/contacto',
  contactHelp: '/contacto/guia-consultas',
  kiosk: '/kiosk',
  trialStart: '/staff/start',
  tv: '/tv',
  tvPair: '/tv/pair',
  activateTv: '/activate',
  guiaTv: '/guia-tv',
  pricing: '/pricing',
  account: '/account',
  subscriptionManage: '/subscription/manage',
  staff: {
    root: '/staff',
    guide: '/staff/guia',
    barbers: '/staff/barberos',
    devices: '/staff/devices',
    login: '/staff/login',
    register: '/staff/register',
    tvSetup: '/staff/tv-setup'
  }
} as const;

export function buildTvQueueRouteCommands(shopId: string | null | undefined): string[] {
  return shopId ? [APP_ROUTES.tv, shopId] : [APP_ROUTES.tv];
}
