import { describe, expect, it } from "vitest";
import { Box, factory } from "../src";
import { getBox, inject, withBox } from "../src/context";

describe("getbox/context", () => {
  describe("withBox", () => {
    it("should create a scope with a new Box", () => {
      const result = withBox(() => {
        const box = getBox();
        expect(box).toBeInstanceOf(Box);
        return "ok";
      });
      expect(result).toBe("ok");
    });

    it("should use the provided Box", () => {
      const box = new Box();
      withBox(box, () => {
        expect(getBox()).toBe(box);
      });
    });

    it("should work with async callbacks", async () => {
      const result = await withBox(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return getBox();
      });
      expect(result).toBeInstanceOf(Box);
    });

    it("should propagate context to async functions within a sync scope", async () => {
      class Database {}

      let resolved = false;

      withBox(() => {
        const db = inject(Database);

        const asyncFn = async () => {
          await new Promise((r) => setTimeout(r, 10));
          const db2 = inject(Database);
          expect(db2).toBe(db);
          resolved = true;
        };

        asyncFn();
      });

      await new Promise((r) => setTimeout(r, 20));
      expect(resolved).toBe(true);
    });

    it("should isolate nested scopes", () => {
      const outerBox = new Box();
      withBox(outerBox, () => {
        expect(getBox()).toBe(outerBox);
        withBox(() => {
          expect(getBox()).not.toBe(outerBox);
        });
        expect(getBox()).toBe(outerBox);
      });
    });

    it("should isolate concurrent scopes", async () => {
      const box1 = new Box();
      const box2 = new Box();

      const [result1, result2] = await Promise.all([
        withBox(box1, async () => {
          await new Promise((r) => setTimeout(r, 10));
          return getBox();
        }),
        withBox(box2, async () => {
          await new Promise((r) => setTimeout(r, 10));
          return getBox();
        }),
      ]);

      expect(result1).toBe(box1);
      expect(result2).toBe(box2);
    });
  });

  describe("getBox", () => {
    it("should throw outside a withBox scope", () => {
      expect(() => getBox()).toThrow(
        "getBox() must be called within a withBox() scope",
      );
    });
  });

  describe("inject", () => {
    it("should resolve a constructor from the scoped Box", () => {
      class MyService {
        value = 42;
      }

      const result = withBox(() => inject(MyService));
      expect(result).toBeInstanceOf(MyService);
      expect(result.value).toBe(42);
    });

    it("should resolve cached instances within the same scope", () => {
      class MyService {
        value = Math.random();
      }

      withBox(() => {
        const a = inject(MyService);
        const b = inject(MyService);
        expect(a).toBe(b);
      });
    });

    it("should resolve factory constructors", () => {
      interface Logger {
        log(message: string): void;
      }

      const LoggerFactory = factory(
        (): Logger => ({
          log: (message: string) => console.log(message),
        }),
      );

      const result = withBox(() => inject(LoggerFactory));
      expect(result).toHaveProperty("log");
    });

    it("should throw outside a withBox scope", () => {
      class Foo {}
      expect(() => inject(Foo)).toThrow();
    });

    it("should resolve dependencies declared as class fields", () => {
      class Database {
        query() {
          return "result";
        }
      }

      class UserService {
        public db = inject(Database);
      }

      withBox(() => {
        const service = inject(UserService);
        expect(service).toBeInstanceOf(UserService);
        expect(service.db).toBeInstanceOf(Database);
        expect(service.db).toBe(inject(Database));
      });
    });

    it("should resolve multiple dependencies declared as class fields", () => {
      class Database {}

      const LoggerFactory = factory(() => ({
        log: (message: string) => message,
      }));

      class UserService {
        public db = inject(Database);
        public logger = inject(LoggerFactory);
      }

      withBox(() => {
        const service = inject(UserService);
        expect(service).toBeInstanceOf(UserService);
        expect(service.db).toBeInstanceOf(Database);
        expect(service.db).toBe(inject(Database));
        expect(service.logger).toBe(inject(LoggerFactory));
      });
    });

    it("should resolve an object of constructors", () => {
      class Database {}
      class Logger {}

      withBox(() => {
        const { db, logger } = inject({ db: Database, logger: Logger });
        expect(db).toBeInstanceOf(Database);
        expect(logger).toBeInstanceOf(Logger);
        expect(db).toBe(inject(Database));
        expect(logger).toBe(inject(Logger));
      });
    });

    it("should resolve an array of constructors", () => {
      class Database {}
      class Logger {}

      withBox(() => {
        const [db, logger] = inject([Database, Logger]);
        expect(db).toBeInstanceOf(Database);
        expect(logger).toBeInstanceOf(Logger);
        expect(db).toBe(inject(Database));
        expect(logger).toBe(inject(Logger));
      });
    });
  });
});
