import fs from "fs";
import path from "path";
import { CONFIG } from "./config.js";

/**
 * Recursively scan directory for .feature files
 */
function walk(dir, filelist = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filepath = path.join(dir, file);
    const stat = fs.statSync(filepath);

    if (stat.isDirectory()) {
      walk(filepath, filelist);
    } else if (file.endsWith(".feature")) {
      filelist.push(filepath);
    }
  });

  return filelist;
}

/**
 * Return all feature files in Oro project
 */
export function listFeatures() {
  if (!fs.existsSync(CONFIG.ORO_PATH)) {
    return { error: "ORO_PATH not found" };
  }

  const features = walk(CONFIG.ORO_PATH);

  return {
    count: features.length,
    features,
  };
}
