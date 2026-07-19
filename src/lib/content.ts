import fs from "node:fs";
import path from "node:path";

export type PageInfo = {
  key: string;
  route: string;
  file: string;
  bodyClass: string;
  title: string;
};

const CONTENT_DIR = path.join(process.cwd(), "src", "content");

let cache: Record<string, PageInfo> | null = null;

export function getManifest(): Record<string, PageInfo> {
  if (!cache) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, "manifest.json"), "utf8");
    cache = JSON.parse(raw) as Record<string, PageInfo>;
  }
  return cache;
}

export function getPage(key: string): PageInfo | undefined {
  return getManifest()[key];
}

export function getContentHtml(file: string): string {
  return fs.readFileSync(path.join(CONTENT_DIR, file), "utf8");
}
