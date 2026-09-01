function initials(name) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("");
}

/** @type {import("@ember/component/template-only").TOC<{ Args: { name: string } }>} */
const Avatar = <template>
  <span class="avatar" aria-hidden="true">{{initials @name}}</span>
</template>;

export default Avatar;
