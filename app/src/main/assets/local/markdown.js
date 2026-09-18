// A deliberately small, DOM-only Markdown renderer. User/model text never enters innerHTML.
const SAFE_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

function appendInline(target, value) {
  const text = String(value || "");
  const token = /(`[^`]*`|\[[^\]]+\]\([^\s)]+\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let cursor = 0;
  for (const match of text.matchAll(token)) {
    if (match.index > cursor) target.append(document.createTextNode(text.slice(cursor, match.index)));
    const item = match[0];
    if (item.startsWith("`")) {
      const code = document.createElement("code"); code.textContent = item.slice(1, -1); target.append(code);
    } else if (item.startsWith("[")) {
      const close = item.indexOf("](");
      const label = item.slice(1, close), href = item.slice(close + 2, -1);
      let url = null;
      try { url = new URL(href, location.href); } catch {}
      if (url && SAFE_PROTOCOLS.has(url.protocol)) {
        const link = document.createElement("a"); link.href = url.href; link.target = "_blank"; link.rel = "noopener noreferrer"; link.textContent = label; target.append(link);
      } else target.append(document.createTextNode(label));
    } else {
      const strong = item.startsWith("**");
      const node = document.createElement(strong ? "strong" : "em");
      node.textContent = item.slice(strong ? 2 : 1, strong ? -2 : -1); target.append(node);
    }
    cursor = match.index + item.length;
  }
  if (cursor < text.length) target.append(document.createTextNode(text.slice(cursor)));
}

export function renderMarkdown(target, source) {
  target.replaceChildren();
  const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (/^```/.test(line)) {
      const language = line.slice(3).trim(); const codeLines = []; index += 1;
      while (index < lines.length && !/^```/.test(lines[index])) codeLines.push(lines[index++]);
      const pre = document.createElement("pre"), code = document.createElement("code");
      if (language) code.dataset.language = language.slice(0, 24);
      code.textContent = codeLines.join("\n"); pre.append(code); target.append(pre); index += 1; continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) { const node = document.createElement(`h${heading[1].length + 2}`); appendInline(node, heading[2]); target.append(node); index += 1; continue; }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { const node = document.createElement("blockquote"); appendInline(node, quote[1]); target.append(node); index += 1; continue; }
    const list = line.match(/^[-*]\s+(.+)$/);
    if (list) {
      const ul = document.createElement("ul");
      while (index < lines.length) { const item = lines[index].match(/^[-*]\s+(.+)$/); if (!item) break; const li = document.createElement("li"); appendInline(li, item[1]); ul.append(li); index += 1; }
      target.append(ul); continue;
    }
    const numbered = line.match(/^\d+[.)]\s+(.+)$/);
    if (numbered) {
      const ol = document.createElement("ol");
      while (index < lines.length) { const item = lines[index].match(/^\d+[.)]\s+(.+)$/); if (!item) break; const li = document.createElement("li"); appendInline(li, item[1]); ol.append(li); index += 1; }
      target.append(ol); continue;
    }
    const paragraph = document.createElement("p"); appendInline(paragraph, line || " "); target.append(paragraph); index += 1;
  }
}
