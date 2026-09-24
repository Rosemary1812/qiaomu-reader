// Offline fonts are embedded in styles.css, which Obsidian installs
// alongside main.js on desktop and mobile. Missing glyphs use the CSS fallback.
export const BUNDLED_FONT_FAMILIES = Object.freeze({
  zhuque: "QBR Zhuque Fangsong",
  opendyslexic: "QBR OpenDyslexic",
});

function copyFontFaceIntoFrame(doc, fontId, family) {
  const hostDoc = doc.defaultView?.frameElement?.ownerDocument;
  if (!hostDoc || doc.querySelector?.(`style[data-qbr-bundled-font="${fontId}"]`)) return;
  for (const sheet of hostDoc.styleSheets ?? []) {
    let rules;
    try { rules = sheet.cssRules; } catch { continue; }
    for (const rule of rules ?? []) {
      const declared = rule.style?.getPropertyValue?.("font-family")?.trim().replace(/^['"]|['"]$/g, "");
      if (rule.type !== 5 || declared !== family) continue;
      const style = doc.createElement("style");
      style.setAttribute("data-qbr-bundled-font", fontId);
      style.textContent = rule.cssText;
      (doc.head || doc.documentElement).append(style);
      return;
    }
  }
}

export async function ensureBundledReaderFont(doc, fontId) {
  const family = BUNDLED_FONT_FAMILIES[fontId];
  if (!family || !doc?.fonts) return false;
  try {
    // EPUB chapters render in separate iframe documents, which do not inherit
    // the font-face declarations installed by Obsidian in the host document.
    copyFontFaceIntoFrame(doc, fontId, family);
    const faces = await doc.fonts.load(`16px "${family}"`);
    return faces.length > 0;
  } catch (error) {
    console.error("Qiaomu Reader: could not load the bundled font", error);
    return false;
  }
}
