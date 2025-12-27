import { describe, it, expect } from "vitest";
import { Box, factory, constant, ConstructorInstanceType } from "../src";

describe("Box", () => {
  describe("new", () => {
    it("should create a new instance each time without caching", () => {
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

    it("should use static init method if present", () => {
      const box = new Box();

      class TestClass {
        constructor(public value: string) {}

        static init(box: Box) {
          return new TestClass("from init");
        }
      }

      const instance = box.new(TestClass);

      expect(instance.value).toBe("from init");
    });

    it("should create new instances with factory constructors", () => {
      const box = new Box();

      const TestFactory = factory((box: Box) => {
        return { value: Math.random() };
      });

      const instance1 = box.new(TestFactory);
      const instance2 = box.new(TestFactory);

      expect(instance1).not.toBe(instance2);
      expect(instance1.value).not.toBe(instance2.value);
    });

    it("should not affect cached instances from box.get", () => {
      const box = new Box();

      class TestClass {
        value = Math.random();
      }

      const cached = box.get(TestClass);
      const transient1 = box.new(TestClass);
      const transient2 = box.new(TestClass);
      const cachedAgain = box.get(TestClass);

      expect(cached).toBe(cachedAgain);
      expect(transient1).not.toBe(cached);
      expect(transient2).not.toBe(cached);
      expect(transient1).not.toBe(transient2);
    });

    it("should resolve dependencies from cache when using init", () => {
      const box = new Box();

      class DependencyA {
        value = Math.random();
      }

      class DependencyB {
        value = Math.random();
      }

      class TestClass {
        constructor(public depA: DependencyA, public depB: DependencyB) {}

        static init(box: Box) {
          return new TestClass(box.get(DependencyA), box.get(DependencyB));
        }
      }

      const cachedDepA = box.get(DependencyA);
      const instance1 = box.new(TestClass);
      const instance2 = box.new(TestClass);
      const cachedDepB = box.get(DependencyB);

      expect(instance1).not.toBe(instance2);
      expect(instance1.depA).toBe(cachedDepA);
      expect(instance2.depA).toBe(cachedDepA);
      expect(instance1.depA).toBe(instance2.depA);
      expect(instance1.depB).toBe(cachedDepB);
      expect(instance2.depB).toBe(cachedDepB);
      expect(instance1.depB).toBe(instance2.depB);
    });
  });

  describe("get", () => {
    it("should create and return an instance of a class", () => {
      const box = new Box();

      class TestClass {
        value = "test";
      }

      const instance = box.get(TestClass);

      expect(instance).toBeInstanceOf(TestClass);
      expect(instance.value).toBe("test");
    });

    it("should cache instances and return the same instance on subsequent calls", () => {
      const box = new Box();

      class TestClass {
        value = Math.random();
      }

      const instance1 = box.get(TestClass);
      const instance2 = box.get(TestClass);

      expect(instance1).toBe(instance2);
      expect(instance1.value).toBe(instance2.value);
    });

    it("should use static init method if present", () => {
      const box = new Box();

      class TestClass {
        constructor(public value: string) {}

        static init(box: Box) {
          return new TestClass("from init");
        }
      }

      const instance = box.get(TestClass);

      expect(instance.value).toBe("from init");
    });

    it("should resolve dependencies using box in static init", () => {
      const box = new Box();

      class Dependency {
        value = "dependency";
      }

      class TestClass {
        constructor(public dep: Dependency) {}

        static init(box: Box) {
          return new TestClass(box.get(Dependency));
        }
      }

      const instance = box.get(TestClass);

      expect(instance.dep).toBeInstanceOf(Dependency);
      expect(instance.dep.value).toBe("dependency");
    });

    it("should share dependency instances across multiple classes", () => {
      const box = new Box();

      class SharedDependency {
        value = Math.random();
      }

      class ClassA {
        constructor(public dep: SharedDependency) {}

        static init(box: Box) {
          return new ClassA(box.get(SharedDependency));
        }
      }

      class ClassB {
        constructor(public dep: SharedDependency) {}

        static init(box: Box) {
          return new ClassB(box.get(SharedDependency));
        }
      }

      const instanceA = box.get(ClassA);
      const instanceB = box.get(ClassB);

      expect(instanceA.dep).toBe(instanceB.dep);
    });
  });

  describe("factory", () => {
    it("should create a factory constructor", () => {
      const box = new Box();

      const TestFactory = factory((box: Box) => {
        return { value: "from factory" };
      });

      const instance = box.get(TestFactory);

      expect(instance.value).toBe("from factory");
    });

    it("should cache factory instances", () => {
      const box = new Box();

      const TestFactory = factory((box: Box) => {
        return { value: Math.random() };
      });

      const instance1 = box.get(TestFactory);
      const instance2 = box.get(TestFactory);

      expect(instance1).toBe(instance2);
      expect(instance1.value).toBe(instance2.value);
    });

    it("should resolve dependencies in factory functions", () => {
      const box = new Box();

      class Dependency {
        value = "dependency";
      }

      const TestFactory = factory((box: Box) => {
        const dep = box.get(Dependency);
        return { dep };
      });

      const instance = box.get(TestFactory);

      expect(instance.dep).toBeInstanceOf(Dependency);
      expect(instance.dep.value).toBe("dependency");
    });

    it("should work with interfaces and implementations", () => {
      const box = new Box();

      interface Logger {
        log(message: string): void;
      }

      class ConsoleLogger implements Logger {
        messages: string[] = [];

        log(message: string): void {
          this.messages.push(message);
        }
      }

      const LoggerFactory = factory((box: Box): Logger => {
        return new ConsoleLogger();
      });

      const logger = box.get(LoggerFactory) as ConsoleLogger;
      logger.log("test");

      expect(logger.messages).toEqual(["test"]);
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

    it("should cache constant values", () => {
      const box = new Box();

      const value = { id: Math.random() };
      const ValueConstant = constant(value);

      const instance1 = box.get(ValueConstant);
      const instance2 = box.get(ValueConstant);

      expect(instance1).toBe(instance2);
      expect(instance1).toBe(value);
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

    it("should be usable as dependencies in other constructors", () => {
      const box = new Box();

      const ConfigConstant = constant({ apiUrl: "https://api.example.com" });

      class ApiClient {
        constructor(public config: { apiUrl: string }) {}

        static init(box: Box) {
          return new ApiClient(box.get(ConfigConstant));
        }
      }

      const client = box.get(ApiClient);

      expect(client.config.apiUrl).toBe("https://api.example.com");
    });

    it("should work with box.for().get()", () => {
      const box = new Box();

      const DatabaseUrl = constant("postgres://localhost:5432/mydb");

      class Database {
        constructor(public url: string) {}
      }

      const db = box.for(Database).get(DatabaseUrl);

      expect(db.url).toBe("postgres://localhost:5432/mydb");
    });
  });

  describe("for", () => {
    it("should create an instance with dependencies from box using get", () => {
      const box = new Box();

      class ServiceA {
        name = "A";
      }

      class ServiceB {
        name = "B";
      }

      class App {
        constructor(public serviceA: ServiceA, public serviceB: ServiceB) {}
      }

      const app = box.for(App).get(ServiceA, ServiceB);

      expect(app).toBeInstanceOf(App);
      expect(app.serviceA).toBeInstanceOf(ServiceA);
      expect(app.serviceB).toBeInstanceOf(ServiceB);
      expect(app.serviceA.name).toBe("A");
      expect(app.serviceB.name).toBe("B");
    });

    it("should create an instance with dependencies using new", () => {
      const box = new Box();

      class Dependency {
        id = Math.random();
      }

      class TestClass {
        constructor(public dep: Dependency) {}
      }

      const instance1 = box.for(TestClass).new(Dependency);
      const instance2 = box.for(TestClass).new(Dependency);

      expect(instance1).toBeInstanceOf(TestClass);
      expect(instance2).toBeInstanceOf(TestClass);
      expect(instance1).not.toBe(instance2);
      expect(instance1.dep).not.toBe(instance2.dep);
    });

    it("should use cached dependencies with get", () => {
      const box = new Box();

      class Dependency {
        id = Math.random();
      }

      class ClassA {
        constructor(public dep: Dependency) {}
      }

      class ClassB {
        constructor(public dep: Dependency) {}
      }

      const instanceA = box.for(ClassA).get(Dependency);
      const instanceB = box.for(ClassB).get(Dependency);

      expect(instanceA.dep).toBe(instanceB.dep);
    });

    it("should work with factory constructors as dependencies", () => {
      const box = new Box();

      interface Logger {
        log(message: string): void;
      }

      class ConsoleLogger implements Logger {
        log(message: string): void {
          console.log(message);
        }
      }

      const LoggerFactory = factory((box: Box): Logger => {
        return new ConsoleLogger();
      });

      class Service {
        constructor(public logger: Logger) {}
      }

      const service = box.for(Service).get(LoggerFactory);

      expect(service).toBeInstanceOf(Service);
      expect(service.logger).toBeInstanceOf(ConsoleLogger);
    });

    it("should handle multiple dependencies of different types", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      const ConfigFactory = factory((box: Box) => {
        return { port: 3000 };
      });

      class Cache {
        type = "redis";
      }

      class Application {
        constructor(
          public db: Database,
          public config: { port: number },
          public cache: Cache
        ) {}
      }

      const app = box.for(Application).get(Database, ConfigFactory, Cache);

      expect(app.db).toBeInstanceOf(Database);
      expect(app.config.port).toBe(3000);
      expect(app.cache).toBeInstanceOf(Cache);
    });

    it("should create transient instances and dependencies with new", () => {
      const box = new Box();

      class SharedDep {
        id = Math.random();
      }

      class TestClass {
        constructor(public dep: SharedDep) {}
      }

      const instance1 = box.for(TestClass).new(SharedDep);
      const instance2 = box.for(TestClass).new(SharedDep);

      expect(instance1).not.toBe(instance2);
      expect(instance1.dep).not.toBe(instance2.dep);
      expect(instance1.dep.id).not.toBe(instance2.dep.id);
    });

    it("should not cache instances created with for().get", () => {
      const box = new Box();

      class Dependency {
        id = Math.random();
      }

      class TestClass {
        constructor(public dep: Dependency) {}
      }

      const instance1 = box.for(TestClass).get(Dependency);
      const instance2 = box.for(TestClass).get(Dependency);
      const cachedDep = box.get(Dependency);

      expect(instance1).not.toBe(instance2);
      expect(instance1.dep).toBe(cachedDep);
      expect(instance2.dep).toBe(cachedDep);
      expect(instance1.dep).toBe(instance2.dep);
    });
  });

  describe("mock", () => {
    it("should mock a class with a custom instance", () => {
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

    it("should mock a factory with a custom instance", () => {
      const box = new Box();

      const TestFactory = factory((box: Box) => {
        return { value: "original" };
      });

      const mockInstance = { value: "mocked" };
      Box.mock(box, TestFactory, mockInstance);

      const instance = box.get(TestFactory);

      expect(instance).toBe(mockInstance);
      expect(instance.value).toBe("mocked");
    });

    it("should allow mocking dependencies for testing", () => {
      const box = new Box();

      interface Logger {
        log(message: string): void;
      }

      class ConsoleLogger implements Logger {
        log(message: string): void {
          console.log(message);
        }
      }

      const LoggerFactory = factory((box: Box): Logger => {
        return new ConsoleLogger();
      });

      class UserService {
        constructor(private logger: Logger) {}

        static init(box: Box) {
          return new UserService(box.get(LoggerFactory));
        }

        createUser(name: string) {
          this.logger.log(`Creating user: ${name}`);
        }
      }

      class MockLogger implements Logger {
        messages: string[] = [];

        log(message: string): void {
          this.messages.push(message);
        }
      }

      const mockLogger = new MockLogger();
      Box.mock(box, LoggerFactory, mockLogger);

      const service = box.get(UserService);
      service.createUser("Alice");

      expect(mockLogger.messages).toEqual(["Creating user: Alice"]);
    });

    it("should mock before instance creation", () => {
      const box = new Box();

      class Dependency {
        value = "original";
      }

      class TestClass {
        constructor(public dep: Dependency) {}

        static init(box: Box) {
          return new TestClass(box.get(Dependency));
        }
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

  describe("integration", () => {
    it("should handle complex dependency graphs", () => {
      const box = new Box();

      class Database {
        name = "db";
      }

      class Repository {
        constructor(public db: Database) {}

        static init(box: Box) {
          return new Repository(box.get(Database));
        }
      }

      class Service {
        constructor(public repo: Repository) {}

        static init(box: Box) {
          return new Service(box.get(Repository));
        }
      }

      class Controller {
        constructor(public service: Service) {}

        static init(box: Box) {
          return new Controller(box.get(Service));
        }
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

        static init(box: Box) {
          return new ServiceA(box.get(SharedConfig));
        }
      }

      class ServiceB {
        constructor(public config: SharedConfig) {}

        static init(box: Box) {
          return new ServiceB(box.get(SharedConfig));
        }
      }

      class App {
        constructor(
          public serviceA: ServiceA,
          public serviceB: ServiceB,
          public config: SharedConfig
        ) {}

        static init(box: Box) {
          return new App(
            box.get(ServiceA),
            box.get(ServiceB),
            box.get(SharedConfig)
          );
        }
      }

      const app = box.get(App);

      expect(app.serviceA.config).toBe(app.serviceB.config);
      expect(app.serviceA.config).toBe(app.config);
      expect(app.serviceB.config).toBe(app.config);
    });

    it("should work with mixed class and factory constructors", () => {
      const box = new Box();

      class ClassDep {
        type = "class";
      }

      const FactoryDep = factory((box: Box) => {
        return { type: "factory" };
      });

      class MixedService {
        constructor(
          public classDep: ClassDep,
          public factoryDep: ConstructorInstanceType<typeof FactoryDep>
        ) {}

        static init(box: Box) {
          return new MixedService(box.get(ClassDep), box.get(FactoryDep));
        }
      }

      const service = box.get(MixedService);

      expect(service.classDep.type).toBe("class");
      expect(service.factoryDep.type).toBe("factory");
    });
  });
});
