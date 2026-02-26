# getbox

### Lightweight dependency injection for TypeScript.

`getbox` is a lightweight inversion of control container for TypeScript. Constructors declare their own dependencies, keeping instantiation logic colocated with the type that owns it.

Callers depend on types, not implementations. The box resolves and caches instances automatically on first use.

## Installation

```sh
npm install getbox
```

## Usage

`getbox` has a very small API surface. You typically only need `box.get()` and optionally `static init` or the `factory` helper.

For an alternative pattern using AsyncLocalStorage where classes can resolve dependencies directly, see [getbox/context](./CONTEXT.md).

### Quick start

Create a `Box` instance and call `box.get()` to resolve instances. The box automatically resolves dependencies and caches every instance, so shared dependencies always point to the same reference.

```ts
import { Box } from "getbox";

class Printer {
  print(text: string) {
    return text.toUpperCase();
  }
}

class Office {
  constructor(public printer: Printer) {}

  static init = Box.init(Office).get(Printer);
}

const box = new Box();

const office = box.get(Office);
office.printer.print("hello world");

// Dependencies are cached and shared
const printer = box.get(Printer);
console.log(office.printer === printer); // true
```

## Constructors

Constructors define what the box resolves. `getbox` supports classes, factories, computed values, and constants. Because constructors act as interfaces, the underlying implementation can change without affecting any consumer.

### Classes

Define a `static init` property to allow the box to resolve classes that have constructor parameters. Classes with no parameters do not require it.

```ts
import { Box } from "getbox";

class UserService {
  constructor(private db: Database, private logger: Logger) {}

  static init = Box.init(UserService).get(Database, LoggerFactory);

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
  }
}

const box = new Box();
const service = box.get(UserService);
service.createUser("Alice");
```

`Box.init` is shorthand for writing the `static init` function yourself.

```ts
class UserService {
  constructor(private db: Database, private logger: Logger) {}

  static init(box: Box) {
    return new UserService(box.get(Database), box.get(LoggerFactory));
  }
}
```

If `static init` is defined, it takes priority over the class constructor.

### Factory functions

Use the `factory` helper to create function-based constructors instead of classes. Factories work well with interfaces for better abstraction.

```ts
import { Box, factory } from "getbox";

interface Logger {
  log(message: string): void;
}

const LoggerFactory = factory<Logger>(() => ({
  log(message: string) {
    console.log(`[LOG] ${message}`);
  },
}));

const box = new Box();
const logger = box.get(LoggerFactory);

logger.log("hello world");
```

### Computed values

Use the `computed` helper to compute a value from the box without caching the result.

```ts
import { Box, computed } from "getbox";

class Config {
  baseUrl = "https://example.com";
}

const RequestContext = computed((box) => ({
  baseUrl: box.get(Config).baseUrl,
  timestamp: Date.now(),
}));

const box = new Box();

const ctx1 = box.get(RequestContext);
const ctx2 = box.get(RequestContext);

console.log(ctx1 === ctx2); // false
```

### Constants

Use the `constant` helper to wrap a fixed value as a constructor. Constant values are already fixed and do not need caching.

```ts
import { Box, constant } from "getbox";

const ApiUrl = constant("https://api.example.com");
const Port = constant(3000);
const Config = constant({
  baseUrl: "https://example.com",
  timeout: 5000,
});

const box = new Box();

console.log(box.get(ApiUrl)); // "https://api.example.com"
console.log(box.get(Port)); // 3000
console.log(box.get(Config).timeout); // 5000
```

## Resolving instances

Use `box.get()` to resolve a cached instance. The box resolves the constructor on first call and returns the same instance on every subsequent call. Use `box.new()` to always get a new instance without caching.

```ts
import { Box } from "getbox";

class Database {
  connect() {
    /* ... */
  }
}

const box = new Box();

const db1 = box.get(Database);
const db2 = box.get(Database);
console.log(db1 === db2); // true (cached)

const db3 = box.new(Database);
const db4 = box.new(Database);
console.log(db3 === db4); // false (never cached)
```

Both `box.get()` and `box.new()` also accept an array or object of constructors to resolve multiple at once.

```ts
const box = new Box();

// Cached
const { db, logger } = box.get({ db: Database, logger: LoggerFactory });
const [db2, logger2] = box.get([Database, LoggerFactory]);

// New instances
const { db3 } = box.new({ db3: Database });
const [db4] = box.new([Database]);
```

> `box.get()` does not cache `computed` or `constant` values.

## Mocking

You can mock dependencies for testing using `Box.mock`.

```ts
// service.test.ts
import { Box } from "getbox";
import { Logger, LoggerFactory } from "./logger";
import { UserService } from "./service";

class MockLogger implements Logger {
  messages: string[] = [];

  log(message: string): void {
    this.messages.push(message);
  }
}

const box = new Box();
const mockLogger = new MockLogger();
Box.mock(box, LoggerFactory, mockLogger);

const service = box.get(UserService);
service.createUser("Alice");

console.log(mockLogger.messages); // ["Creating user: Alice"]
```

## Clearing the cache

Use `Box.clear` to remove cached instances. Pass a specific constructor to clear a single entry, or omit it to clear all cached instances.

Returns `true` if an instance was removed, `false` otherwise.

```ts
const box = new Box();

const db = box.get(Database);

// Clear a specific constructor
const cleared = Box.clear(box, Database);
console.log(cleared);
console.log(box.get(Database) === db); // false (new instance)

// Clear all cached instances
const clearedAll = Box.clear(box);
console.log(clearedAll);
```

## Circular dependencies

`getbox` does not prevent circular dependencies. You should structure your code to avoid them.

## License

MIT
