/**
 * Symbol key used to opt a constructor out of caching.
 * When set to `false`, {@link Box.get} will not cache the resolved value.
 *
 * @example
 * ```ts
 * class MyService {
 *   static [boxCache] = false;
 *   static init = Box.init(MyService).get(Database);
 * }
 * ```
 */
export const boxCache = Symbol("Box.cache");

/**
 * A type that can be resolved by a {@link Box}. Either a class with a
 * `static init` property set to an initializer, a class with a no-argument
 * constructor, or a function-based constructor created by {@link factory},
 * {@link computed}, or {@link constant}.
 */
export type Constructor<T> = { init: Init<T> } | { new (): T };

/** Extracts the instance type from a {@link Constructor}. */
export type ConstructorInstanceType<T> = T extends { init: Init<infer U> }
  ? U
  : T extends { new (): infer U }
  ? U
  : never;

/**
 * Creates a {@link Constructor} from a factory function.
 * The factory receives the box as an argument, allowing it to resolve other dependencies.
 *
 * @example
 * ```ts
 * const LoggerFactory = factory((box: Box): Logger => {
 *   return new ConsoleLogger();
 * });
 *
 * const logger = box.get(LoggerFactory);
 * ```
 */
export function factory<T>(init: (box: Box) => T): Constructor<T> {
  return { init: new Init(init) };
}

/**
 * Creates a {@link Constructor} that computes a value from the box without caching the result.
 *
 * @example
 * ```ts
 * class Config {
 *   baseUrl = "https://example.com";
 * }
 *
 * const RequestContext = computed((box) => ({
 *   baseUrl: box.get(Config).baseUrl,
 *   timestamp: Date.now(),
 * }));
 *
 * const ctx1 = box.get(RequestContext);
 * const ctx2 = box.get(RequestContext);
 * console.log(ctx1 === ctx2); // false
 * ```
 */
export function computed<T>(init: (box: Box) => T): Constructor<T> {
  return { init: new Init(init), [boxCache]: false } as Constructor<T>;
}

/**
 * Creates a {@link Constructor} that always resolves to the given constant value.
 * Constant values are already fixed and do not need caching.
 *
 * @example
 * ```ts
 * const ApiUrl = constant("https://api.example.com");
 * const url = box.get(ApiUrl); // "https://api.example.com"
 * ```
 */
export function constant<const T>(value: T): Constructor<T> {
  return { init: new Init(() => value), [boxCache]: false } as Constructor<T>;
}

/**
 * Dependency injection container that resolves and caches instances from
 * a {@link Constructor}.
 *
 * A constructor is a class with a `static init` property set to an initializer,
 * a class with a no-argument constructor, or a function-based constructor created by
 * {@link factory}, {@link computed}, or {@link constant}.
 *
 * `Box` can be resolved as a dependency — `box.get(Box)` returns the current instance.
 *
 * @example
 * ```ts
 * class Database {
 *   connect() {}
 * }
 *
 * class UserService {
 *   constructor(private db: Database) {}
 *   static init = Box.init(UserService).get(Database);
 * }
 *
 * const box = new Box();
 * const service = box.get(UserService);
 * const db = box.get(Database);
 *
 * console.log(service.db === db); // true (cached)
 * console.log(box.get(Box) === box); // true
 * ```
 */
export class Box {
  protected cache = new Map<Constructor<any>, any>();

  /**
   * Creates a new instance without caching.
   * Accepts a single constructor, an array of constructors, or an object map of constructors.
   */
  public new<T extends Constructor<any>>(
    constructor: T,
  ): ConstructorInstanceType<T>;
  public new<const T extends Constructor<any>[]>(
    constructors: T,
  ): { [K in keyof T]: ConstructorInstanceType<T[K]> };
  public new<T extends Record<string, Constructor<any>>>(
    constructors: T,
  ): { [K in keyof T]: ConstructorInstanceType<T[K]> };
  public new(arg: any): any {
    // handle array with constructor items
    if (Array.isArray(arg)) return arg.map((c) => this.new(c));

    // handle class constructor (may have initializer)
    if (typeof arg === "function") {
      return arg.init instanceof Init ? arg.init.fn(this) : new arg();
    }
    // handle object-based constructor with init
    if (arg.init instanceof Init) {
      return arg.init.fn(this);
    }
    // handle object with constructor keys
    const result: Record<string, any> = {};
    for (const [key, constructor] of Object.entries(arg) as [string, any][]) {
      result[key] = this.new(constructor);
    }
    return result;
  }

  /**
   * Resolves an instance from the cache, or creates and caches a new one.
   * Subsequent calls with the same constructor return the cached instance.
   * Accepts a single constructor, an array of constructors, or an object map of constructors.
   */
  public get<T extends Constructor<any>>(
    constructor: T,
  ): ConstructorInstanceType<T>;
  public get<const T extends Constructor<any>[]>(
    constructors: T,
  ): { [K in keyof T]: ConstructorInstanceType<T[K]> };
  public get<T extends Record<string, Constructor<any>>>(
    constructors: T,
  ): { [K in keyof T]: ConstructorInstanceType<T[K]> };
  public get(arg: any): any {
    // handle array with constructor items
    if (Array.isArray(arg)) return arg.map((c) => this.get(c));

    // handle class constructor (may have initializer)
    if (typeof arg === "function") {
      if (this.cache.has(arg)) return this.cache.get(arg);
      if (arg === Box) return this;
      const value = arg.init instanceof Init ? arg.init.fn(this) : new arg();
      if (arg[boxCache] !== false) this.cache.set(arg, value);
      return value;
    }
    // handle object-based constructor with init
    if (arg.init instanceof Init) {
      if (this.cache.has(arg)) return this.cache.get(arg);
      const value = arg.init.fn(this);
      if (arg[boxCache] !== false) this.cache.set(arg, value);
      return value;
    }
    // handle object with constructor keys
    const result: Record<string, any> = {};
    for (const [key, constructor] of Object.entries(arg) as [string, any][]) {
      result[key] = this.get(constructor);
    }
    return result;
  }

  /**
   * Returns an initializer builder for a class constructor.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init = Box.init(UserService).get(Database, LoggerFactory);
   * }
   * ```
   */
  public static init<T extends ClassConstructor<any>>(ctor: T) {
    return new StaticInit(ctor);
  }

  /**
   * Returns an initializer from a factory function.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database) {}
   *   static init = Box.fn((box) => new UserService(box.get(Database)));
   * }
   * ```
   */
  public static fn<T>(fn: (box: Box) => T): Init<T> {
    return new Init(fn);
  }

  /**
   * Registers a mock value in the box's cache for a given constructor.
   * Useful for replacing dependencies in tests.
   */
  public static mock<T, V extends T = T>(
    box: Box,
    constructor: Constructor<T>,
    value: V,
  ) {
    box.cache.set(constructor, value);
  }

  /**
   * Removes the instance from the box's cache for a given constructor.
   * Removes all instances if no constructor is provided.
   *
   * Returns true if an instance existed and has been removed from the box's cache.
   */
  public static clear<T>(box: Box, constructor?: Constructor<T>) {
    if (!constructor) {
      const size = box.cache.size;
      box.cache.clear();
      return size > 0;
    }
    return box.cache.delete(constructor);
  }
}

/** An initializer wrapping a factory function for use as a {@link Constructor}. */
export class Init<T> {
  constructor(public readonly fn: (box: Box) => T) {}
}

/** Builder that creates an initializer with dependencies resolved from a {@link Box}. */
export class StaticInit<C extends ClassConstructor<any>> {
  constructor(private ctor: C) {}

  /**
   * Resolves each dependency as a new instance via {@link Box.new}.
   * Dependencies are not cached or shared.
   * Returns an initializer.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init = Box.init(UserService).new(Database, LoggerFactory);
   * }
   * ```
   */
  public new(...args: ClassConstructorArgs<C>): Init<InstanceType<C>> {
    return new Init((box) => new this.ctor(...(box.new(args) as any)));
  }

  /**
   * Resolves each dependency as a cached instance via {@link Box.get}.
   * Dependencies are cached and shared.
   * Returns an initializer.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init = Box.init(UserService).get(Database, LoggerFactory);
   * }
   * ```
   */
  public get(...args: ClassConstructorArgs<C>): Init<InstanceType<C>> {
    return new Init((box) => new this.ctor(...(box.get(args) as any)));
  }
}

/** A class with any constructor signature. */
type ClassConstructor<T> = { new (...args: any): T };

/** Maps each constructor parameter to its corresponding {@link Constructor} type. */
type ClassConstructorArgs<
  C extends ClassConstructor<any>,
  Args = ConstructorParameters<C>,
> = { [K in keyof Args]: Constructor<Args[K]> };
