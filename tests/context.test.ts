import { describe, expect, it } from "vitest";
import { Box, factory } from "../src";
import {
  construct,
  resolve,
  resolveAll,
  useBox,
  withBox,
} from "../src/context";

describe("getbox/context", () => {
  describe("withBox", () => {
    it("should create a scope with a new Box", () => {
      const result = withBox(() => {
        const box = useBox();
        expect(box).toBeInstanceOf(Box);
        return "ok";
      });
      expect(result).toBe("ok");
    });

    it("should use the provided Box", () => {
      const box = new Box();
      withBox(box, () => {
        expect(useBox()).toBe(box);
      });
    });

    it("should work with async callbacks", async () => {
      const result = await withBox(async () => {
        await new Promise((r) => setTimeout(r, 10));
        return useBox();
      });
      expect(result).toBeInstanceOf(Box);
    });

    it("should propagate context to async functions within a sync scope", async () => {
      class Database {}

      let resolved = false;

      withBox(() => {
        const db = resolve(Database);

        const asyncFn = async () => {
          await new Promise((r) => setTimeout(r, 10));
          const db2 = resolve(Database);
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
        expect(useBox()).toBe(outerBox);
        withBox(() => {
          expect(useBox()).not.toBe(outerBox);
        });
        expect(useBox()).toBe(outerBox);
      });
    });

    it("should isolate concurrent scopes", async () => {
      const box1 = new Box();
      const box2 = new Box();

      const [result1, result2] = await Promise.all([
        withBox(box1, async () => {
          await new Promise((r) => setTimeout(r, 10));
          return useBox();
        }),
        withBox(box2, async () => {
          await new Promise((r) => setTimeout(r, 10));
          return useBox();
        }),
      ]);

      expect(result1).toBe(box1);
      expect(result2).toBe(box2);
    });
  });

  describe("useBox", () => {
    it("should throw outside a withBox scope", () => {
      expect(() => useBox()).toThrow(
        "useBox() must be called within a withBox() scope",
      );
    });
  });

  describe("resolve", () => {
    it("should resolve a constructor from the scoped Box", () => {
      class MyService {
        value = 42;
      }

      const result = withBox(() => resolve(MyService));
      expect(result).toBeInstanceOf(MyService);
      expect(result.value).toBe(42);
    });

    it("should resolve cached instances within the same scope", () => {
      class MyService {
        value = Math.random();
      }

      withBox(() => {
        const a = resolve(MyService);
        const b = resolve(MyService);
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

      const result = withBox(() => resolve(LoggerFactory));
      expect(result).toHaveProperty("log");
    });

    it("should throw outside a withBox scope", () => {
      class Foo {}
      expect(() => resolve(Foo)).toThrow();
    });
  });

  describe("resolveAll", () => {
    it("should resolve an object of constructors", () => {
      class Database {}
      class Logger {}

      withBox(() => {
        const { db, logger } = resolveAll({ db: Database, logger: Logger });
        expect(db).toBeInstanceOf(Database);
        expect(logger).toBeInstanceOf(Logger);
        expect(db).toBe(resolve(Database));
        expect(logger).toBe(resolve(Logger));
      });
    });

    it("should resolve an array of constructors", () => {
      class Database {}
      class Logger {}

      withBox(() => {
        const [db, logger] = resolveAll([Database, Logger]);
        expect(db).toBeInstanceOf(Database);
        expect(logger).toBeInstanceOf(Logger);
        expect(db).toBe(resolve(Database));
        expect(logger).toBe(resolve(Logger));
      });
    });
  });

  describe("construct", () => {
    it("should resolve constructor dependencies", () => {
      class Database {
        query() {
          return "result";
        }
      }

      class UserService {
        constructor(public db: Database) {}

        static init() {
          return construct(UserService).get(Database);
        }
      }

      withBox(() => {
        const service = resolve(UserService);
        expect(service).toBeInstanceOf(UserService);
        expect(service.db).toBeInstanceOf(Database);
        expect(service.db).toBe(resolve(Database));
      });
    });
  });

  describe("resolve in constructor", () => {
    it("should resolve dependencies directly in class constructor", () => {
      class Database {
        query() {
          return "result";
        }
      }

      class UserService {
        public db = resolve(Database);
      }

      withBox(() => {
        const service = resolve(UserService);
        expect(service).toBeInstanceOf(UserService);
        expect(service.db).toBeInstanceOf(Database);
        expect(service.db).toBe(resolve(Database));
      });
    });

    it("should resolve multiple dependencies in class constructor", () => {
      class Database {}

      const LoggerFactory = factory(() => ({
        log: (message: string) => message,
      }));

      class UserService {
        public db = resolve(Database);
        public logger = resolve(LoggerFactory);
      }

      withBox(() => {
        const service = resolve(UserService);
        expect(service).toBeInstanceOf(UserService);
        expect(service.db).toBeInstanceOf(Database);
        expect(service.db).toBe(resolve(Database));
        expect(service.logger).toBe(resolve(LoggerFactory));
      });
    });
  });
});
