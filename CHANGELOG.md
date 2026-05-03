# getbox

## 2.1.0

### Minor Changes

- 4b769d7: `Box` resolves with same instance with `box.get()`
- 4b769d7: Export `boxCache` to opt classes out of caching
- 4b769d7: Add `Box.fn()` for manual initializers

## 2.0.0

### Minor Changes

- 467f17f: Overload `box.get()` and `box.new()` to accept an array or object of constructors
- 467f17f: Overload `inject()` in `getbox/context` to accept an array or object of constructors
- 467f17f: Add `getBox()` to `getbox/context`
- 467f17f: Add `computed()` helper

## 1.4.0

### Minor Changes

- e74f6f5: Add `inject()` to `getbox/context`

## 1.3.0

### Minor Changes

- 637d703: Add `Box.init()` helper for defining class initializers

## 1.1.0

### Minor Changes

- 2c60180: Add `Box.clear()` method
- c5d432b: Add AsyncLocalStorage pattern with `getbox/context`

### Patch Changes

- 2c60180: Skip caching constants

## 1.0.0

### Major Changes

- 9c5eac6: Release v1
