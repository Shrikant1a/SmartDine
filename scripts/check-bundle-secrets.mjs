import fs from "node:fs";
import path from "node:path";

const STATIC_DIR = path.resolve(process.cwd(), ".next/static");
const FORBIDDEN_SECRET_PATTERNS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "WHATSAPP_TOKEN",
  "OWNER_BOOTSTRAP_SECRET",
  "QR_TOKEN_SECRET",
  "TABLE_SESSION_SECRET",
  "CRON_SECRET",
];

if (!fs.existsSync(STATIC_DIR)) {
  console.error("Error: .next/static does not exist. Run `npm run build` first.");
  process.exit(1);
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(full));
    } else if (entry.isFile() && /\.(js|mjs|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

const files = walkFiles(STATIC_DIR);
const hits = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  for (const secret of FORBIDDEN_SECRET_PATTERNS) {
    if (content.includes(secret)) {
      hits.push({ file: path.relative(process.cwd(), file), secret });
    }
  }
}

if (hits.length > 0) {
  console.error("SECRET LEAK DETECTED in client bundle:");
  for (const hit of hits) {
    console.error(`  - ${hit.secret} found in ${hit.file}`);
  }
  process.exit(1);
}

console.log(
  `Secret check PASS: scanned ${files.length} static assets, 0 private env names found.`,
);
