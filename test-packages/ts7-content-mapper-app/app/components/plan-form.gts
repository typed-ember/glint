import { on } from "@ember/modifier";

type Submit = (
  event: SubmitEvent & {
    currentTarget: HTMLFormElement & { elements: { plan: HTMLSelectElement } };
  },
) => void;

const submit: Submit = (event) => {
  event.preventDefault();
};

export const PlanForm = <template>
  <form class="stack" method="post" aria-label="Plan" {{on "submit" submit}}>
    <select name="plan"></select>
  </form>
</template>;
