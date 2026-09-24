import { BUNDLED_FONT_FAMILIES } from "./bundled-fonts.js";

/** Registry entry injected into READER_FONTS (also listed here for source tests). */
export const OPENDYSLEXIC_READER_FONT = Object.freeze({
  id: "opendyslexic",
  stack: `'${BUNDLED_FONT_FAMILIES.opendyslexic}','OpenDyslexic',Georgia,serif`,
  labels: { ru: "OpenDyslexic", en: "OpenDyslexic", zh: "OpenDyslexic" },
});
