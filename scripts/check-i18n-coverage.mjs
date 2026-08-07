// Self-check for the "silent fallback" i18n bug class (ponytail rule): a
// missing AR key doesn't throw or fail a build/tsc pass — t() just returns
// the English string unchanged, so English silently bleeds into RTL/Arabic
// UI. Neither `npm run build` nor `tsc --noEmit` can catch that; this
// script is the only thing that actually discriminates. Plain node, no
// deps. Run: `node scripts/check-i18n-coverage.mjs`.
//
// Regex-extracts every tr("...")/t("...", locale) literal from the given
// diner+admin surfaces, unions the keys defined across all app/lib/i18n/ar-*.ts
// dictionaries, and asserts every extracted literal has an AR key.
// Also asserts the two whole-sentence interpolation templates survive
// String.replace() with a USD ("$"-prefixed, since "$" is special in JS
// replace-string syntax) and a SAR amount without corruption.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const DICT_FILES = [
  "app/lib/i18n/ar-common.ts",
  "app/lib/i18n/ar-marketing.ts",
  "app/lib/i18n/ar-customer.ts",
  "app/lib/i18n/ar-admin.ts",
  "app/lib/i18n/ar-admin-dash.ts",
  "app/lib/i18n/ar-admin-ops.ts",
  "app/lib/i18n/ar-admin-tables.ts",
  "app/lib/i18n/ar-admin-super.ts",
];

const SCAN_FILES = [
  "app/components/CustomerView.tsx",
  "app/components/site/OrderModal.tsx",
  "app/components/site/MenuModal.tsx",
  "app/components/admin/Sidebar.tsx",
  "app/components/immersive/LandingView.tsx",
];

// Scope limits, so nobody trusts this further than it goes: extractCalls
// only matches `tr("literal")` / `t("literal", locale)` - a translated
// literal passed as a variable (`t(SOME_CONST, locale)`) or built from a
// template literal is invisible to it. Fine for this codebase (no such
// calls exist today); re-check this comment if that changes.

function extractKeys(src) {
  const keys = new Set();
  const quoted = /^\s*"((?:[^"\\]|\\.)*)"\s*:/gm;
  const bare = /^\s*([A-Za-z_$][A-Za-z0-9_$]*)\s*:/gm;
  for (const m of src.matchAll(quoted)) keys.add(m[1].replace(/\\"/g, '"'));
  for (const m of src.matchAll(bare)) keys.add(m[1]);
  return keys;
}

function extractCalls(src) {
  const calls = new Set();
  const trCall = /\btr\(\s*"((?:[^"\\]|\\.)*)"\s*\)/g;
  const tCall = /\bt\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*locale\s*\)/g;
  for (const m of src.matchAll(trCall)) calls.add(m[1].replace(/\\"/g, '"'));
  for (const m of src.matchAll(tCall)) calls.add(m[1].replace(/\\"/g, '"'));
  return calls;
}

const arKeys = new Set();
for (const f of DICT_FILES) {
  for (const k of extractKeys(readFileSync(join(ROOT, f), "utf8"))) arKeys.add(k);
}

let missing = [];
for (const f of SCAN_FILES) {
  const src = readFileSync(join(ROOT, f), "utf8");
  for (const call of extractCalls(src)) {
    if (!arKeys.has(call)) missing.push(`${f}: "${call}"`);
  }
}

if (missing.length) {
  console.error("Missing AR translations (silent English fallback):");
  for (const m of missing) console.error("  " + m);
  process.exit(1);
}
console.log(`OK: every tr()/t() literal in ${SCAN_FILES.length} scanned files has an AR key.`);

// --- interpolation sanity: "$" in fmt() USD output is NOT special via the
// function-replacer form of String.replace (only the string-replacer form
// treats "$1" etc. as special), and a SAR amount round-trips too.
// Mirrors app/lib/data.ts's fmt() (CURRENCY_SYMBOL + n.toFixed(2)) - a
// divergence here is a signal to reconcile the two, same convention as
// scripts/check-auth-hash.mjs.
function fmt(n, symbol) {
  return symbol + n.toFixed(2);
}
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL: " + msg);
    process.exit(1);
  }
}

const usd = "{qty} at {price} each"
  .replace("{qty}", "3")
  .replace("{price}", () => fmt(12.5, "$"));
assert(usd === "3 at $12.50 each", `USD interpolation corrupted: got "${usd}"`);

const sar = "{qty} at {price} each"
  .replace("{qty}", "2")
  .replace("{price}", () => fmt(45, "SAR "));
assert(sar === "2 at SAR 45.00 each", `SAR interpolation corrupted: got "${sar}"`);

console.log("OK: USD/SAR interpolation via function-replacer is not corrupted by \"$\".");

// --- "Place order, {count} item(s), {total}" templates: read the REAL AR
// values out of the dictionary (not a hand-typed mirror) and interpolate
// all 4 cases (EN/AR x singular/plural). The AR singular deliberately
// drops the {count} placeholder ("صنف واحد" = "one item", natural MSA
// phrasing rather than "1 صنف") - assert that's a clean no-op replace,
// not a stray unsubstituted "{count}" leaking into the rendered string.
const customerSrc = readFileSync(join(ROOT, "app/lib/i18n/ar-customer.ts"), "utf8");
function getArValue(src, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Keys are either quoted ("Some Key": ...) or bare identifiers (at: ...);
  // dictionaries use both styles depending on whether the key is a valid
  // JS identifier.
  const re = new RegExp(
    `(?:"${escaped}"|\\b${escaped}):\\s*"((?:[^"\\\\]|\\\\.)*)"`,
  );
  const m = src.match(re);
  if (!m) throw new Error(`key not found in ar-customer.ts: ${key}`);
  return m[1];
}
const placeOrderCases = [
  { locale: "en", count: 1, en: "Place order, {count} item, {total}" },
  { locale: "en", count: 3, en: "Place order, {count} items, {total}" },
  { locale: "ar", count: 1, en: "Place order, {count} item, {total}" },
  { locale: "ar", count: 3, en: "Place order, {count} items, {total}" },
];
for (const c of placeOrderCases) {
  const template = c.locale === "ar" ? getArValue(customerSrc, c.en) : c.en;
  const rendered = template
    .replace("{count}", String(c.count))
    .replace("{total}", () => fmt(45, c.locale === "ar" ? "SAR " : "$"));
  assert(
    !rendered.includes("{count}") && !rendered.includes("{total}"),
    `unsubstituted placeholder leaked (${c.locale}, count=${c.count}): "${rendered}"`,
  );
  console.log(`  ${c.locale} count=${c.count}: "${rendered}"`);
}
console.log("OK: all 4 Place-order template cases render with no stray placeholders.");

// --- RTL/bidi regression guard: the "{qty} at {price} each" template
// replaced fragment concatenation (`${qty} ${tr("at")} ${fmt(...)} ${tr("each")}`)
// with a single interpolated key. Assert the rendered AR bytes are
// IDENTICAL to what the old concatenation produced - proves the refactor
// didn't change how Latin/digit currency text sits inside the RTL run
// (that bidi characteristic is pre-existing app behavior, not introduced
// by this fix; a real bidi-isolation pass, if ever needed, is a separate,
// app-wide change since the same raw-fmt()-in-Arabic-text pattern already
// exists at every other bill-line-item call site).
const oldStyle = `3 ${getArValue(customerSrc, "at")} SAR 45.00 ${getArValue(customerSrc, "each")}`;
const newStyle = getArValue(customerSrc, "{qty} at {price} each")
  .replace("{qty}", "3")
  .replace("{price}", () => "SAR 45.00");
assert(
  oldStyle === newStyle,
  `RTL regression: old concatenation "${oldStyle}" !== new template "${newStyle}"`,
);
console.log(`OK: qty/price/each template is byte-identical to the old concatenation: "${newStyle}"`);
