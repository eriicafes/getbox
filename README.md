# getbox

### Lightweight dependency injection for TypeScript.

`getbox` provides a simple way of managing dependencies in TypeScript applications. It uses classes and factory functions to define dependencies and automatically handles instance caching.

The main advantage of `getbox` is removing the need to manually pass references around when instantiating classes that depend on one another.

## Installation

```sh
npm install getbox
```

## Usage

`getbox` has a very small API surface. You typically only need to use the `Box.get()` and optionally static init methods or the `factory` helper.

### Create a class

Classes are instantiated once and cached. Subsequent calls return the cached instance.

```ts
// printer.ts
import { Box } from "getbox";

export class Printer {
  print(text: string): string {
    return text.toUpperCase();
  }
}
```

### Use in another class

Retrieve instances by calling `box.get(Constructor)` within your class constructor or factory function.

```ts
// office.ts
import { Box, factory } from "getbox";
import { Printer } from "./printer";

export class Office {
  constructor(public printer: Printer) {}

  static init(box: Box) {
    const printer = box.get(Printer);
    return new Office(printer);
  }
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
// printer.ts
import { Box } from "getbox";

export class Printer {
  id = Math.random();

  print(text: string): string {
    return text.toUpperCase();
  }
}
```

```ts
// main.ts
import { Box } from "getbox";
import { Printer } from "./printer";

const box = new Box();

const printer1 = box.new(Printer);
const printer2 = box.new(Printer);

console.log(printer1 === printer2); // false
```

## Factory functions

Use the `factory` helper to create function-based constructors instead of classes. Factories work well with interfaces for better abstraction.

```ts
// logger.ts
import { Box, factory } from "getbox";

export interface Logger {
  log(message: string): void;
}

export class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

const LoggerFactory = factory((box: Box): Logger => {
  return new ConsoleLogger();
});
```

```ts
// service.ts
import { Box } from "getbox";
import { Logger, LoggerFactory } from "./logger";

export class UserService {
  constructor(private logger: Logger) {}

  static init(box: Box) {
    const logger = box.get(LoggerFactory);
    return new UserService(logger);
  }

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
  }
}
```

## Constants

Use the `constant` helper to register constant values without needing a factory or class.

```ts
import { Box, constant } from "getbox";

const ApiUrl = constant("https://api.example.com");
const Port = constant(3000);
const Config = constant({
  apiUrl: "https://api.example.com",
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

## Constructing classes with dependencies

Use `box.for()` for a convenient way to create instances of classes that take other constructors as dependencies. The instance created with `box.for()` is not cached, but dependencies resolved with `.get()` are cached.

```ts
// database.ts
export class Database {
  connect() { /* ... */ }
}

// logger.ts
import { Box, factory } from "getbox";

export interface Logger {
  log(message: string): void;
}

export const LoggerFactory = factory((box: Box): Logger => {
  return console;
});
```

```ts
// service.ts
import { Box } from "getbox";
import { Database } from "./database";
import { Logger, LoggerFactory } from "./logger";

export class UserService {
  constructor(
    private db: Database,
    private logger: Logger
  ) {}

  static init(box: Box) {
    // Create new instance with cached dependencies
    return box.for(UserService).get(Database, LoggerFactory);
  }

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
    // Use db to save user
  }
}
```

```ts
// main.ts
import { Box } from "getbox";
import { UserService } from "./service";

const box = new Box();

const service = box.get(UserService);
service.createUser("Alice");
```

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
Box.mock(box, LoggerFactory, new MockLogger());

const service = box.get(UserService);
service.createUser("Alice");

console.log(mockLogger.messages); // ["Creating user: Alice"]
```

## Circular dependencies

`getbox` does not prevent circular dependencies. You should structure your code to avoid circular imports between modules.

## License

MIT
