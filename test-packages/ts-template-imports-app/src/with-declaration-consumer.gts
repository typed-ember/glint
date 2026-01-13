import { Foo } from './with-declaration.gjs';


export default <template>
  {{! @glint-expect-error argument is required }}
  <Foo />

  {{! @glint-expect-error wrong argument type }}
  <Foo @foo={{1}} />

  <Foo @foo="hello" />

  <Foo @foo="hello">
    greetings
  </Foo>

  <Foo @foo="hello" data-test data-foo="test" />
</template>;
