/**
 * A type that can be resolved by a {@link Box}. Either a class with a
 * `static init` function that returns an instance, a class with a
 * no-argument constructor, or a function-based constructor created by
 * {@link factory}, {@link computed}, or {@link constant}.
 */
export type Constructor<T> = { init(box: Box): T } | { new (): T };

/** Extracts the instance type from a {@link Constructor}. */
export type ConstructorInstanceType<T> = T extends { init(box: Box): infer U }
  ? U
  : T extends { new (): infer U }
  ? U
  : never;

const cacheSymbol = Symbol("Box.cache");

const isClass = (fn: Function) =>
  fn.prototype !== undefined &&
  Function.prototype.toString.call(fn).startsWith("class");

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
  return { [cacheSymbol]: true, init } as Constructor<T>;
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
  return { init } as Constructor<T>;
}

/**
 * Creates a {@link Constructor} that always resolves to the given constant value.
 * Constant values are already fixed and do not need caching.
 *
 * @example
 * ```ts
 * const ApiUrl = constant("https://api.example.com");
 * const port = box.get(ApiUrl); // "https://api.example.com"
 * ```
 */
export function constant<const T>(value: T): Constructor<T> {
  return { init: () => value } as Constructor<T>;
}

/**
 * Dependency injection container that resolves and caches instances from
 * a {@link Constructor}.
 *
 * A constructor is a class with a `static init` function, a class with a
 * no-argument constructor, or a function-based constructor created by
 * {@link factory}, {@link computed}, or {@link constant}.
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

    // handle class constructor (may have static init)
    if (typeof arg === "function") {
      return "init" in arg ? arg.init(this) : new arg();
    }
    // handle object with a static init function (function-based constructor)
    if ("init" in arg && !isClass(arg.init)) {
      return arg.init(this);
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

    // handle class constructor (may have static init)
    if (typeof arg === "function") {
      if (this.cache.has(arg)) return this.cache.get(arg);
      const value = "init" in arg ? arg.init(this) : new arg();
      // cache resolved class constructor value
      this.cache.set(arg, value);
      return value;
    }
    // handle object with a static init function (function-based constructor)
    if ("init" in arg && !isClass(arg.init)) {
      if (this.cache.has(arg)) return this.cache.get(arg);
      const value = arg.init(this);
      // cache resolved constructor value if cacheable
      if (cacheSymbol in arg) this.cache.set(arg, value);
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
   * Returns a `static init` function builder.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init = Box.init(UserService).get(Database, LoggerFactory);
   * }
   * ```
   */
  public static init<T extends ClassConstructor<any>>(constructor: T) {
    return new StaticInit(constructor);
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

/**
 * Builder for creating a `static init` function with constructor dependencies
 * resolved from a {@link Box}.
 */
export class StaticInit<T extends ClassConstructor<any>> {
  constructor(private construct: T) {}

  /**
   * Resolves each dependency as a new instance via {@link Box.new},
   * meaning dependencies are not cached or shared.
   * Returns a function compatible with `static init` that can be assigned directly.
   *
   * The returned instance is cached or new depending on whether the
   * class is retrieved via {@link Box.get} or {@link Box.new}.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init = Box.init(UserService).new(Database, LoggerFactory);
   * }
   * ```
   */
  public new(...args: ClassConstructorArgs<T>): (box: Box) => InstanceType<T> {
    return (box) => {
      return new this.construct(...box.new(args));
    };
  }

  /**
   * Resolves each dependency as a cached instance via {@link Box.get},
   * meaning dependencies are shared across the box.
   * Returns a function compatible with `static init` that can be assigned directly.
   *
   * The returned instance is cached or new depending on whether the
   * class is retrieved via {@link Box.get} or {@link Box.new}.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init = Box.init(UserService).get(Database, LoggerFactory);
   * }
   * ```
   */
  public get(...args: ClassConstructorArgs<T>): (box: Box) => InstanceType<T> {
    return (box) => {
      return new this.construct(...box.get(args));
    };
  }
}

/** A class with any constructor signature. */
type ClassConstructor<T> = { new (...args: any): T };

/** Maps each constructor parameter to its corresponding {@link Constructor} type. */
type ClassConstructorArgs<
  T extends ClassConstructor<any>,
  Args = ConstructorParameters<T>,
> = { [K in keyof Args]: Constructor<Args[K]> };
