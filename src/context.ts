import { AsyncLocalStorage } from "node:async_hooks";
import { Box, Constructor, ConstructorInstanceType } from "./index";

const storage = new AsyncLocalStorage<Box>();

/**
 * Runs a function within a scoped {@link Box} context using AsyncLocalStorage.
 * Creates a fresh Box if none is provided.
 */
export function withBox<T>(fn: () => T): T;
export function withBox<T>(box: Box, fn: () => T): T;
export function withBox<T>(boxOrFn: Box | (() => T), fn?: () => T): T {
  if (typeof boxOrFn === "function") {
    return storage.run(new Box(), boxOrFn);
  }
  return storage.run(boxOrFn, fn!);
}

/**
 * Returns the current {@link Box} from the active {@link withBox} scope.
 * Throws if called outside a scope.
 */
export function useBox(): Box {
  const box = storage.getStore();
  if (!box) {
    throw new Error("useBox() must be called within a withBox() scope");
  }
  return box;
}

/**
 * Resolves a cached instance from the current {@link withBox} scope.
 * Shorthand for `useBox().get(constructor)`.
 */
export function resolve<T>(constructor: Constructor<T>): T {
  return useBox().get(constructor);
}

/**
 * Resolves multiple cached instances from the current {@link withBox} scope.
 * Shorthand for `useBox().all.get(constructors)`.
 */
export function resolveAll<const T extends Constructor<any>[]>(
  constructors: T,
): { [K in keyof T]: ConstructorInstanceType<T[K]> };
export function resolveAll<T extends Record<string, Constructor<any>>>(
  constructors: T,
): { [K in keyof T]: ConstructorInstanceType<T[K]> };
export function resolveAll(
  constructors: Constructor<any>[] | Record<string, Constructor<any>>,
): any {
  return useBox().all.get(constructors as any);
}

/**
 * Returns a builder for creating a class instance with resolved constructor
 * parameters from the current {@link withBox} scope. Shorthand for `useBox().for(constructor)`.
 */
export function construct<T extends new (...args: any) => any>(constructor: T) {
  return useBox().for(constructor);
}
