import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypeStringify from 'rehype-stringify';

// Custom sanitize schema: allow the HTML elements a blog post actually needs,
// while still stripping <script>, on* handlers, javascript: URLs, iframes, etc.
// This is XSS-safe even with author-controlled content.
const blogSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'details', 'summary', 'hr', 'br',
    'pre', 'code', 'kbd', 'mark', 'sub', 'sup',
    'del', 'ins', 'small',
  ],
  attributes: {
    ...(defaultSchema.attributes || {}),
    '*': [
      ...((defaultSchema.attributes || {})['*'] || []),
      'className', 'class', 'id', 'title', 'lang',
    ],
    a: [['href'], ['title'], ['rel'], ['target'], ['className'], ['class']],
    img: [['src'], ['alt'], ['title'], ['width'], ['height'], ['loading'], ['className'], ['class']],
    th: [['align'], ['scope'], ['className']],
    td: [['align'], ['className']],
    code: [['className']],
    pre: [['className']],
    div: [['className']],
  },
  protocols: {
    ...(defaultSchema.protocols || {}),
    href: ['http', 'https', 'mailto', '#'],
    src: ['http', 'https', 'data'],
  },
};

export async function renderSafeMarkdown(markdown) {
  const file = await unified()
    .use(remarkParse)        // md -> mdast
    .use(remarkGfm)          // GFM tables, strikethrough, etc.
    .use(remarkRehype, { allowDangerousHtml: false })  // mdast -> hast
    .use(rehypeSlug)         // add id attributes to headings for anchor links
    .use(rehypeAutolinkHeadings, { behavior: 'append', properties: { className: ['anchor-link'], ariaHidden: 'true' }, content: { type: 'element', tagName: 'span', properties: { className: ['anchor-icon'] }, children: [{ type: 'text', value: '#' }] } })
    .use(rehypeSanitize, blogSchema)  // strip dangerous nodes
    .use(rehypeStringify)    // hast -> html
    .process(markdown);
  return String(file);
}
