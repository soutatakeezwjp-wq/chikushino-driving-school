const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = JSON.parse(
  fs.readFileSync(path.join(root, "data/calendar-review-2026-08.json"), "utf8")
);
const databaseName = "chikushino-school-content-preview";
const wrangler = "/opt/homebrew/bin/wrangler";

function sqlText(value) {
  return `'${String(value || "").replaceAll("'", "''")}'`;
}

const inserts = source.events.map((event) => (
  `INSERT INTO cms_events (event_date, title, details, category) VALUES (${[
    event.eventDate,
    event.title,
    event.details,
    event.category
  ].map(sqlText).join(", ")});`
));

const sql = [
  "DELETE FROM cms_events WHERE event_date BETWEEN '2026-08-01' AND '2026-08-31';",
  ...inserts
].join("\n");

execFileSync(wrangler, [
  "d1",
  "execute",
  databaseName,
  "--remote",
  "--command",
  sql
], {
  cwd: root,
  stdio: "inherit"
});

console.log(`Seeded ${source.events.length} preview calendar events.`);
