import { expectTypeOf } from 'expect-type';
import DebuggerKeyword from '@glint/template/-private/keywords/debugger';
import EachKeyword from '@glint/template/-private/keywords/each';
import HasBlockKeyword from '@glint/template/-private/keywords/has-block';
import HasBlockParamsKeyword from '@glint/template/-private/keywords/has-block-params';
import InElementKeyword from '@glint/template/-private/keywords/in-element';
import LetKeyword from '@glint/template/-private/keywords/let';
import WithKeyword from '@glint/template/-private/keywords/with';

import { Globals } from '@glint/environment-glimmerx/types';

expectTypeOf(Globals['debugger']).toEqualTypeOf<DebuggerKeyword>();
expectTypeOf(Globals['each']).toEqualTypeOf<EachKeyword>();
expectTypeOf(Globals['has-block']).toEqualTypeOf<HasBlockKeyword>();
expectTypeOf(Globals['has-block-params']).toEqualTypeOf<HasBlockParamsKeyword>();
expectTypeOf(Globals['in-element']).toEqualTypeOf<InElementKeyword>();
expectTypeOf(Globals['let']).toEqualTypeOf<LetKeyword>();
expectTypeOf(Globals['with']).toEqualTypeOf<WithKeyword>();

// TODO: either add a keyword type or implement directly in the transformation layer
expectTypeOf(Globals['unless']).toEqualTypeOf<void>();
