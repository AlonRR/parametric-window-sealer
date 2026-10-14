// A small XML reader for SVG tiles (svg-tile, #27): elements, their attributes and their text,
// enough for what drawing programs write. It reads the declaration, processing instructions, a
// doctype, comments, CDATA and the predefined and numeric character references, and refuses a
// file that is not well formed, so a broken file is named rather than half read. It does not
// validate, resolve a doctype's own entities or follow namespaces.

export interface XmlElement {
  name: string; // as written, with any prefix: "svg", "xlink:href" is an attribute's
  attributes: ReadonlyMap<string, string>;
  children: XmlElement[];
  text: string; // its own character data and CDATA, joined; a style sheet's rules
}

// Why the text is not XML, in words that follow "The file is not an SVG drawing: ".
export class XmlError extends Error {}

const NAME = /[\p{L}_:][\p{L}\p{N}_:.\-·]*/uy;
const SPACE = /\s*/y;
const ENTITY = /&(#x[0-9a-fA-F]+|#[0-9]+|[A-Za-z_][-A-Za-z0-9_.]*);/g;
const PREDEFINED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
// Deeper than any drawing program nests, and shallow enough for the code that walks the tree.
const MAX_DEPTH = 500;

// Character references as their characters; an entity the doctype declares is left as written.
function decode(text: string): string {
  if (!text.includes('&')) return text;
  return text.replaceAll(ENTITY, (whole, ref: string) => {
    if (!ref.startsWith('#')) return PREDEFINED[ref] ?? whole;
    const code = ref.startsWith('#x') ? Number.parseInt(ref.slice(2), 16) : Number.parseInt(ref.slice(1), 10);
    return code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

function fail(why: string): never {
  throw new XmlError(why);
}

export function parseXml(text: string): XmlElement {
  let at = 0;
  const open: XmlElement[] = [];
  let root: XmlElement | undefined;
  const skipSpace = () => {
    SPACE.lastIndex = at;
    SPACE.exec(text);
    at = SPACE.lastIndex;
  };
  const name = (): string => {
    NAME.lastIndex = at;
    const m = NAME.exec(text);
    if (m === null) return fail(`it has a tag it cannot read, at character ${at + 1}`);
    at = NAME.lastIndex;
    return m[0];
  };
  const past = (end: string, what: string): number => {
    const found = text.indexOf(end, at);
    if (found === -1) fail(`${what} is not closed`);
    return found;
  };

  while (at < text.length) {
    const lt = text.indexOf('<', at);
    const chars = text.slice(at, lt === -1 ? text.length : lt);
    const inside = open.at(-1);
    if (inside !== undefined) inside.text += decode(chars);
    else if (chars.trim() !== '') fail('it has text outside its root element');
    if (lt === -1) break;
    at = lt;
    if (text.startsWith('<!--', at)) {
      at = past('-->', 'a comment') + 3;
    } else if (text.startsWith('<![CDATA[', at)) {
      const end = past(']]>', 'a CDATA section');
      if (inside === undefined) fail('it has a CDATA section outside its root element');
      else inside.text += text.slice(at + 9, end);
      at = end + 3;
    } else if (text.startsWith('<?', at)) {
      at = past('?>', 'a processing instruction') + 2;
    } else if (text.startsWith('<!', at)) {
      // A doctype, perhaps with declarations in brackets, which may hold ">".
      if (root !== undefined) fail('it has a doctype after its root element');
      const close = past('>', 'the doctype');
      const bracket = text.indexOf('[', at);
      if (bracket !== -1 && bracket < close) {
        at = bracket;
        at = past(']', 'the doctype');
        at = past('>', 'the doctype') + 1;
      } else {
        at = close + 1;
      }
    } else if (text.startsWith('</', at)) {
      at += 2;
      const closing = name();
      skipSpace();
      if (text[at] !== '>') fail(`the closing tag </${closing}> is not closed`);
      at += 1;
      const element = open.pop();
      if (element === undefined) fail(`it closes </${closing}>, which was never opened`);
      else if (element.name !== closing) fail(`</${closing}> closes <${element.name}>`);
    } else {
      at += 1;
      const tag = name();
      const attributes = new Map<string, string>();
      for (;;) {
        skipSpace();
        if (at >= text.length) fail(`the tag <${tag}> is not closed`);
        if (text.startsWith('/>', at) || text[at] === '>') break;
        const key = name();
        skipSpace();
        if (text[at] !== '=') fail(`the attribute ${key} on <${tag}> has no value`);
        at += 1;
        skipSpace();
        const quote = text[at];
        if (quote !== '"' && quote !== "'") fail(`the attribute ${key} on <${tag}> is not quoted`);
        at += 1;
        const end = past(quote, `the attribute ${key} on <${tag}>`);
        if (attributes.has(key)) fail(`<${tag}> has the attribute ${key} twice`);
        attributes.set(key, decode(text.slice(at, end)));
        at = end + 1;
      }
      const element: XmlElement = { name: tag, attributes, children: [], text: '' };
      const parent = open.at(-1);
      if (parent !== undefined) parent.children.push(element);
      else if (root !== undefined) fail('it has more than one root element');
      else root = element;
      if (text.startsWith('/>', at)) at += 2;
      else {
        at += 1;
        open.push(element);
        if (open.length > MAX_DEPTH) fail(`it nests elements more than ${MAX_DEPTH} deep`);
      }
    }
  }
  const unclosed = open.at(-1);
  if (unclosed !== undefined) fail(`the <${unclosed.name}> element is not closed`);
  if (root === undefined) fail('it has no elements');
  return root;
}
