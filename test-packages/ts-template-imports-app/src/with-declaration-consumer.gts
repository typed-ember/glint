import { Foo } from './with-declaration';


export default <template>
  <Foo />

  {{! @glint-expect-error wrong argument type }}
  <Foo @foo={{1}} />

  <Foo @foo="hello" />

  <Foo @foo="hello">
    greetings
  </Foo>

  <Foo data-test data-foo="test" />
</template>;
