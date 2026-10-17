// Zero-dependency well-formedness check for generated SVG (shared by the test scripts):
// bare ampersands, unbalanced tags and unquoted attributes are reported.

/** Returns a description of the first XML well-formedness problem in `xml`, or null. */
export function wellFormedError(xml) {
  const body = xml.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '').replace(/<!--[\s\S]*?-->/g, '');
  const amp = body.match(/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/);
  if (amp) return `bare "&" near: ${body.slice(Math.max(0, amp.index - 40), amp.index + 20)}`;
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|<[^>]*>/g;
  let m;
  while ((m = tagRe.exec(body))) {
    if (!m[2]) return `malformed tag: ${m[0].slice(0, 80)}`;
    if (m[1]) {
      const open = stack.pop();
      if (open !== m[2]) return `</${m[2]}> closes <${open}>`;
    } else if (!m[4]) stack.push(m[2]);
  }
  if (stack.length) return `unclosed <${stack[stack.length - 1]}>`;
  return null;
}
