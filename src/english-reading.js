const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
let words;
function wordLevels() {
  if (words) return words;
  // The community release ships only main.js and styles.css. Keep the offline
  // word list in the latter, so it does not exceed the JS release size budget.
  const encoded = getComputedStyle(document.documentElement).getPropertyValue("--qiaomu-cefr-data").trim().replace(/^['"]|['"]$/g, "");
  try { words = new Map(Object.entries(JSON.parse(atob(encoded)))); }
  catch { words = new Map(); }
  return words;
}

export function englishWordLevel(word) {
  const words = wordLevels();
  const key = String(word || "").toLowerCase();
  if (words.has(key)) return words.get(key);
  // Unknown proper names and unlisted inflections should not fill the page.
  for (const base of [key.replace(/ies$/, "y"), key.replace(/ing$/, ""), key.replace(/ed$/, ""), key.replace(/s$/, "")]) {
    if (base !== key && words.has(base)) return words.get(base);
  }
  return null;
}

export function shouldGloss(word, level) {
  const rank = englishWordLevel(word);
  return rank !== null && rank > LEVELS.indexOf(level) + 1;
}

export function englishSelectionKind(text, doubleClick = false) {
  const value = String(text || "").trim();
  if (!/^[\p{Script=Latin}\s\p{P}\p{N}]+$/u.test(value)) return null;
  if (doubleClick && /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(value)) return "word";
  return value.split(/\s+/).length >= 3 && value.length <= 1600 ? "passage" : null;
}

// Draw annotations in a shadow root, without changing the EPUB text nodes.
// Foliate uses those nodes to calculate CFIs for highlights and saved places.
export function createEnglishGlossLayer(doc) {
  const host = doc.createElement("div");
  host.className = "qiaomu-english-gloss-host";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = doc.createElement("style");
  style.textContent = `.gloss{position:fixed;z-index:10;pointer-events:none;transform:translate(-50%,-100%);white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;font:10px/1.15 system-ui,sans-serif;color:#806747;background:color-mix(in srgb,white 88%,transparent);border-radius:3px;padding:1px 3px}`;
  shadow.append(style);
  doc.body.append(host);
  return {
    draw(entries) {
      shadow.querySelectorAll(".gloss").forEach(node => node.remove());
      for (const { range, gloss } of entries) {
        if (!gloss) continue;
        const rect = range.getBoundingClientRect();
        if (!rect.width || rect.bottom < 0 || rect.top > doc.defaultView.innerHeight) continue;
        const label = doc.createElement("span");
        label.className = "gloss";
        label.textContent = gloss;
        label.style.left = `${rect.left + rect.width / 2}px`;
        label.style.top = `${rect.top - 1}px`;
        shadow.append(label);
      }
    },
    remove() { host.remove(); },
  };
}

export function visibleEnglishWords(doc, level, limit = 28) {
  const found = [], seen = new Set();
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,code,pre,a,button,svg,ruby,.qiaomu-english-gloss-host")) return NodeFilter.FILTER_REJECT;
      return /[A-Za-z]{3}/.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let node;
  while ((node = walker.nextNode()) && found.length < limit) {
    const pattern = /\b[A-Za-z]{3,}(?:['’-][A-Za-z]+)?\b/g;
    let match;
    while ((match = pattern.exec(node.textContent)) && found.length < limit) {
      const word = match[0], key = word.toLowerCase();
      if (/^[A-Z]/.test(word) || seen.has(key) || !shouldGloss(word, level)) continue;
      const range = doc.createRange();
      range.setStart(node, match.index); range.setEnd(node, match.index + word.length);
      const rect = range.getBoundingClientRect();
      if (!rect.width || rect.bottom < 0 || rect.top > doc.defaultView.innerHeight) continue;
      seen.add(key);
      const sentence = node.textContent.slice(Math.max(0, match.index - 90), match.index + word.length + 90).trim();
      found.push({ word, range, sentence });
    }
  }
  return found;
}
