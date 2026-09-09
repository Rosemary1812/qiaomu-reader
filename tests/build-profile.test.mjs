import assert from "node:assert/strict";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { buildProfile } from "../scripts/build-profile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

async function compiled(entry, profileName) {
  const profile = buildProfile(profileName, root);
  const result = await build({
    absWorkingDir: root, entryPoints: [entry], bundle: true, format: "cjs",
    write: false, metafile: true, plugins: profile.plugins,
  });
  const module = { exports: {} };
  vm.runInNewContext(result.outputFiles[0].text, { module, window: { process: { platform: "darwin", env: { PATH: "/usr/bin" } } } });
  return { api: module.exports, inputs: Object.keys(result.metafile.inputs), code: result.outputFiles[0].text };
}

test("build profiles isolate output and reject unknown distribution names", () => {
  assert.equal(buildProfile("standard", root).outputDir, root);
  assert.equal(buildProfile("community", root).outputDir, path.join(root, "dist/community"));
  assert.throws(() => buildProfile("commmunity", root), /Unknown build profile/);
});

test("community build excludes the installer module, even if an internal caller requests installation", async () => {
  const community = await compiled("src/ai-cli.js", "community");
  const standard = await compiled("src/ai-cli.js", "standard");
  assert.ok(community.inputs.includes("src/ai-acp-manual.js"));
  assert.ok(!community.inputs.includes("src/ai-acp-installer.js"));
  assert.ok(!standard.inputs.includes("src/ai-acp-installer.js"));
  assert.doesNotMatch(community.code, /ACP installed but its executable was not found/);
  assert.doesNotMatch(standard.code, /ACP installed but its executable was not found/);
  for (const id of standard.api.CLI_AI_PROVIDER_IDS) {
    const manual = community.api.cliAcpSupport(id);
    const normal = standard.api.cliAcpSupport(id);
    assert.equal(manual.autoInstall, false);
    for (const key of ["supported", "mode", "binary", "installCommand", "installUrl", "community"]) {
      assert.equal(manual[key], normal[key], `${id} retains ${key}`);
    }
  }
  assert.equal(standard.api.cliAcpSupport("claude-cli").autoInstall, false);
  assert.equal(standard.api.cliAcpSupport("zcode-cli").autoInstall, false);
  assert.equal(typeof community.api.resolveAcpPath, "function");
  assert.equal(typeof community.api.probeCliAcp, "function");
  assert.equal(typeof community.api.runCliAi, "function");
  await assert.rejects(community.api.installCliAcp("claude-cli", { installRoot: "/not-a-real-install" }), (error) => error.qiaomuReaderReason === "acpmissing");
  await assert.rejects(community.api.installCliAcp("zcode-cli", { installRoot: "/not-a-real-install" }), (error) => error.qiaomuReaderReason === "acpmissing");
});
