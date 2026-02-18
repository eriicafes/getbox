# getbox/context

`getbox/context` provides an alternative pattern where the box is available implicitly via `AsyncLocalStorage`. Classes can resolve dependencies directly in their constructors without needing `static init` methods or passing the box around.

## Setup

Wrap your application entry point with `withBox` to create a scoped box.

```ts
import { withBox } from "getbox/context";

withBox(() => {
  // All code in this scope can resolve dependencies
  const app = resolve(App);
  app.start();
});
```

You can also pass an existing box to the scope.

```ts
import { Box } from "getbox";
import { withBox } from "getbox/context";

const box = new Box();
Box.mock(box, LoggerFactory, new TestLogger());

withBox(box, () => {
  const app = resolve(App);
  app.start();
});
```

## Resolving dependencies

With the context pattern, classes can use `resolve` directly as field initializers. No `static init` method is needed.

```ts
import { resolve } from "getbox/context";

class UserService {
  public db = resolve(Database);
  public logger = resolve(LoggerFactory);

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

  static init(box: Box) {
    return box.for(UserService).get(Database, LoggerFactory);
  }
}
```

## Resolving multiple dependencies

Use `resolveAll` to resolve multiple constructors at once. Accepts an object or array of constructors.

```ts
withBox(() => {
  // Object form
  const { db, logger } = resolveAll({ db: Database, logger: LoggerFactory });

  // Array form
  const [db2, logger2] = resolveAll([Database, LoggerFactory]);

  console.log(db === db2); // true (cached)
  console.log(logger === logger2); // true (cached)
});
```

## Resolving constructor parameters

Use `construct` to create a class instance with resolved constructor parameters.

```ts
class UserService {
  constructor(private db: Database, private logger: Logger) {}
}

withBox(() => {
  const service = construct(UserService).get(Database, LoggerFactory);
  service.createUser("Alice");
});
```

## Accessing the box

Use `useBox()` to get the current box from the scope. This is useful when you need full access to the box API.

```ts
withBox(() => {
  const box = useBox();
  const db = box.new(Database);
});
```

## Nested and concurrent scopes

Each `withBox` call creates an independent scope. Nested scopes do not share the parent box, and concurrent async scopes are isolated from each other.

```ts
withBox(() => {
  const db = resolve(Database);

  // Inner scope gets a fresh box
  withBox(() => {
    const db2 = resolve(Database);
    console.log(db === db2); // false (different scope)
  });
});
```
