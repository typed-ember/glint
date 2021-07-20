import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import { expectTypeOf } from 'expect-type';
import { EmptyObject } from '@glint/template/-private/integration';
import { ResolveContext } from '../../-private/dsl';

class TestRoute extends Route {
  override async model(): Promise<{ message: string }> {
    return { message: 'hello' };
  }
}

declare const routeContext: ResolveContext<TestRoute>;

expectTypeOf(routeContext.args).toEqualTypeOf<{ model: { message: string } }>();
expectTypeOf(routeContext.element).toBeNull();
expectTypeOf(routeContext.this).toEqualTypeOf<Controller & { model: { message: string } }>();
expectTypeOf(routeContext.yields).toEqualTypeOf<EmptyObject>();

class TestController extends Controller {
  declare date: Date;
  declare model: {
    name: string;
    age: number;
  };
}

declare const controllerContext: ResolveContext<TestController>;

expectTypeOf(controllerContext.args).toEqualTypeOf<{ model: { name: string; age: number } }>();
expectTypeOf(controllerContext.element).toBeNull();
expectTypeOf(controllerContext.this).toEqualTypeOf<TestController>();
expectTypeOf(controllerContext.yields).toEqualTypeOf<EmptyObject>();
