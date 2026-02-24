/**
 * Runs after `npx changeset version` to keep the template's chanfana
 * dependency pinned to the just-bumped version.
 *
 * Usage (in publish.yml):
 *   version: npx changeset version && node scripts/sync-template-version.js
 */
const fs = require("fs");
const path = require("path");

const rootPkg = require("../package.json");
const templatePkgPath = path.join(__dirname, "..", "template", "package.json");
const templatePkg = JSON.parse(fs.readFileSync(templatePkgPath, "utf-8"));

const newRange = `^${rootPkg.version}`;
const oldRange = templatePkg.dependencies.chanfana;

if (oldRange === newRange) {
  console.log(`Template chanfana dep already at ${newRange}, nothing to do.`);
  process.exit(0);
}

templatePkg.dependencies.chanfana = newRange;
fs.writeFileSync(templatePkgPath, JSON.stringify(templatePkg, null, 2) + "\n");
console.log(`Updated template chanfana dep: ${oldRange} → ${newRange}`);
