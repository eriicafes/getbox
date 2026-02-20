# getbox

### Lightweight dependency injection for TypeScript.

`getbox` provides a simple way of managing dependencies in TypeScript applications. Dependencies are defined as constructors that act as interfaces for the values they resolve.

Callers know the type of the value they need, but not how it will be derived. The box resolves constructors lazily and caches instances automatically.

## Installation

```sh
npm install getbox
```

## Usage

`getbox` has a very small API surface. You typically only need `box.get()` and optionally `static init` or the `factory` helper.

For an alternative pattern using AsyncLocalStorage where classes can resolve dependencies directly in their constructors, see [getbox/context](./CONTEXT.md).

### Create a class

Classes are instantiated once and cached. Subsequent calls return the cached instance.

```ts
// printer.ts
export class Printer {
  print(text: string): string {
    return text.toUpperCase();
  }
}
```

### Use in another class

The `static init` property tells the box what dependencies to pass when instantiating the class.

```ts
// office.ts
import { Box } from "getbox";
import { Printer } from "./printer";

export class Office {
  constructor(public printer: Printer) {}

  static init = Box.init(Office).get(Printer);
}
```

### Use in application

Create a Box instance to hold cached instances.

When initializing a class, any dependencies it has will also be cached, ensuring that shared dependencies use the same instance.

```ts
// main.ts
import { Box } from "getbox";
import { Office } from "./office";
import { Printer } from "./printer";

const box = new Box();

const office = box.get(Office);
office.printer.print("hello world");

// Instances are cached and shared
const printer = box.get(Printer);
console.log(office.printer === printer); // true
```

## Transient instances

Use `box.new()` to create a new instance each time without caching. This is useful for instances that should not be shared.

```ts
// main.ts
import { Box } from "getbox";

class Database {
  connect() {
    /* ... */
  }
}

const box = new Box();

const db1 = box.new(Database);
const db2 = box.new(Database);

console.log(db1 === db2); // false
```

## Factory functions

Use the `factory` helper to create function-based constructors instead of classes. Factories work well with interfaces for better abstraction.

```ts
// logger.ts
import { Box, factory } from "getbox";

export interface Logger {
  log(message: string): void;
}

const LoggerFactory = factory((box: Box): Logger => {
  return {
    log(message: string): void {
      console.log(`[LOG] ${message}`);
    },
  };
});
```

```ts
// service.ts
import { Box } from "getbox";
import { Logger, LoggerFactory } from "./logger";

export class UserService {
  constructor(private logger: Logger) {}

  static init = Box.init(UserService).get(LoggerFactory);

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
  }
}
```

## Constants

Use the `constant` helper to register constant values without needing a factory or class. Constant values are never cached since they are already fixed.

```ts
import { Box, constant } from "getbox";

const ApiUrl = constant("https://api.example.com");
const Port = constant(3000);
const Config = constant({
  baseUrl: "https://example.com",
  timeout: 5000,
});

const box = new Box();

const apiUrl = box.get(ApiUrl);
const port = box.get(Port);
const config = box.get(Config);

console.log(apiUrl); // "https://api.example.com"
console.log(port); // 3000
console.log(config.timeout); // 5000
```

Since constructors act as interfaces, a `constant` can later be replaced with a `factory` without changing any callers.

```ts
const ApiUrl = factory((box: Box) => {
  const config = box.get(Config);
  return `${config.baseUrl}/api`;
});

const apiUrl = box.get(ApiUrl); // "https://example.com/api"
```

## Transient factories

Use the `transient` helper to create a factory whose result is never cached. The factory is called on every resolution, even when retrieved via `box.get()`.

```ts
import { Box, transient } from "getbox";

const RequestId = transient(() => crypto.randomUUID());

const box = new Box();

const id1 = box.get(RequestId);
const id2 = box.get(RequestId);

console.log(id1 === id2); // false
```

## Resolving multiple constructors

Use `box.all.get()` to resolve multiple constructors at once. Pass an object to get an object of instances, or an array to get an array of instances.

```ts
import { Box } from "getbox";

const box = new Box();

// Object form
const { db, logger } = box.all.get({ db: Database, logger: LoggerFactory });

// Array form
const [db2, logger2] = box.all.get([Database, LoggerFactory]);

console.log(db === db2); // true (cached)
console.log(logger === logger2); // true (cached)
```

Use `box.all.new()` to resolve multiple constructors as transient instances.

```ts
const { db } = box.all.new({ db: Database });
const [db2] = box.all.new([Database]);

console.log(db === db2); // false (transient)
```

## Class constructors

Use `Box.init` to allow resolving classes that have constructor parameters.

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

`Box.init` is shorthand for writing the `static init` method yourself.

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

Classes with no constructor parameters are resolved automatically without needing `static init`. If `static init` is defined, it takes priority over the default constructor.

## Mocking

You can mock dependencies for testing using `Box.mock`. This is particularly useful with factories and interfaces.

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

`getbox` does not prevent circular dependencies. You should structure your code to avoid circular imports between modules.

## License

MIT
