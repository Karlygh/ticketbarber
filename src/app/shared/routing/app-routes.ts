export const APP_ROUTES = {
  root: '/',
  home: '/home',
  contact: '/contacto',
  kiosk: '/kiosk',
  tv: '/tv',
  tvConnect: '/tv/connect',
  activate: '/activate',
  guiaTv: '/guia-tv',
  pricing: '/pricing',
  account: '/account',
  subscriptionManage: '/subscription/manage',
  staff: {
    root: '/staff',
    devices: '/staff/devices',
    login: '/staff/login',
    register: '/staff/register',
    tvSetup: '/staff/tv-setup'
  }
} as const;
