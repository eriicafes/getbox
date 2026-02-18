/**
 * A type that can be resolved by a {@link Box}. Either an object with an
 * `init(box: Box)` method, a class with a `static init(box: Box)` method
 * that returns an instance, or a class with a no-argument constructor.
 */
export type Constructor<T> = { init(box: Box): T } | { new (): T };

/** Extracts the instance type from a {@link Constructor}. */
export type ConstructorInstanceType<T> = T extends Constructor<infer U>
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
  return { init };
}

/**
 * Creates a {@link Constructor} that always resolves to the given constant value.
 *
 * @example
 * ```ts
 * const ApiUrl = constant("https://api.example.com");
 * const port = box.get(ApiUrl); // "https://api.example.com"
 * ```
 */
export function constant<const T>(value: T): Constructor<T> {
  return { init: () => value };
}

/**
 * Dependency injection container that resolves and caches instances from
 * a {@link Constructor}.
 *
 * A constructor is an object with an `init(box: Box)` method,
 * a class with a `static init(box: Box)` method, or a class with a
 * no-argument constructor. The {@link factory} and {@link constant} helpers
 * create constructors from functions and values respectively.
 *
 * @example
 * ```ts
 * class Database {
 *   connect() {}
 * }
 *
 * class UserService {
 *   constructor(private db: Database) {}
 *   static init(box: Box) {
 *     return new UserService(box.get(Database));
 *   }
 * }
 *
 * const box = new Box();
 * const service = box.get(UserService);
 * const db = box.get(Database);
 *
 * console.log(service.db === db); // true (cached)
 * console.log(box.new(Database) === db); // false (transient)
 * ```
 */
export class Box {
  private cache = new Map<Constructor<any>, any>();

  /**
   * Creates a new (transient) instance without caching. Useful for instances
   * that should not be shared.
   */
  public new<T>(constructor: Constructor<T>): T {
    return "init" in constructor ? constructor.init(this) : new constructor();
  }

  /**
   * Resolves an instance from the cache, or creates and caches a new one.
   * Subsequent calls with the same constructor return the cached instance.
   */
  public get<T>(constructor: Constructor<T>): T {
    if (this.cache.has(constructor)) return this.cache.get(constructor);

    const value = this.new(constructor);
    this.cache.set(constructor, value);
    return value;
  }

  /**
   * Returns a {@link Construct} builder for creating class instances whose
   * constructor parameters are themselves resolved from constructors.
   *
   * Intended to be used inside a class's `static init` method. The instance
   * returned by the builder is never cached itself, but can be cached when
   * the class is retrieved via {@link Box.get} or kept transient via {@link Box.new}.
   */
  public for<T extends ClassConstructor<any>>(constructor: T) {
    return new Construct(this, constructor);
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
}

/** Builder for creating class instances with constructor dependencies resolved from a {@link Box}. */
class Construct<T extends ClassConstructor<any>> {
  constructor(private box: Box, private construct: T) {}

  /**
   * Resolves each dependency as a new transient instance via {@link Box.new},
   * meaning dependencies are not cached or shared.
   * The returned instance itself is also never cached.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init(box: Box) {
   *     return box.for(UserService).new(Database, LoggerFactory);
   *   }
   * }
   * ```
   */
  public new(...args: ClassConstructorArgs<T>): InstanceType<T> {
    const instances = args.map((arg) => this.box.new(arg));
    return new this.construct(...instances);
  }

  /**
   * Resolves each dependency as a cached instance via {@link Box.get},
   * meaning dependencies are shared across the box.
   * The returned instance itself is never cached.
   *
   * @example
   * ```ts
   * class UserService {
   *   constructor(private db: Database, private logger: Logger) {}
   *   static init(box: Box) {
   *     return box.for(UserService).get(Database, LoggerFactory);
   *   }
   * }
   * ```
   */
  public get(...args: ClassConstructorArgs<T>): InstanceType<T> {
    const instances = args.map((arg) => this.box.get(arg));
    return new this.construct(...instances);
  }
}

/** A class with any constructor signature. */
type ClassConstructor<T> = { new (...args: any): T };

/** Maps each constructor parameter to its corresponding {@link Constructor} type. */
type ClassConstructorArgs<
  T extends ClassConstructor<any>,
  Args = ConstructorParameters<T>,
> = { [K in keyof Args]: Constructor<Args[K]> };
