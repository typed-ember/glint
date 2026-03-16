/**
 * Benchmark: TemplateContext per-slot cache vs no cache.
 *
 * Uses templateToTypescript directly (no external project needed).
 * Run: node test-packages/package-test-core/__tests__/transform/template-context-cache.bench.mjs
 */

import { templateToTypescript } from '@glint/ember-tsc/transform/template/template-to-typescript';

const template = `
<div class="dashboard" ...attributes>
  <header>
    <h1>{{this.title}}</h1>
    <nav>
      {{#each this.navItems as |navItem|}}
        <a href={{navItem.url}} class={{if navItem.active "active"}}>
          {{navItem.label}}
        </a>
      {{/each}}
    </nav>
  </header>
  <main>
    {{#if this.isLoading}}
      <p>Loading...</p>
    {{else}}
      {{#each this.widgets as |widget|}}
        <div data-id={{widget.id}}>
          <h3>{{widget.title}}</h3>
          {{#each widget.rows as |row|}}
            <tr>
              {{#each widget.columns as |col|}}
                <td>{{col}}</td>
              {{/each}}
            </tr>
          {{/each}}
        </div>
      {{/each}}
    {{/if}}
  </main>
</div>`;

const opts = {
  typesModule: '@glint/ember-tsc/-private/dsl',
  backingValue: 'this',
  globals: ['if', 'each'],
};

function bench(name, fn, n = 2000) {
  for (let i = 0; i < 5; i++) fn(); // warmup
  const t = [];
  for (let i = 0; i < n; i++) {
    const s = performance.now();
    fn();
    t.push(performance.now() - s);
  }
  t.sort((a, b) => a - b);
  const median = t[Math.floor(t.length / 2)];
  console.log(
    `  ${name.padEnd(40)} median=${median < 1 ? `${(median * 1000).toFixed(0)}µs` : `${median.toFixed(2)}ms`}  (n=${n})`,
  );
  return median;
}

console.log('TemplateContext cache benchmark\n');

const withoutCtx = bench('without TemplateContext', () => {
  templateToTypescript(template, opts);
});

const ctx = {};
const withCtx = bench('with TemplateContext (cache hit)', () => {
  templateToTypescript(template, { ...opts, templateContext: ctx });
});

console.log(`\n  speedup: ${(withoutCtx / withCtx).toFixed(0)}x`);
