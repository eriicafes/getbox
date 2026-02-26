import { AsyncLocalStorage } from "node:async_hooks";
import { Box, Constructor, ConstructorInstanceType } from "./index";

const storage = new AsyncLocalStorage<Box>();

/**
 * Runs a function within a Box scope using AsyncLocalStorage.
 * Creates a new Box if none is provided.
 *
 * If the callback function throws an error, the error is thrown by withBox too.
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
 * Returns the current Box from the active Box scope.
 * Throws if called outside a Box scope.
 */
export function getBox(): Box {
  const box = storage.getStore();
  if (box) return box;
  throw new Error("getBox() must be called within a withBox() scope");
}

/**
 * Resolves instances from the active Box scope.
 * Accepts a single constructor, an array of constructors, or an object map of constructors.
 * Throws if called outside a Box scope.
 */
export function inject<T extends Constructor<any>>(
  constructor: T,
): ConstructorInstanceType<T>;
export function inject<const T extends Constructor<any>[]>(
  constructors: T,
): { [K in keyof T]: ConstructorInstanceType<T[K]> };
export function inject<T extends Record<string, Constructor<any>>>(
  constructors: T,
): { [K in keyof T]: ConstructorInstanceType<T[K]> };
export function inject(arg: any): any {
  return getBox().get(arg);
}
