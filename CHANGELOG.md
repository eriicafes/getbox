# getbox

## 2.0.0

### Major Changes

- 467f17f: Remove box.all — box.get() and box.new() now accept arrays and objects directly
- 467f17f: Remove useBox from getbox/context — use getBox instead
- 467f17f: Remove injectAll from getbox/context — use inject with an array or object instead
- 467f17f: Remove deprecated transient and derive — use computed instead
- 467f17f: Remove Construct class and box.for()
- 467f17f: Remove deprecated resolve, resolveAll and construct from getbox/context

### Minor Changes

- 467f17f: Overload box.get() and box.new() to accept an array or object of constructors
- 467f17f: Overload inject in getbox/context to accept an array or object of constructors
- 467f17f: Add getBox to getbox/context
- 467f17f: Add computed helper

## 1.4.0

### Minor Changes

- e74f6f5: Replace `resolve` with `inject` and deprecate `resolve`
- e74f6f5: Replace `transient` with `derive` and deprecate `transient`
- e74f6f5: Replace `resolveAll` with `injectAll` and deprecate `resolveAll`

### Patch Changes

- e74f6f5: Deprecate `construct`

## 1.3.0

### Minor Changes

- 637d703: Add `Box.init` helper for defining class static init methods

## 1.2.0

### Minor Changes

- 5812b60: Add `transient` constructors that skips caching

## 1.1.0

### Minor Changes

- 2c60180: Add `Box.clear()` method
- 19f62c6: Add `box.all.get()` and `box.all.new()` methods
- c5d432b: Add AsyncLocalStorage pattern with `getbox/context`: `withBox`, `useBox`, `resolve`, `resolveAll` and `construct`

### Patch Changes

- 2c60180: Skip caching constants

## 1.0.0

### Major Changes

- 9c5eac6: Release v1
