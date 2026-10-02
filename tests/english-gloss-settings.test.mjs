import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
test('gloss settings persist and rebuild removed overlays when enabled again', async () => {
  const rows = [];
  class Setting {
    constructor() { rows.push(this); }
    setName(name) { this.name = name; return this; }
    setDesc() { return this; }
    addToggle(fn) { fn({ setValue: () => ({ onChange: cb => { this.change = cb; } }) }); return this; }
    addDropdown(fn) { const d = { addOption() {}, setValue: () => d, onChange: cb => { this.change = cb; } }; fn(d); return this; }
  }
  const doc = {};
  let removed = 0, saved = 0, refreshed = 0;
  const view = { file: { extension: 'epub' }, engine: { contents: () => [{ doc }] }, _englishGlossLayers: new WeakMap([[doc, { remove: () => removed++ }]]) };
  const plugin = { settings: { englishGlossEnabled: true }, saveAll: async () => saved++, app: { workspace: { getLeavesOfType: () => [{ view }] } } };
  const code = source.slice(source.indexOf('function buildEnglishGlossSettings('), source.indexOf('const SettingsTab = class'));
  const build = vm.runInNewContext(`${code}; buildEnglishGlossSettings`, { Setting, VIEW_TYPE: 'reader', englishReadingLabel: x => x, refreshEnglishGlosses: async () => refreshed++ });
  build({}, plugin);
  await rows[0].change(false);
  assert.equal(view._englishGlossLayers.has(doc), false);
  assert.equal(removed, 1);
  await rows[0].change(true);
  await rows[1].change('B2');
  assert.equal(saved, 3);
  assert.equal(refreshed, 2);
  assert.equal(plugin.settings.englishCefrLevel, 'B2');
});
