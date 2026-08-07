#!/usr/bin/env node
// Regression check for the WebKit "blank bill" bug (app/demo/immersive.tsx).
//
// Every `.qp-reveal-*` element starts at opacity 0 and only the CSS transition
// brings it back. WebKit pins a transition that starts while the document's
// animation timeline is suspended (background tab, occluded window, Low Power
// Mode) at its from-value forever, which left the whole /demo/customer bill
// invisible. useReveal() now lands the end state itself when the transition
// hasn't run in time; this asserts that it does.
//
// A safaridriver session reports document.hidden === true, so it reproduces the
// suspended-timeline condition for free — which is exactly why this check is a
// real regression test and not just a smoke test.
//
// Usage:  npm run build && PORT=3987 npm run start &
//         node scripts/check-safari-reveal.mjs [url]
// Exits 0 when every reveal target is visible, 1 otherwise.

import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const URL_UNDER_TEST = process.argv[2] ?? "http://localhost:3987/demo/customer";
const DRIVER_PORT = 4736;
const DRIVER = `http://localhost:${DRIVER_PORT}`;

const send = async (method, path, body) => {
  const res = await fetch(DRIVER + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await res.json();
  if (json.value?.error) throw new Error(`${path}: ${json.value.error} ${json.value.message}`);
  return json.value;
};

// The bug signature: an element the observer already revealed (`.qp-in`) that
// is still not visible. Reveal targets below the fold have no `.qp-in` and are
// meant to stay at opacity 0, so they are not failures.
const PROBE = `
  var revealed = [], stuck = [];
  var els = document.querySelectorAll("[class*='qp-reveal']");
  for (var i = 0; i < els.length; i++) {
    if (els[i].className.indexOf("qp-in") < 0) continue;
    revealed.push(els[i]);
    var op = getComputedStyle(els[i]).opacity;
    if (op !== "1") stuck.push(els[i].className.trim() + " -> opacity " + op);
  }
  return JSON.stringify({
    total: els.length, revealed: revealed.length,
    hidden: document.hidden, stuck: stuck,
  });
`;

const driver = spawn("safaridriver", ["-p", String(DRIVER_PORT)], { stdio: "ignore" });
let session;
let failed = false;

try {
  await sleep(2000);
  session = (await send("POST", "/session", { capabilities: {} })).sessionId;
  await send("POST", `/session/${session}/url`, { url: URL_UNDER_TEST });
  // Reveal watchdog is 1200ms; give it room even under a throttled timer.
  await sleep(6000);

  const raw = await send("POST", `/session/${session}/execute/sync`, { script: PROBE, args: [] });
  const { total, revealed, hidden, stuck } = JSON.parse(raw);

  if (total === 0) throw new Error(`no .qp-reveal-* elements found at ${URL_UNDER_TEST}`);
  if (revealed === 0) throw new Error(`no reveal target became .qp-in at ${URL_UNDER_TEST}`);

  console.log(
    `${URL_UNDER_TEST}  reveal targets: ${total} (${revealed} revealed)  document.hidden: ${hidden}`,
  );
  if (stuck.length) {
    failed = true;
    console.error(`FAIL: ${stuck.length}/${revealed} revealed target(s) stuck invisible:`);
    for (const s of stuck) console.error(`  ${s}`);
  } else {
    console.log(`PASS: all ${revealed} revealed targets reached opacity 1`);
  }
} catch (err) {
  failed = true;
  console.error(`FAIL: ${err.message}`);
} finally {
  if (session) await send("DELETE", `/session/${session}`).catch(() => {});
  driver.kill();
}

process.exit(failed ? 1 : 0);
