import type { LanguageServicePlugin } from '@volar/language-service';
import type TransformedModule from '../transform/template/transformed-module.js';
import type GlimmerASTMappingTree from '../transform/template/glimmer-ast-mapping-tree.js';
import { getEmbeddedInfo } from './utils.js';

export interface ComponentMeta {
  args: Array<{
    name: string;
    type: string;
    description: string;
    required: boolean;
    tags: Array<{ name: string; text?: string }>;
  }>;
  blocks: Array<{
    name: string;
    params: string;
  }>;
  element: string | null;
}

export type TsPluginClient = {
  getComponentMeta(fileName: string, tagName: string): Promise<ComponentMeta | null>;
};

export function create(getTsPluginClient: () => TsPluginClient | undefined): LanguageServicePlugin {
  return {
    name: 'g-component-hover',
    capabilities: {
      hoverProvider: true,
    },
    create(_context) {
      return {
        async provideHover(document, position) {
          const info = getEmbeddedInfo(_context, document, 'gts');
          if (!info) return;

          const { root } = info;
          const transformedModule = root.transformedModule;
          if (!transformedModule) return;

          const offset = document.offsetAt(position);

          const componentInfo = findComponentAtOffset(transformedModule, offset);
          if (!componentInfo) return;

          const tsPluginClient = getTsPluginClient();
          if (!tsPluginClient) return;

          const filePath = info.sourceScript.id.fsPath;
          const meta = await tsPluginClient.getComponentMeta(filePath, componentInfo.tagName);
          if (!meta) return;

          const content = formatComponentHover(componentInfo.tagName, meta);
          if (!content) return;

          return {
            range: {
              start: document.positionAt(componentInfo.tagStart),
              end: document.positionAt(componentInfo.tagEnd),
            },
            contents: {
              kind: 'markdown' as const,
              value: content,
            },
          };
        },
      };
    },
  };
}

function findComponentAtOffset(
  transformedModule: TransformedModule,
  offset: number,
): { tagName: string; tagStart: number; tagEnd: number } | null {
  for (const span of transformedModule.correlatedSpans) {
    if (!span.glimmerAstMapping) continue;
    if (offset < span.originalStart || offset >= span.originalStart + span.originalLength) continue;

    const relativeOffset = offset - span.originalStart;

    const elementNode = findElementNodeInTree(span.glimmerAstMapping, relativeOffset);
    if (!elementNode) continue;

    const tagName: string = (elementNode.sourceNode as any).tag;
    const firstChar = tagName.charAt(0);

    // Components are PascalCase or namespaced (Foo.Bar)
    if (firstChar !== firstChar.toUpperCase() && !tagName.includes('.')) {
      return null; // plain element
    }

    const elementStart = span.originalStart + elementNode.originalRange.start;
    const source = span.originalFile.contents;
    const tagNameIdx = source.indexOf(tagName, elementStart);
    const tagStart = tagNameIdx >= 0 ? tagNameIdx : elementStart;
    const tagEnd = tagStart + tagName.length;

    return { tagName, tagStart, tagEnd };
  }
  return null;
}

function findElementNodeInTree(
  tree: GlimmerASTMappingTree,
  offset: number,
): GlimmerASTMappingTree | null {
  if (offset < tree.originalRange.start || offset >= tree.originalRange.end) {
    return null;
  }

  // Check children first (depth-first, find the deepest ElementNode)
  for (const child of tree.children) {
    const result = findElementNodeInTree(child, offset);
    if (result) return result;
  }

  if (tree.sourceNode?.type === 'ElementNode') {
    return tree;
  }

  return null;
}

function formatComponentHover(tagName: string, meta: ComponentMeta): string | null {
  const hasArgs = meta.args.length > 0;
  const hasBlocks = meta.blocks.length > 0;
  const hasElement = meta.element && meta.element !== 'unknown' && meta.element !== 'null';

  if (!hasArgs && !hasBlocks && !hasElement) return null;

  const lines: string[] = [];

  lines.push('```typescript');
  lines.push(`interface ${tagName}Signature {`);

  if (hasElement) {
    lines.push(`  Element: ${meta.element}`);
  }

  if (hasArgs) {
    lines.push('  Args: {');
    for (const arg of meta.args) {
      const opt = arg.required ? '' : '?';
      const deprecatedTag = arg.tags.find((t) => t.name === 'deprecated');
      let comment = '';
      if (deprecatedTag) {
        comment = ` // @deprecated${deprecatedTag.text ? ` ${deprecatedTag.text}` : ''}`;
      } else if (arg.description) {
        comment = ` // ${arg.description}`;
      }
      lines.push(`    ${arg.name}${opt}: ${arg.type}${comment}`);
    }
    lines.push('  }');
  }

  if (hasBlocks) {
    lines.push('  Blocks: {');
    for (const block of meta.blocks) {
      lines.push(`    ${block.name}: ${block.params}`);
    }
    lines.push('  }');
  }

  lines.push('}');
  lines.push('```');

  return lines.join('\n');
}
