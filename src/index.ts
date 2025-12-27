export type Constructor<T> = { init(box: Box): T } | { new (): T };

export type ConstructorInstanceType<T> = T extends Constructor<infer U>
  ? U
  : never;

export function factory<T>(init: (box: Box) => T): Constructor<T> {
  return { init };
}

export function constant<const T>(value: T): Constructor<T> {
  return { init: () => value };
}

export class Box {
  private cache = new Map<Constructor<any>, any>();

  public new<T>(constructor: Constructor<T>): T {
    // create new instance with either static method or class constructor
    return "init" in constructor ? constructor.init(this) : new constructor();
  }

  public get<T>(constructor: Constructor<T>): T {
    // return cached instance
    if (this.cache.has(constructor)) return this.cache.get(constructor);

    // create and cache new instance
    const value = this.new(constructor);

    this.cache.set(constructor, value);
    return value;
  }

  public for<T extends ClassConstructor<any>>(constructor: T) {
    return new Construct(this, constructor);
  }

  public static mock<T, V extends T = T>(
    box: Box,
    constructor: Constructor<T>,
    value: V
  ) {
    box.cache.set(constructor, value);
  }
}

class Construct<T extends ClassConstructor<any>> {
  constructor(private box: Box, private construct: T) {}

  public new(...args: ClassConstructorArgs<T>): InstanceType<T> {
    const instances = args.map((arg) => this.box.new(arg));
    return new this.construct(...instances);
  }

  public get(...args: ClassConstructorArgs<T>): InstanceType<T> {
    const instances = args.map((arg) => this.box.get(arg));
    return new this.construct(...instances);
  }
}

type ClassConstructor<T> = { new (...args: any): T };
type ClassConstructorArgs<
  T extends ClassConstructor<any>,
  Args = ConstructorParameters<T>
> = { [K in keyof Args]: Constructor<Args[K]> };
