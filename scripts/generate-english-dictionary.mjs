import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DOMParser } from "@xmldom/xmldom";
import { Converter } from "opencc-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const archive = process.argv[2];
if (!archive) {
  throw new Error("Usage: node scripts/generate-english-dictionary.mjs <freedict-eng-zho-2025.11.23.src.tar.xz>");
}
const expectedSha512 = "25aed0f1d7de68919aa9da1ba92d67f566ae4ea81660f42071c81fc21e56d4b210d61df379315678648c45ca7e52c4a0ba2eec009fbaab7c72e7472489e1fc4c";
const actualSha512 = crypto.createHash("sha512").update(fs.readFileSync(archive)).digest("hex");
if (actualSha512 !== expectedSha512) throw new Error("FreeDict source archive SHA-512 mismatch");

const xml = execFileSync("tar", ["-xOf", archive, "eng-zho/eng-zho.tei"], { maxBuffer: 64 * 1024 * 1024 }).toString("utf8");
const doc = new DOMParser({ onError: (level, message) => { if (level !== "warning") throw new Error(message); } }).parseFromString(xml, "text/xml");
const ns = "http://www.tei-c.org/ns/1.0";
const simplify = Converter({ from: "tw", to: "cn" });
const entries = new Map();

for (const entry of Array.from(doc.getElementsByTagNameNS(ns, "entry"))) {
  const form = entry.getElementsByTagNameNS(ns, "form")[0];
  const orth = form?.getElementsByTagNameNS(ns, "orth")[0]?.textContent?.trim().toLowerCase();
  if (!orth || !/^[a-z]+(?:['-][a-z]+)*$/.test(orth)) continue;
  const pos = entry.getElementsByTagNameNS(ns, "pos")[0]?.textContent?.trim() || "";
  const senses = entries.get(orth) || [];
  for (const citation of Array.from(entry.getElementsByTagNameNS(ns, "cit"))) {
    if (citation.getAttribute("type") !== "trans") continue;
    const definitions = Array.from(citation.parentNode.getElementsByTagNameNS(ns, "def"));
    if (definitions.length && definitions.every(definition => definition.textContent.trim() === ".")) continue;
    for (const quote of Array.from(citation.getElementsByTagNameNS(ns, "quote"))) {
      const meaning = simplify(quote.textContent || "").replace(/\s+/g, " ").trim();
      if (!/[\p{Script=Han}]/u.test(meaning) || [...meaning].length > 18) continue;
      if (!senses.some(([, existing]) => existing === meaning)) senses.push([pos, meaning]);
      if (senses.length >= 3) break;
    }
    if (senses.length >= 3) break;
  }
  if (senses.length) entries.set(orth, senses.slice(0, 3));
}

const dictionary = Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b, "en")));
const output = path.join(root, "src", "english-dictionary.json");
fs.writeFileSync(output, JSON.stringify(dictionary) + "\n");
console.log(`${Object.keys(dictionary).length} headwords, ${fs.statSync(output).size} bytes: ${output}`);
