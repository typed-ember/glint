import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import { expectTypeOf } from 'expect-type';
import { templateForBackingValue } from '../../-private/dsl';

class TestRoute extends Route {
  override async model(): Promise<{ message: string }> {
    return { message: 'hello' };
  }
}

templateForBackingValue(TestRoute, function (routeContext) {
  expectTypeOf(routeContext.args).toEqualTypeOf<{ model: { message: string } }>();
  expectTypeOf(routeContext.element).toBeNull();
  expectTypeOf(routeContext.this).toEqualTypeOf<Controller & { model: { message: string } }>();
  expectTypeOf(routeContext.blocks).toEqualTypeOf<{}>();
});

class TestController extends Controller {
  declare date: Date;
  declare model: {
    name: string;
    age: number;
  };
}

templateForBackingValue(TestController, function (controllerContext) {
  expectTypeOf(controllerContext.args).toEqualTypeOf<{ model: { name: string; age: number } }>();
  expectTypeOf(controllerContext.element).toBeNull();
  expectTypeOf(controllerContext.this).toEqualTypeOf<TestController>();
  expectTypeOf(controllerContext.blocks).toEqualTypeOf<{}>();
});
