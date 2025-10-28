import { expectTypeOf } from 'expect-type';
import type { AttributesForElement } from '../../-private/dsl';


{
    type Attributes = keyof AttributesForElement<HTMLImageElement>;
    expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | keyof HTMLImageElementAttributes>();

    type AttributeKeys = keyof HTMLImageElementAttributes & string;
    expectTypeOf<AttributeKeys>().toBeString();
    expectTypeOf<'alt' | 'src'>().toExtend<AttributeKeys>();

}

{
    type Attributes = keyof AttributesForElement<HTMLDivElement> & string;
    expectTypeOf<Attributes>().toEqualTypeOf<`data-${string}` | keyof HTMLDivElementAttributes>();

    type AttributeKeys = keyof HTMLDivElementAttributes & string;
    expectTypeOf<AttributeKeys>().toBeString();
    expectTypeOf<"aria-label">().toExtend<AttributeKeys>();

}