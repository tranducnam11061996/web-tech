import { DomUtils, ElementType, parseDocument } from 'htmlparser2';
import sanitizeHtml from 'sanitize-html';
import type { PublicProductPromotion } from '@/lib/productPromotions';

export type PublicProductPromotionItem = Omit<PublicProductPromotion, 'id'> & {
  id: number | string;
  source: 'managed' | 'product-editor';
  html?: string;
};

type HtmlNode = {
  type: string;
  name?: string;
  data?: string;
  attribs?: Record<string, string>;
  children?: HtmlNode[];
};

const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li']);
const LIST_TAGS = new Set(['ul', 'ol']);
const COLOR_VALUE = /^(?:#[0-9a-f]{3,8}|[a-z]+|rgba?\(\s*\d{1,3}%?\s*,\s*\d{1,3}%?\s*,\s*\d{1,3}%?(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;

function sanitizePromotionHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
      'span', 'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'sub', 'sup', 'a', 'br',
    ],
    allowedAttributes: {
      '*': ['style'],
      a: ['href', 'title', 'target', 'rel', 'style'],
    },
    allowedStyles: {
      '*': {
        color: [COLOR_VALUE],
        'background-color': [COLOR_VALUE],
        'font-weight': [/^(?:normal|bold|bolder|lighter|[1-9]00)$/i],
        'font-style': [/^(?:normal|italic|oblique)$/i],
        'text-decoration': [/^(?:none|underline|line-through|overline)(?:\s+(?:solid|double|dotted|dashed|wavy))?$/i],
        'text-align': [/^(?:left|right|center|justify|start|end)$/i],
      },
    },
    allowedSchemes: ['https'],
    allowedSchemesByTag: { a: ['https'] },
    allowedSchemesAppliedToAttributes: ['href'],
    allowProtocolRelative: false,
    nonTextTags: ['script', 'style', 'textarea', 'option', 'iframe', 'object', 'embed', 'form', 'table'],
    nestingLimit: 20,
    transformTags: {
      a: (_tagName, attributes) => {
        const href = String(attributes.href || '').trim();
        const external = /^https:\/\//i.test(href);
        return {
          tagName: 'a',
          attribs: {
            ...(href ? { href } : {}),
            ...(attributes.title ? { title: attributes.title } : {}),
            ...(attributes.style ? { style: attributes.style } : {}),
            ...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
          },
        };
      },
    },
  });
}

function isElement(node: HtmlNode): node is HtmlNode & { name: string; attribs: Record<string, string>; children: HtmlNode[] } {
  return node.type === ElementType.Tag || node.type === ElementType.Script || node.type === ElementType.Style;
}

function escapeText(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttribute(value: string) {
  return escapeText(value).replace(/"/g, '&quot;');
}

function serializeAttributes(attributes: Record<string, string> | undefined) {
  if (!attributes) return '';
  return Object.entries(attributes)
    .map(([name, value]) => ` ${name}="${escapeAttribute(value)}"`)
    .join('');
}

function serializeInlineNode(node: HtmlNode): string[] {
  if (node.type === ElementType.Text) {
    return String(node.data || '').split(/\r?\n/).map(escapeText);
  }
  if (!isElement(node)) return [''];
  if (node.name.toLowerCase() === 'br') return ['', ''];

  const parts = serializeInlineNodes(node.children || []);
  const tagName = node.name.toLowerCase();
  const attributes = serializeAttributes(node.attribs);
  return parts.map((part) => part ? `<${tagName}${attributes}>${part}</${tagName}>` : '');
}

function serializeInlineNodes(nodes: HtmlNode[]) {
  const lines = [''];
  for (const node of nodes) {
    const parts = serializeInlineNode(node);
    lines[lines.length - 1] += parts[0] || '';
    for (let index = 1; index < parts.length; index += 1) lines.push(parts[index] || '');
  }
  return lines;
}

function hasVisibleText(html: string) {
  const document = parseDocument(html);
  return DomUtils.textContent(document).replace(/\u00a0/g, ' ').trim().length > 0;
}

function normalizedBlockHtml(node: HtmlNode, content: string) {
  const style = node.attribs?.style ? ` style="${escapeAttribute(node.attribs.style)}"` : '';
  return `<div${style}>${content}</div>`;
}

function collectLineFragments(nodes: HtmlNode[], output: string[]) {
  let inlineBuffer: HtmlNode[] = [];
  const flushInlineBuffer = () => {
    if (inlineBuffer.length === 0) return;
    for (const line of serializeInlineNodes(inlineBuffer)) {
      const html = `<div>${line}</div>`;
      if (hasVisibleText(html)) output.push(html);
    }
    inlineBuffer = [];
  };

  for (const node of nodes) {
    if (!isElement(node)) {
      inlineBuffer.push(node);
      continue;
    }

    const tagName = node.name.toLowerCase();
    if (LIST_TAGS.has(tagName)) {
      flushInlineBuffer();
      collectLineFragments(node.children || [], output);
      continue;
    }

    if (!BLOCK_TAGS.has(tagName)) {
      inlineBuffer.push(node);
      continue;
    }

    flushInlineBuffer();
    const nestedBlocks = (node.children || []).some((child) => isElement(child) && (BLOCK_TAGS.has(child.name.toLowerCase()) || LIST_TAGS.has(child.name.toLowerCase())));
    if (nestedBlocks) {
      const nested: string[] = [];
      collectLineFragments(node.children || [], nested);
      const style = node.attribs?.style;
      for (const html of nested) {
        const styledHtml = style ? `<div style="${escapeAttribute(style)}">${html}</div>` : html;
        if (hasVisibleText(styledHtml)) output.push(styledHtml);
      }
      continue;
    }

    for (const line of serializeInlineNodes(node.children || [])) {
      const html = normalizedBlockHtml(node, line);
      if (hasVisibleText(html)) output.push(html);
    }
  }

  flushInlineBuffer();
}

function plainTextFromHtml(html: string) {
  return DomUtils.textContent(parseDocument(html)).replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parseProductEditorPromotions(productId: number, value: unknown): PublicProductPromotionItem[] {
  if (!Number.isInteger(productId) || productId <= 0) return [];
  const sanitized = sanitizePromotionHtml(String(value || ''));
  if (!sanitized.trim()) return [];

  const document = parseDocument(sanitized) as unknown as { children: HtmlNode[] };
  const fragments: string[] = [];
  collectLineFragments(document.children || [], fragments);

  return fragments.map((html, index) => ({
    id: `product-editor:${productId}:${index}`,
    source: 'product-editor' as const,
    text: plainTextFromHtml(html),
    detailUrl: '',
    html,
  }));
}

export function mergeProductPromotions(
  managedPromotions: PublicProductPromotion[],
  editorPromotions: PublicProductPromotionItem[],
): PublicProductPromotionItem[] {
  return [
    ...managedPromotions.map((promotion) => ({ ...promotion, source: 'managed' as const })),
    ...editorPromotions,
  ];
}
