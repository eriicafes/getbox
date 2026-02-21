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

Constructors define what the box resolves. `getbox` supports classes, factories, derived values, and constants. Because constructors act as interfaces, the underlying implementation can change without affecting any consumer.

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

`Box.init` is shorthand for writing the `static init` property yourself.

```ts
class UserService {
  constructor(private db: Database, private logger: Logger) {}

  static init(box: Box) {
    return new UserService(box.get(Database), box.get(LoggerFactory));
  }
}
```

Use `box.for()` when you need custom logic alongside dependency resolution.

```ts
class UserService {
  constructor(private db: Database, private logger: Logger) {}

  static init(box: Box) {
    const logger = box.get(LoggerFactory);
    logger.log("Initializing UserService");
    return box.for(UserService).get(Database, LoggerFactory);
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

const LoggerFactory = factory(
  (): Logger => ({
    log(message: string) {
      console.log(`[LOG] ${message}`);
    },
  }),
);

const box = new Box();
const logger = box.get(LoggerFactory);

logger.log("hello world");
```

### Derived values

Use the `derive` helper to compute a value from the box without caching the result.

```ts
import { Box, derive } from "getbox";

class Config {
  baseUrl = "https://example.com";
}

const RequestContext = derive((box) => ({
  baseUrl: box.get(Config).baseUrl,
  timestamp: Date.now(),
}));

const box = new Box();

const ctx1 = box.get(RequestContext);
const ctx2 = box.get(RequestContext);

console.log(ctx1 === ctx2); // false
```

### Constants

Use the `constant` helper to wrap a fixed value as a constructor. Constant values are never cached and always return the same stable reference.

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

Use `box.all.get()` or `box.all.new()` to resolve multiple constructors at once. Pass an array to get an array of instances, or an object to get an object of instances.

```ts
const box = new Box();

// Cached
const { db, logger } = box.all.get({ db: Database, logger: LoggerFactory });
const [db2, logger2] = box.all.get([Database, LoggerFactory]);

// New instances
const { db3 } = box.all.new({ db3: Database });
const [db4] = box.all.new([Database]);
```

> `box.get()` does not cache `derive` or `constant` values.

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

```ts
const box = new Box();

const db = box.get(Database);

// Clear a specific constructor
Box.clear(box, Database);
console.log(box.get(Database) === db); // false (new instance)

// Clear all cached instances
Box.clear(box);
```

## Circular dependencies

`getbox` does not prevent circular dependencies. You should structure your code to avoid them.

## License

MIT
