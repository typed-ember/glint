import Route from '@ember/routing/route';
import Controller from '@ember/controller';
import { expectTypeOf } from 'expect-type';
import { templateForBackingValue } from '../../-private/dsl';
class TestRoute extends Route {
    async model() {
        return { message: 'hello' };
    }
}
templateForBackingValue(TestRoute, function (routeContext) {
    expectTypeOf(routeContext.args).toEqualTypeOf();
    expectTypeOf(routeContext.element).toBeNull();
    expectTypeOf(routeContext.this).toEqualTypeOf();
    expectTypeOf(routeContext.blocks).toEqualTypeOf();
});
class TestController extends Controller {
}
templateForBackingValue(TestController, function (controllerContext) {
    expectTypeOf(controllerContext.args).toEqualTypeOf();
    expectTypeOf(controllerContext.element).toBeNull();
    expectTypeOf(controllerContext.this).toEqualTypeOf();
    expectTypeOf(controllerContext.blocks).toEqualTypeOf();
});
//# sourceMappingURL=route-and-controller.test.js.map