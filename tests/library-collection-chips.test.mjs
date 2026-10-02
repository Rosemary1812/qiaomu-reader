import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { normalizeCollections } from '../src/library-collections.js';
const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const start = source.indexOf('function buildLibChips(');
const end = source.indexOf('// Chip ids', start);
const build = vm.runInNewContext(`${source.slice(start, end)}; buildLibChips`, {
  libTallyBooks: () => ({ statuses: {}, folders: new Map([['09.Assets', 14], ['Attachments', 17]]), tags: new Map() }),
  LIB_STATUS_CHIPS: [], qiaomuReaderTranslate: x => x, normalizeCollections,
});
test('physical directories never become collection chips; empty user collections remain reachable', () => {
  const chips = build([{ path: 'Attachments/book.epub' }], '', () => null, () => [], 'all', [{ id: 'mine', name: 'My books', books: [] }]);
  assert.deepEqual(Array.from(chips, x => x.id), ['all', 'collection:mine']);
  assert.equal(chips[1].count, 0);
});
