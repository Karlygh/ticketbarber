// Type declarations to keep existing spec files using jasmine.* API
// compatible with Jest, without needing @types/jasmine installed.

declare namespace jasmine {
  interface SpyAnd {
    returnValue(val: any): Spy;
    returnValues(...vals: any[]): Spy;
    callFake(fn: (...args: any[]) => any): Spy;
    callThrough(): Spy;
    throwError(msg: string | Error): Spy;
    resolveTo(val?: any): Spy;
    rejectWith(reason?: any): Spy;
  }

  interface SpyCalls {
    reset(): void;
    count(): number;
    first(): { args: any[] };
    mostRecent(): { args: any[] };
    all(): Array<{ args: any[] }>;
    allArgs(): any[][];
    any(): boolean;
    argsFor(index: number): any[];
  }

  interface Spy extends jest.Mock {
    and: SpyAnd;
    calls: SpyCalls;
    withArgs(...args: any[]): Spy;
  }

  function createSpy(name?: string, originalFn?: Function): Spy;

  function createSpyObj<T = any>(
    baseName: string | string[],
    methodNames: string[] | Record<string, any>,
    propertyNames?: string[] | Record<string, any>,
  ): T;

  function any(expectedClass: any): any;
  function objectContaining<T>(sample: Partial<T>): any;
  function stringContaining(sample: string): any;
  function arrayContaining(sample: any[]): any;
}

// Extend Jest's own Matchers interface so specs using .toBeTrue()/.toBeFalse()
// compile without error (these are added at runtime via expect.extend()).
declare namespace jest {
  interface Matchers<R> {
    toBeTrue(): R;
    toBeFalse(): R;
  }
}

declare function expectAsync(promise: Promise<any>): {
  toBeResolved(): Promise<void>;
  toBeRejected(): Promise<void>;
  toBeResolvedTo(expected: any): Promise<void>;
  toBeRejectedWith(expected: any): Promise<void>;
  toBeRejectedWithError(type?: any): Promise<void>;
};
