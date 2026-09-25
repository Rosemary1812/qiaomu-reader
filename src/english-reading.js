const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
let words;
let dictionaryPromise;

export function loadEnglishDictionary() {
  if (dictionaryPromise) return dictionaryPromise;
  dictionaryPromise = (async () => {
    const encoded = getComputedStyle(document.documentElement).getPropertyValue("--qiaomu-dictionary-data").trim().replace(/^['"]|['"]$/g, "");
    if (!encoded || typeof DecompressionStream !== "function") throw new Error("Offline dictionary unavailable");
    const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Map(Object.entries(JSON.parse(await new Response(stream).text())));
  })().catch(error => { dictionaryPromise = null; throw error; });
  return dictionaryPromise;
}

const IRREGULAR_LEMMAS = { went: "go", gone: "go", children: "child", men: "man", women: "woman", mice: "mouse", feet: "foot", teeth: "tooth", was: "be", were: "be", been: "be", is: "be", are: "be", has: "have", had: "have", did: "do", does: "do", done: "do", made: "make", said: "say", saw: "see", seen: "see", took: "take", taken: "take", got: "get", bought: "buy", brought: "bring", thought: "think", found: "find" };
function lemmaCandidates(word) {
  const key = String(word || "").toLowerCase().replace(/[’]/g, "'");
  const candidates = [key, IRREGULAR_LEMMAS[key]];
  if (key.endsWith("ying")) candidates.push(`${key.slice(0, -4)}y`);
  if (key.endsWith("ing")) {
    const stem = key.slice(0, -3);
    candidates.push(stem, `${stem}e`);
    if (stem.at(-1) === stem.at(-2)) candidates.push(stem.slice(0, -1));
  }
  if (key.endsWith("ied") || key.endsWith("ies")) candidates.push(`${key.slice(0, -3)}y`);
  if (key.endsWith("ed")) {
    const stem = key.slice(0, -2);
    candidates.push(stem, `${stem}e`);
    if (stem.at(-1) === stem.at(-2)) candidates.push(stem.slice(0, -1));
  }
  if (key.endsWith("es")) candidates.push(key.slice(0, -2));
  if (key.endsWith("s")) candidates.push(key.slice(0, -1));
  return [...new Set(candidates.filter(Boolean))];
}

export function lookupEnglishWord(dictionary, word) {
  for (const lemma of lemmaCandidates(word)) {
    const senses = dictionary.get(lemma);
    if (senses?.length) return { lemma, senses, gloss: senses[0][1] };
  }
  return null;
}
function wordLevels() {
  if (words) return words;
  // The community release ships only main.js and styles.css. Keep the offline
  // word list in the latter, so it does not exceed the JS release size budget.
  const encoded = getComputedStyle(document.documentElement).getPropertyValue("--qiaomu-cefr-data").trim().replace(/^['"]|['"]$/g, "");
  if (!encoded) throw new Error("Offline CEFR data unavailable");
  try { words = new Map(Object.entries(JSON.parse(atob(encoded)))); }
  catch { throw new Error("Offline CEFR data unavailable"); }
  if (!words.size) throw new Error("Offline CEFR data unavailable");
  return words;
}

export function englishWordLevel(word) {
  const words = wordLevels();
  for (const base of lemmaCandidates(word)) if (words.has(base)) return words.get(base);
  return null;
}

export function shouldGloss(word, level) {
  const rank = englishWordLevel(word);
  return rank !== null && rank > LEVELS.indexOf(level) + 1;
}

export function englishSelectionKind(text) {
  const value = String(text || "").trim();
  if (!/^[\p{Script=Latin}\s\p{P}\p{N}]+$/u.test(value)) return null;
  if (/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(value)) return "word";
  return value.split(/\s+/).length >= 3 && value.length <= 1600 ? "passage" : null;
}

export function englishGlossViewport(doc, readingArea) {
  const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
  const area = readingArea?.getBoundingClientRect();
  if (frame && area) return {
    left: area.left - frame.left, right: area.right - frame.left,
    top: area.top - frame.top, bottom: area.bottom - frame.top,
  };
  return { left: 0, right: doc.defaultView.innerWidth, top: 0, bottom: doc.defaultView.innerHeight };
}

// Draw annotations in a shadow root, without changing the EPUB text nodes.
// Foliate uses those nodes to calculate CFIs for highlights and saved places.
export function createEnglishGlossLayer(doc, overlayer) {
  if (overlayer?.element) {
    const svg = overlayer.element;
    const style = doc.createElementNS("http://www.w3.org/2000/svg", "style");
    style.textContent = `.qiaomu-english-gloss-svg{font:11px system-ui;fill:#806747;stroke:#fff;stroke-width:3;paint-order:stroke fill;text-anchor:middle}`;
    const group = doc.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "qiaomu-english-gloss-svg");
    svg.append(style, group);
    return {
      draw(entries, viewport = englishGlossViewport(doc)) {
        group.replaceChildren();
        for (const { range, gloss } of entries) {
          if (!gloss) continue;
          const rect = range.getBoundingClientRect();
          if (!isVisibleRect(rect, viewport)) continue;
          const label = doc.createElementNS("http://www.w3.org/2000/svg", "text");
          label.textContent = gloss;
          label.setAttribute("x", String(rect.left + rect.width / 2));
          label.setAttribute("y", String(rect.top - 3));
          group.append(label);
        }
      },
      remove() { style.remove(); group.remove(); },
    };
  }
  const host = doc.createElement("div");
  host.className = "qiaomu-english-gloss-host";
  const shadow = host.attachShadow({ mode: "closed" });
  const style = doc.createElement("style");
  style.textContent = `.gloss{position:fixed;pointer-events:none;transform:translate(-50%,-100%);white-space:nowrap;font:11px system-ui;color:#806747;background:white}`;
  shadow.append(style);
  doc.body.append(host);
  return {
    draw(entries, viewport = englishGlossViewport(doc)) {
      shadow.querySelectorAll(".gloss").forEach(node => node.remove());
      for (const { range, gloss } of entries) {
        if (!gloss) continue;
        const rect = range.getBoundingClientRect();
        if (!isVisibleRect(rect, viewport)) continue;
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

function isVisibleRect(rect, viewport) {
  const right = rect.right ?? rect.left + rect.width;
  return rect.width > 0 && right > viewport.left && rect.left < viewport.right
    && rect.bottom > viewport.top && rect.top < viewport.bottom;
}

export function visibleEnglishWords(doc, level, limit = 28, viewport = englishGlossViewport(doc), dictionary = null) {
  const found = [], seen = new Set();
  const parentRects = new WeakMap();
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,code,pre,a,button,svg,ruby,.qiaomu-english-gloss-host")) return NodeFilter.FILTER_REJECT;
      let rect = parentRects.get(parent);
      if (!rect) {
        rect = parent.getBoundingClientRect();
        parentRects.set(parent, rect);
      }
      // A long EPUB chapter can contain thousands of words before the visible
      // paragraph. Avoid creating a Range and looking up each offscreen word.
      // Zero-size boxes (including jsdom and unusual EPUB markup) use the
      // precise word check below instead.
      if (rect.width > 0 && rect.height > 0 && !isVisibleRect(rect, viewport)) return NodeFilter.FILTER_REJECT;
      return /[A-Za-z]{3}/.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  let node;
  while ((node = walker.nextNode()) && found.length < limit) {
    const pattern = /\b[A-Za-z]{3,}(?:['’-][A-Za-z]+)?\b/g;
    let match;
    while ((match = pattern.exec(node.textContent)) && found.length < limit) {
      const word = match[0], key = word.toLowerCase();
      if (/^[A-Z]/.test(word) || seen.has(key) || !shouldGloss(word, level) || (dictionary && !lookupEnglishWord(dictionary, word))) continue;
      const range = doc.createRange();
      range.setStart(node, match.index); range.setEnd(node, match.index + word.length);
      const rect = range.getBoundingClientRect();
      if (!isVisibleRect(rect, viewport)) continue;
      seen.add(key);
      found.push({ word, range });
    }
  }
  return found;
}
