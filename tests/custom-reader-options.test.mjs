import test from 'node:test';
import assert from 'node:assert/strict';
import { highlightPaint, normalizeHighlightColor, HIGHLIGHT_PAINTS } from '../src/highlight-colors.js';
import { bookFontSettings, resolveReaderFont, splitReaderFontCss } from '../src/reader-appearance.js';
test('custom colors use the same alpha as the palette and reject CSS injection', () => {
  assert.equal(highlightPaint('#12AbEF'), 'rgba(18,171,239,.42)');
  assert.equal(highlightPaint('green'), HIGHLIGHT_PAINTS.green);
  assert.equal(normalizeHighlightColor('#fff;display:none'), null);
});
test('book fonts override fonts without changing global settings', () => {
  const s={fontFamily:'song',englishFontFamily:'georgia',bookFonts:{'a.epub':{fontFamily:'hei',englishFontFamily:'arial'}}};
  assert.equal(bookFontSettings(s,'a.epub').fontFamily,'hei');
  assert.equal(s.fontFamily,'song');
  assert.equal(bookFontSettings(s,'b.epub'),s);
});
test('Latin faces exclude CJK and preserve old typography when no split is configured', () => {
  const fonts={georgia:'Georgia, serif',song:'Songti SC, serif'};
  assert.equal(resolveReaderFont({fontFamily:'song'},fonts), fonts.song);
  const s={fontFamily:'song',englishFontFamily:'georgia'};
  assert.equal(resolveReaderFont(s,fonts),'"QBR Latin", Songti SC, serif');
  assert.match(splitReaderFontCss(s,fonts),/unicode-range:U\+0000-024F/);
  assert.match(splitReaderFontCss(s,fonts),/local\("Georgia"\)/);
  assert.doesNotMatch(splitReaderFontCss(s,fonts),/4E00/);
});
