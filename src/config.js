import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(PROJECT_ROOT, ".env") });
dotenv.config({ path: path.join(PROJECT_ROOT, "..", ".env"), override: false });

export const CONFIG = {
  ORO_PATH: path.resolve(
    PROJECT_ROOT,
    process.env.ORO_PATH || "../application/commerce-crm-ee"
  ),
  BEHAT_BIN: process.env.BEHAT_BIN || "bin/behat",
  FORMAT: process.env.BEHAT_FORMAT || "json",
  OUTPUT_FILE: process.env.BEHAT_OUTPUT_FILE || "behat.json",
  TIMEOUT: Number(process.env.BEHAT_TIMEOUT || 600000)
};
