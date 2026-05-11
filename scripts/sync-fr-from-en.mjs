/**
 * Deep-sync fr.json to match en.json structure.
 * - Same keys as EN (FR-only keys dropped)
 * - Preserves existing French strings where types match
 * - Arrays aligned to EN length; missing indices filled from EN
 */
import fs from "fs";

const root = new URL("..", import.meta.url);
const enPath = new URL("../messages/en.json", import.meta.url);
const frPath = new URL("../messages/fr.json", import.meta.url);

function syncNode(enNode, frNode, keyHint) {
  if (enNode === null || enNode === undefined) return enNode;
  if (typeof enNode !== "object") {
    if (keyHint === "href" && typeof enNode === "string") return enNode;
    return typeof frNode === "string" ? frNode : enNode;
  }
  if (Array.isArray(enNode)) {
    return enNode.map((enItem, i) => {
      const frItem = Array.isArray(frNode) ? frNode[i] : undefined;
      if (enItem !== null && typeof enItem === "object" && !Array.isArray(enItem)) {
        return syncNode(enItem, frItem && typeof frItem === "object" && !Array.isArray(frItem) ? frItem : {});
      }
      if (typeof enItem === "string") {
        return typeof frItem === "string" ? frItem : enItem;
      }
      return syncNode(enItem, frItem);
    });
  }
  const out = {};
  for (const key of Object.keys(enNode)) {
    out[key] = syncNode(
      enNode[key],
      frNode && typeof frNode === "object" && !Array.isArray(frNode) ? frNode[key] : undefined,
      key,
    );
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(enPath, "utf8"));
const fr = JSON.parse(fs.readFileSync(frPath, "utf8"));
const synced = syncNode(en, fr);

fs.writeFileSync(frPath, `${JSON.stringify(synced, null, 2)}\n`, "utf8");
console.log("Wrote messages/fr.json synced from en.json");
