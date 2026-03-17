import Controller from '@ember/controller';
import Route from '@ember/routing/route';
import { templateForBackingValue } from '@glint/ember-tsc/-private/dsl';
import { expectTypeOf } from 'expect-type';

class TestRoute extends Route {
  override async model(): Promise<{ message: string }> {
    return { message: 'hello' };
  }
}

templateForBackingValue(TestRoute, function (routeContext) {
  expectTypeOf(routeContext.Args).toEqualTypeOf<{ model: { message: string } }>();
  expectTypeOf(routeContext.Element).toBeNull();
  expectTypeOf(routeContext.this).toEqualTypeOf<Controller & { model: { message: string } }>();
  expectTypeOf(routeContext.Blocks).toEqualTypeOf<{}>();
});

class TestController extends Controller {
  declare date: Date;
  declare model: {
    name: string;
    age: number;
  };
}

templateForBackingValue(TestController, function (controllerContext) {
  expectTypeOf(controllerContext.Args).toEqualTypeOf<{ model: { name: string; age: number } }>();
  expectTypeOf(controllerContext.Element).toBeNull();
  expectTypeOf(controllerContext.this).toEqualTypeOf<TestController>();
  expectTypeOf(controllerContext.Blocks).toEqualTypeOf<{}>();
});
