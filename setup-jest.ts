import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

setupZoneTestEnv();

// ─────────────────────────────────────────────────────────────────────────────
// Jasmine API compatibility shim
// Allows existing specs written with jasmine.createSpy / jasmine.createSpyObj
// to run under Jest without modification.
// ─────────────────────────────────────────────────────────────────────────────

function addJasmineApi(fn: jest.Mock): void {
  (fn as any).and = {
    returnValue: (val: any) => { fn.mockReturnValue(val); return fn; },
    returnValues: (...vals: any[]) => { vals.forEach(v => fn.mockReturnValueOnce(v)); return fn; },
    callFake: (impl: (...args: any[]) => any) => { fn.mockImplementation(impl); return fn; },
    callThrough: () => fn,
    throwError: (msg: string | Error) => {
      fn.mockImplementation(() => { throw typeof msg === 'string' ? new Error(msg) : msg; });
      return fn;
    },
    resolveTo: (val?: any) => { fn.mockResolvedValue(val); return fn; },
    rejectWith: (reason?: any) => { fn.mockRejectedValue(reason); return fn; },
  };
  (fn as any).calls = {
    reset: () => fn.mockClear(),
    count: () => fn.mock.calls.length,
    first: () => ({ args: fn.mock.calls[0] ?? [] }),
    mostRecent: () => ({ args: fn.mock.calls[fn.mock.calls.length - 1] ?? [] }),
    all: () => fn.mock.calls.map((args: any[]) => ({ args })),
    allArgs: () => fn.mock.calls,
    any: () => fn.mock.calls.length > 0,
    argsFor: (i: number) => fn.mock.calls[i] ?? [],
  };
  (fn as any).withArgs = (..._: any[]) => fn;
}

function createCompatSpy(name?: string): any {
  const fn = jest.fn();
  addJasmineApi(fn);
  if (name) Object.defineProperty(fn, 'name', { value: name });
  return fn;
}

(globalThis as any).jasmine = {
  createSpy: (name?: string) => createCompatSpy(name),

  createSpyObj: (
    _baseName: string | string[],
    methodNames: string[] | Record<string, any>,
    propertyNames?: string[] | Record<string, any>,
  ) => {
    const obj: Record<string, any> = {};
    const methods = Array.isArray(methodNames) ? methodNames : Object.keys(methodNames);
    methods.forEach(method => {
      obj[method] = createCompatSpy(method);
      if (!Array.isArray(methodNames) && methodNames[method] !== undefined) {
        obj[method].and.returnValue(methodNames[method]);
      }
    });
    if (propertyNames) {
      if (Array.isArray(propertyNames)) {
        propertyNames.forEach(prop => { obj[prop] = undefined; });
      } else {
        Object.entries(propertyNames).forEach(([prop, val]) => { obj[prop] = val; });
      }
    }
    return obj;
  },

  any: (type: any) => expect.any(type),
  objectContaining: (sample: Record<string, any>) => expect.objectContaining(sample),
  stringContaining: (str: string) => expect.stringContaining(str),
  arrayContaining: (arr: any[]) => expect.arrayContaining(arr),

  clock: () => ({
    install: () => jest.useFakeTimers(),
    uninstall: () => jest.useRealTimers(),
    tick: (ms: number) => jest.advanceTimersByTime(ms),
    mockDate: (date: Date | number) => jest.setSystemTime(date),
  }),
};

// Wrap global spyOn so it returns jasmine-compatible spy
const _jestSpyOn = jest.spyOn.bind(jest);
(globalThis as any).spyOn = (obj: any, method: string, accessType?: 'get' | 'set') => {
  const spy = _jestSpyOn(obj, method, accessType as any);
  addJasmineApi(spy as unknown as jest.Mock);
  return spy;
};

// expectAsync compatibility
// ─────────────────────────────────────────────────────────────────────────────
// Extra Jest matchers matching Jasmine's API
// ─────────────────────────────────────────────────────────────────────────────
expect.extend({
  toBeTrue(received: unknown) {
    const pass = received === true;
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be true`
        : `Expected ${received} to be true`,
    };
  },
  toBeFalse(received: unknown) {
    const pass = received === false;
    return {
      pass,
      message: () => pass
        ? `Expected ${received} not to be false`
        : `Expected ${received} to be false`,
    };
  },
});

(globalThis as any).expectAsync = (promise: Promise<any>) => ({
  toBeResolved: async () => {
    try { await promise; } catch (e) {
      throw new Error(`Expected promise to resolve but it was rejected with: ${e}`);
    }
  },
  toBeRejected: async () => {
    let resolved = false;
    try { await promise; resolved = true; } catch { /* expected */ }
    if (resolved) throw new Error('Expected promise to be rejected but it resolved');
  },
  toBeResolvedTo: (expected: any) => expect(promise).resolves.toEqual(expected),
  toBeRejectedWith: (expected: any) => expect(promise).rejects.toEqual(expected),
  toBeRejectedWithError: (type?: any) => expect(promise).rejects.toBeInstanceOf(type ?? Error),
});
