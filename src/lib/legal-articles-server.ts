import { promises as fs } from "fs";
import path from "path";
import { mergeCodeTravailArticles, type LegalArticle } from "@/lib/legal";

const ARTICLES_PATH = path.join(process.cwd(), "public/data/code-travail-articles.json");

let cache: LegalArticle[] | null = null;

export async function loadLegalArticlesServer(): Promise<LegalArticle[]> {
  if (cache) return cache;
  try {
    const raw = await fs.readFile(ARTICLES_PATH, "utf-8");
    const data = JSON.parse(raw) as LegalArticle[];
    cache = mergeCodeTravailArticles(data);
    return cache;
  } catch {
    cache = mergeCodeTravailArticles([]);
    return cache;
  }
}
