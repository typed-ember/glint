import { on } from '@ember/modifier';

const onCircle = (event: MouseEvent & { currentTarget: SVGCircleElement }) => event;
const onDiv = (event: MouseEvent & { currentTarget: HTMLDivElement }) => event;

export const NestedSvg = <template>
  <svg>
    <svg></svg>
    <circle {{on "click" onCircle}}></circle>
  </svg>
</template>;

export const ForeignObject = <template>
  <svg>
    <foreignObject>
      <div {{on "click" onDiv}}></div>
    </foreignObject>
    <circle {{on "click" onCircle}}></circle>
  </svg>
</template>;
