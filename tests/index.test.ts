import { describe, expect, it } from "vitest";
import { Box, computed, constant, factory } from "../src";

describe("Box", () => {
  describe("new", () => {
    it("should create a new instance with constructors", () => {
      const box = new Box();

      class TestClass {
        value = Math.random();
      }

      const instance1 = box.new(TestClass);
      const instance2 = box.new(TestClass);

      expect(instance1).toBeInstanceOf(TestClass);
      expect(instance2).toBeInstanceOf(TestClass);
      expect(instance1).not.toBe(instance2);
      expect(instance1.value).not.toBe(instance2.value);
    });

    it("should resolve cached dependencies", () => {
      const box = new Box();

      class DependencyA {
        value = Math.random();
      }

      class DependencyB {
        value = Math.random();
      }

      class TestClass {
        constructor(public depA: DependencyA, public depB: DependencyB) {}

        static init = Box.fn(
          (box) => new TestClass(box.get(DependencyA), box.get(DependencyB)),
        );
      }

      const instance1 = box.new(TestClass);
      const instance2 = box.new(TestClass);
      const cachedDepA = box.get(DependencyA);
      const cachedDepB = box.get(DependencyB);

      expect(instance1).not.toBe(instance2);
      expect(instance1.depA).toBe(cachedDepA);
      expect(instance2.depA).toBe(cachedDepA);
      expect(instance1.depB).toBe(cachedDepB);
      expect(instance2.depB).toBe(cachedDepB);
    });

    it("should resolve an array of constructors as new instances", () => {
      const box = new Box();

      class ServiceA {
        id = Math.random();
      }

      class ServiceB {
        id = Math.random();
      }

      const [a1] = box.new([ServiceA]);
      const [a2, b1] = box.new([ServiceA, ServiceB]);

      expect(a1).toBeInstanceOf(ServiceA);
      expect(a2).toBeInstanceOf(ServiceA);
      expect(b1).toBeInstanceOf(ServiceB);
      expect(a1).not.toBe(a2);
    });

    it("should resolve an object of constructors as new instances", () => {
      const box = new Box();

      class ServiceA {
        id = Math.random();
      }

      class ServiceB {
        id = Math.random();
      }

      const { a1 } = box.new({ a1: ServiceA });
      const { a2, b1 } = box.new({ a2: ServiceA, b1: ServiceB });

      expect(a1).toBeInstanceOf(ServiceA);
      expect(a2).toBeInstanceOf(ServiceA);
      expect(b1).toBeInstanceOf(ServiceB);
      expect(a1).not.toBe(a2);
    });

    it("should treat an object with an intializer 'init' and extra properties as a constructor", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      class Logger {
        name = "logger";
      }

      // init is a method called, so treats like a constructor
      const result = box.new({
        init: Box.fn((box) => box.get(Database)),
        logger: Logger,
      });
      expect(result).toBeInstanceOf(Database);
    });

    it("should treat an object with a non-initializer 'init' as an object map", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      const LoggerFactory = factory(() => ({ name: "logger" }));

      // Database is a class, so treats this as an object map.
      const result = box.new({
        init: Database,
        logger: LoggerFactory,
      });
      expect(result.init).toBeInstanceOf(Database);
      expect(result.logger.name).toBe("logger");
    });

    it("should create a new Box instance when resolving Box", () => {
      const box = new Box();

      const newBox = box.new(Box);

      expect(newBox).toBeInstanceOf(Box);
      expect(newBox).not.toBe(box);
    });
  });

  describe("get", () => {
    it("should create and cache an instance with constructors", () => {
      const box = new Box();

      class TestClass {
        value = Math.random();
      }

      const instance1 = box.get(TestClass);
      const instance2 = box.get(TestClass);

      expect(instance1).toBeInstanceOf(TestClass);
      expect(instance1).toBe(instance2);
    });

    it("should resolve cached dependencies", () => {
      const box = new Box();

      class DependencyA {
        value = Math.random();
      }

      class DependencyB {
        value = Math.random();
      }

      class TestClass {
        constructor(public depA: DependencyA, public depB: DependencyB) {}

        static init = Box.fn(
          (box) => new TestClass(box.get(DependencyA), box.get(DependencyB)),
        );
      }

      const instance1 = box.get(TestClass);
      const instance2 = box.get(TestClass);
      const cachedDepA = box.get(DependencyA);
      const cachedDepB = box.get(DependencyB);

      expect(instance1).toBe(instance2);
      expect(instance1.depA).toBe(cachedDepA);
      expect(instance2.depA).toBe(cachedDepA);
      expect(instance1.depB).toBe(cachedDepB);
      expect(instance2.depB).toBe(cachedDepB);
    });

    it("should resolve an array of constructors as cached instances", () => {
      const box = new Box();

      class ServiceA {
        name = "A";
      }

      class ServiceB {
        name = "B";
      }

      const [a1] = box.get([ServiceA]);
      const [a2, b1] = box.get([ServiceA, ServiceB]);

      expect(a1).toBeInstanceOf(ServiceA);
      expect(a2).toBeInstanceOf(ServiceA);
      expect(b1).toBeInstanceOf(ServiceB);
      expect(a1).toBe(a2);
      expect(a1).toBe(box.get(ServiceA));
      expect(b1).toBe(box.get(ServiceB));
    });

    it("should resolve an object of constructors as cached instances", () => {
      const box = new Box();

      class ServiceA {
        name = "A";
      }

      class ServiceB {
        name = "B";
      }

      const { a1 } = box.get({ a1: ServiceA });
      const { a2, b1 } = box.get({ a2: ServiceA, b1: ServiceB });

      expect(a1).toBeInstanceOf(ServiceA);
      expect(a2).toBeInstanceOf(ServiceA);
      expect(b1).toBeInstanceOf(ServiceB);
      expect(a1).toBe(a2);
      expect(a1).toBe(box.get(ServiceA));
      expect(b1).toBe(box.get(ServiceB));
    });

    it("should treat an object with an intializer 'init' and extra properties as a constructor", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      class Logger {
        name = "logger";
      }

      // init is a method called, so treats like a constructor
      const result = box.get({
        init: Box.fn((box) => box.get(Database)),
        logger: Logger,
      });
      expect(result).toBeInstanceOf(Database);
    });

    it("should treat an object with a non-intializer 'init' as an object map", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      const LoggerFactory = factory(() => ({ name: "logger" }));

      // Database is a class, so treats this as an object map.
      const result = box.get({
        init: Database,
        logger: LoggerFactory,
      });
      expect(result.init).toBeInstanceOf(Database);
      expect(result.logger.name).toBe("logger");
    });

    it("should return the current box instance when resolving Box", () => {
      const box = new Box();

      expect(box.get(Box)).toBe(box);
    });
  });

  describe("init", () => {
    it("should create a static init function with cached dependencies", () => {
      const box = new Box();

      class Dependency {
        id = Math.random();
      }

      class UserService {
        constructor(public dep: Dependency) {}
        static init = Box.init(UserService).get(Dependency);
      }

      const service1 = box.new(UserService);
      const service2 = box.new(UserService);

      expect(service1.dep).toBe(service2.dep);
    });

    it("should create a static init function with new dependencies", () => {
      const box = new Box();

      class Dependency {
        id = Math.random();
      }

      class UserService {
        constructor(public dep: Dependency) {}
        static init = Box.init(UserService).new(Dependency);
      }

      const service1 = box.new(UserService);
      const service2 = box.new(UserService);

      expect(service1.dep).not.toBe(service2.dep);
    });

    it("should work with zero constructor parameters", () => {
      const box = new Box();

      class Logger {
        log(msg: string) {
          return msg;
        }
        static init = Box.init(Logger).get();
      }

      const logger = box.get(Logger);

      expect(logger).toBeInstanceOf(Logger);
      expect(logger.log("hello")).toBe("hello");
    });

    it("should override a no-argument constructor returning a different instance", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      class UserService {
        constructor() {}

        static init = Box.fn((box) => box.get(Database));
      }

      const result = box.get(UserService);

      expect(result).toBeInstanceOf(Database);
      expect(result.name).toBe("db");
    });
  });

  describe("factory", () => {
    it("should create a value from a function", () => {
      const box = new Box();

      const TestFactory = factory(() => ({ value: "from factory" }));

      expect(box.get(TestFactory).value).toBe("from factory");
    });

    it("should receive box as an argument", () => {
      const box = new Box();

      class Dependency {
        value = "dependency";
      }

      const TestFactory = factory((box) => ({ dep: box.get(Dependency) }));

      const { dep } = box.get(TestFactory);

      expect(dep).toBeInstanceOf(Dependency);
      expect(dep).toBe(box.get(Dependency));
    });

    it("should cache the result with box.get()", () => {
      const box = new Box();

      const TestFactory = factory(() => ({ id: Math.random() }));

      const instance1 = box.get(TestFactory);
      const instance2 = box.get(TestFactory);

      expect(instance1).toBe(instance2);
    });

    it("should not cache the result with box.new()", () => {
      const box = new Box();

      const TestFactory = factory(() => ({ id: Math.random() }));

      const instance1 = box.new(TestFactory);
      const instance2 = box.new(TestFactory);

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("constant", () => {
    it("should create a constant constructor", () => {
      const box = new Box();

      const config = { apiUrl: "https://api.example.com", timeout: 3000 };
      const ConfigConstant = constant(config);

      const instance = box.get(ConfigConstant);

      expect(instance).toBe(config);
      expect(instance.apiUrl).toBe("https://api.example.com");
      expect(instance.timeout).toBe(3000);
    });

    it("should work with primitive values", () => {
      const box = new Box();

      const ApiUrl = constant("https://api.example.com");
      const Port = constant(3000);
      const IsEnabled = constant(true);

      expect(box.get(ApiUrl)).toBe("https://api.example.com");
      expect(box.get(Port)).toBe(3000);
      expect(box.get(IsEnabled)).toBe(true);
    });

    it("should return same uncached value with box.new()", () => {
      const box = new Box();

      const value = { id: Math.random() };
      const ValueConstant = constant(value);

      const instance1 = box.new(ValueConstant);
      const instance2 = box.new(ValueConstant);

      expect(instance1).toBe(instance2);
      expect(Box.clear(box, ValueConstant)).toBe(false);
    });

    it("should return same uncached value with box.get()", () => {
      const box = new Box();

      const value = { id: Math.random() };
      const ValueConstant = constant(value);

      const instance1 = box.get(ValueConstant);
      const instance2 = box.get(ValueConstant);

      expect(instance1).toBe(instance2);
      expect(Box.clear(box, ValueConstant)).toBe(false);
    });

    it("should be usable as dependencies in other constructors", () => {
      const box = new Box();

      const ConfigConstant = constant({ apiUrl: "https://api.example.com" });

      class ApiClient {
        constructor(public config: { apiUrl: string }) {}

        static init = Box.fn((box) => new ApiClient(box.get(ConfigConstant)));
      }

      const client = box.get(ApiClient);

      expect(client.config.apiUrl).toBe("https://api.example.com");
    });
  });

  describe("computed", () => {
    it("should create a new uncached value with box.new()", () => {
      const box = new Box();

      const RandomValue = computed(() => Math.random());

      const value1 = box.new(RandomValue);
      const value2 = box.new(RandomValue);

      expect(value1).not.toBe(value2);
      expect(Box.clear(box, RandomValue)).toBe(false);
    });

    it("should create a new uncached value with box.get()", () => {
      const box = new Box();

      const RandomValue = computed(() => Math.random());

      const value1 = box.get(RandomValue);
      const value2 = box.get(RandomValue);

      expect(value1).not.toBe(value2);
      expect(Box.clear(box, RandomValue)).toBe(false);
    });

    it("should receive the box as an argument", () => {
      const box = new Box();

      class Database {
        url = "postgres://localhost";
      }

      const DbObject = computed((box) => ({
        db: box.get(Database),
        url: box.get(Database).url,
      }));

      const { db, url } = box.get(DbObject);

      expect(db).toBe(box.get(Database));
      expect(url).toBe("postgres://localhost");
    });
  });

  describe("mock", () => {
    it("should replace a constructor with a custom value", () => {
      const box = new Box();

      class TestClass {
        value = "original";
      }

      const mockInstance = { value: "mocked" };
      Box.mock(box, TestClass, mockInstance);

      const instance = box.get(TestClass);

      expect(instance).toBe(mockInstance);
      expect(instance.value).toBe("mocked");
    });

    it("should replace a constructor's dependency with a custom value", () => {
      const box = new Box();

      class Dependency {
        value = "original";
      }

      class TestClass {
        constructor(public dep: Dependency) {}

        static init = Box.fn((box) => new TestClass(box.get(Dependency)));
      }

      const mockDep = { value: "mocked" };
      Box.mock(box, Dependency, mockDep);

      const instance = box.get(TestClass);

      expect(instance.dep).toBe(mockDep);
      expect(instance.dep.value).toBe("mocked");
    });

    it("should not call constructor when mocked", () => {
      const box = new Box();
      let constructorCalled = false;

      class TestClass {
        constructor() {
          constructorCalled = true;
        }

        value = "original";
      }

      const mockInstance = { value: "mocked" };
      Box.mock(box, TestClass, mockInstance);

      const instance = box.get(TestClass);

      expect(constructorCalled).toBe(false);
      expect(instance).toBe(mockInstance);
      expect(instance.value).toBe("mocked");
    });
  });

  describe("clear", () => {
    it("should clear a specific constructor from the cache", () => {
      const box = new Box();

      class ServiceA {
        id = Math.random();
      }

      class ServiceB {
        id = Math.random();
      }

      const a1 = box.get(ServiceA);
      const b1 = box.get(ServiceB);
      expect(Box.clear(box, ServiceA)).toBe(true);
      const a2 = box.get(ServiceA);
      const b2 = box.get(ServiceB);

      expect(a1).not.toBe(a2);
      expect(b1).toBe(b2);
    });

    it("should clear all constructors from the cache", () => {
      const box = new Box();

      class ServiceA {
        id = Math.random();
      }

      class ServiceB {
        id = Math.random();
      }

      const a1 = box.get(ServiceA);
      const b1 = box.get(ServiceB);
      expect(Box.clear(box)).toBe(true);
      const a2 = box.get(ServiceA);
      const b2 = box.get(ServiceB);

      expect(a1).not.toBe(a2);
      expect(b1).not.toBe(b2);
    });

    it("should return false when clearing a constructor that was not cached", () => {
      const box = new Box();

      class Service {
        id = Math.random();
      }

      expect(Box.clear(box, Service)).toBe(false);
    });

    it("should return false when clearing an empty box", () => {
      const box = new Box();

      expect(Box.clear(box)).toBe(false);
    });
  });

  describe("integration", () => {
    it("should handle complex dependency graphs", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      class Repository {
        constructor(public db: Database) {}

        static init = Box.fn((box) => new Repository(box.get(Database)));
      }

      class Service {
        constructor(public repo: Repository) {}

        static init = Box.fn((box) => new Service(box.get(Repository)));
      }

      class Controller {
        constructor(public service: Service) {}

        static init = Box.fn((box) => new Controller(box.get(Service)));
      }

      const controller = box.get(Controller);

      expect(controller).toBeInstanceOf(Controller);
      expect(controller.service).toBeInstanceOf(Service);
      expect(controller.service.repo).toBeInstanceOf(Repository);
      expect(controller.service.repo.db).toBeInstanceOf(Database);
      expect(controller.service.repo.db.name).toBe("db");
    });

    it("should maintain single instances across dependency graph", () => {
      const box = new Box();

      class SharedConfig {
        id = Math.random();
      }

      class ServiceA {
        constructor(public config: SharedConfig) {}

        static init = Box.fn((box) => new ServiceA(box.get(SharedConfig)));
      }

      class ServiceB {
        constructor(public config: SharedConfig) {}

        static init = Box.fn((box) => new ServiceB(box.get(SharedConfig)));
      }

      class App {
        constructor(
          public serviceA: ServiceA,
          public serviceB: ServiceB,
          public config: SharedConfig,
        ) {}

        static init = Box.fn(
          (box) =>
            new App(
              box.get(ServiceA),
              box.get(ServiceB),
              box.get(SharedConfig),
            ),
        );
      }

      const app = box.get(App);

      expect(app.serviceA.config).toBe(app.serviceB.config);
      expect(app.serviceA.config).toBe(app.config);
      expect(app.serviceB.config).toBe(app.config);
    });
  });
});
