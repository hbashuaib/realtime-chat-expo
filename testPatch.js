// testPatch.js
const fs = require("fs");
const path = require("path");

const jsPath = path.join(__dirname, "src", "bridges", "InboundShareBridge.jsx");
let js = fs.readFileSync(jsPath, "utf8");

// --- Step 2: Normalize ANY onShare routing block (consume closing brace too) ---
js = js.replace(
  /if\s*\(typeof onShare === "function"\)[\s\S]*?setInboundShare\(payload\);\s*\}/g,
  '/*__ONSHARE_NORMALIZED__*/ if (typeof onShare === "function") { onShare(payload); } else { setInboundShare(payload); }',
);

// --- Step 3: Fix the string branch (remove stray brace before return) ---
js = js.replace(
  /(if\s*\(\s*typeof\s+raw\s*===\s*"string"\s*\)\s*\{[\s\S]*?)(if\s*\(typeof onShare === "function"\)[\s\S]*?setInboundShare\(payload\);\s*)\}\s*return\s*;/,
  '$1if (typeof onShare === "function") { onShare(payload); } else { setInboundShare(payload); }\nreturn;',
);

// --- Step 4: Force replace the nativeEvent branch with correct structure ---
js = js.replace(
  /if\s*\(raw\s*&&\s*typeof\s*raw\s*===\s*"object"\s*&&\s*typeof\s*raw\.nativeEvent\s*===\s*"string"\s*\)\s*\{[\s\S]*?return;\s*\}/,
  `if (raw && typeof raw === "object" && typeof raw.nativeEvent === "string") {
  const payload = { kind: "text", text: raw.nativeEvent.trim() };
  if (typeof onShare === "function") {
    onShare(payload);
  } else {
    setInboundShare(payload);
  }
  console.log("[Inbound Share] Payload(nativeEvent):", payload);
  lastKey = JSON.stringify(payload);
  return;
}`,
);

// --- Extract string branch for inspection ---
const stringBranch = js.match(
  /if\s*\(\s*typeof\s+raw\s*===\s*"string"[\s\S]*?return;/,
);

// --- Extract nativeEvent branch for inspection ---
const nativeEventBlock = js.match(
  /if\s*\(\s*raw[\s\S]*?nativeEvent[\s\S]*?\{[\s\S]*?return;\s*\}/,
);

console.log("=== string branch after patch ===\n");
console.log(stringBranch ? stringBranch[0] : "String branch not found");

console.log("\n=== nativeEvent block after patch ===\n");
console.log(
  nativeEventBlock ? nativeEventBlock[0] : "NativeEvent block not found",
);

// Optionally write out the full patched file
fs.writeFileSync(path.join(__dirname, "InboundShareBridge.patched.jsx"), js);
console.log("\nWrote InboundShareBridge.patched.jsx");
