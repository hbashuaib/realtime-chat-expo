const fs = require("fs");
let js = fs.readFileSync("src/bridges/InboundShareBridge.jsx", "utf8");

// 1. Remove commented duplicates
js = js.replace(
  /\/\/\s*if\s*\(typeof onShare === "function"\)[\s\S]*?setInboundShare\(payload\);/g,
  "",
);

// 2. Normalize the real block (do NOT consume the closing brace)
js = js.replace(
  /if\s*\(typeof onShare === "function"\)[\s\S]*?setInboundShare\(payload\);/g,
  'if (typeof onShare === "function") { onShare(payload); } else { setInboundShare(payload); }',
);

console.log(js);
