// Offline fonts are embedded in styles.css, which Obsidian installs
// alongside main.js on desktop and mobile. Missing glyphs use the CSS fallback.
export const BUNDLED_FONT_FAMILIES = Object.freeze({
  zhuque: "QBR Zhuque Fangsong",
  opendyslexic: "QBR OpenDyslexic",
});

export async function ensureBundledReaderFont(doc, fontId) {
  const family = BUNDLED_FONT_FAMILIES[fontId];
  if (!family || !doc?.fonts) return false;
  try {
    const faces = await doc.fonts.load(`16px "${family}"`);
    return faces.length > 0;
  } catch (error) {
    console.error("Qiaomu Reader: could not load the bundled font", error);
    return false;
  }
}
