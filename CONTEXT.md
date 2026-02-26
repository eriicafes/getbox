# getbox/context

`getbox/context` provides an alternative pattern where the box is available implicitly via `AsyncLocalStorage`. Classes can resolve dependencies directly in their constructors without needing `static init` methods or passing the box around.

## Setup

Wrap your application entry point with `withBox` to create a scoped box.

```ts
import { withBox } from "getbox/context";

withBox(() => {
  // All code in this scope can resolve dependencies
  const service = inject(UserService);
  service.createUser("Alice");
});
```

You can also pass an existing box to the scope.

```ts
import { Box } from "getbox";
import { withBox } from "getbox/context";

const box = new Box();
Box.mock(box, LoggerFactory, new MockLogger());

withBox(box, () => {
  const service = inject(UserService);
  service.createUser("Alice");
});
```

## Resolving dependencies

With the context pattern, classes can use `inject` directly as field initializers. No `static init` property is needed.

```ts
import { inject } from "getbox/context";

class UserService {
  public db = inject(Database);
  public logger = inject(LoggerFactory);

  createUser(name: string) {
    this.logger.log(`Creating user: ${name}`);
    return this.db.query("INSERT INTO users ...");
  }
}
```

Compare this with the base pattern which requires `static init`:

```ts
import { Box } from "getbox";

class UserService {
  constructor(private db: Database, private logger: Logger) {}

  static init = Box.init(UserService).get(Database, LoggerFactory);
}
```

## Resolving multiple dependencies

Pass an array or object of constructors to `inject` to resolve multiple at once.

```ts
withBox(() => {
  // Object form
  const { db, logger } = inject({ db: Database, logger: LoggerFactory });

  // Array form
  const [db2, logger2] = inject([Database, LoggerFactory]);

  console.log(db === db2); // true (cached)
  console.log(logger === logger2); // true (cached)
});
```

## Accessing the box

Use `getBox()` to get the current box from the scope. This is useful when you need full access to the box API.

```ts
withBox(() => {
  const box = getBox();
  const db = box.new(Database);
});
```

## Nested and concurrent scopes

Each `withBox` call creates an independent scope. Nested scopes do not share the parent box, and concurrent async scopes are isolated from each other.

```ts
withBox(() => {
  const db = inject(Database);

  // Inner scope gets a new box
  withBox(() => {
    const db2 = inject(Database);
    console.log(db === db2); // false (different scope)
  });
});
```
