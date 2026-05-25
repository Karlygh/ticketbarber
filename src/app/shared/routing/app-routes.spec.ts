import { APP_ROUTES, buildTvQueueRouteCommands } from './app-routes';

describe('APP_ROUTES', () => {
  it('root and home point to /', () => {
    expect(APP_ROUTES.root).toBe('/');
    expect(APP_ROUTES.home).toBe('/');
  });

  it('contact route is /contacto', () => {
    expect(APP_ROUTES.contact).toBe('/contacto');
  });

  it('staff sub-routes are prefixed with /staff', () => {
    expect(APP_ROUTES.staff.root).toBe('/staff');
    expect(APP_ROUTES.staff.login).toBe('/staff/login');
    expect(APP_ROUTES.staff.barbers).toBe('/staff/barberos');
    expect(APP_ROUTES.staff.guide).toBe('/staff/guia');
    expect(APP_ROUTES.staff.devices).toBe('/staff/devices');
  });

  it('tv routes are defined', () => {
    expect(APP_ROUTES.tv).toBe('/tv');
    expect(APP_ROUTES.tvPair).toBe('/tv/pair');
  });
});

describe('buildTvQueueRouteCommands', () => {
  it('returns tv route with shopId when provided', () => {
    expect(buildTvQueueRouteCommands('shop123')).toEqual([APP_ROUTES.tv, 'shop123']);
  });

  it('returns only tv route when shopId is null', () => {
    expect(buildTvQueueRouteCommands(null)).toEqual([APP_ROUTES.tv]);
  });

  it('returns only tv route when shopId is undefined', () => {
    expect(buildTvQueueRouteCommands(undefined)).toEqual([APP_ROUTES.tv]);
  });

  it('returns only tv route when shopId is empty string', () => {
    expect(buildTvQueueRouteCommands('')).toEqual([APP_ROUTES.tv]);
  });
});
