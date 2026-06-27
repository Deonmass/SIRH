import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  buildAnalysisSummary,
  matchArticlesForCase,
  type ArticleMatch,
} from "@/lib/legal-case-match";
import type { LegalArticle } from "@/lib/legal";

export type LegalCaseStatus = "open" | "in_progress" | "resolved";

export interface LegalCase {
  id: string;
  title: string;
  description: string;
  status: LegalCaseStatus;
  matchedArticleIds: string[];
  analysisSummary: string;
  createdAt: string;
  updatedAt: string;
}

const CASES_PATH = path.join(process.cwd(), "data", "legal-cases.json");

function normalizeCase(raw: Record<string, unknown>): LegalCase {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ""),
    description: String(raw.description ?? ""),
    status: (raw.status as LegalCaseStatus) ?? "open",
    matchedArticleIds: Array.isArray(raw.matchedArticleIds)
      ? (raw.matchedArticleIds as string[])
      : [],
    analysisSummary: String(raw.analysisSummary ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedAt ?? new Date().toISOString()),
  };
}

async function readCases(): Promise<LegalCase[]> {
  try {
    await fs.mkdir(path.dirname(CASES_PATH), { recursive: true });
    const raw = await fs.readFile(CASES_PATH, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>[];
    return Array.isArray(data) ? data.map(normalizeCase) : [];
  } catch {
    return [];
  }
}

async function writeCases(cases: LegalCase[]): Promise<void> {
  await fs.mkdir(path.dirname(CASES_PATH), { recursive: true });
  await fs.writeFile(CASES_PATH, JSON.stringify(cases, null, 2), "utf-8");
}

export async function listLegalCases(): Promise<LegalCase[]> {
  const cases = await readCases();
  return cases.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getLegalCase(id: string): Promise<LegalCase | null> {
  const cases = await readCases();
  return cases.find((c) => c.id === id) ?? null;
}

export function analyzeCaseDescription(
  description: string,
  articles: LegalArticle[]
): { matches: ArticleMatch[]; summary: string; articleIds: string[] } {
  const matches = matchArticlesForCase(description, articles);
  const articleIds = matches.map((m) => m.article.id);
  const summary = buildAnalysisSummary(description, matches);
  return { matches, summary, articleIds };
}

export async function createLegalCase(input: {
  title: string;
  description: string;
  articles: LegalArticle[];
  status?: LegalCaseStatus;
}): Promise<LegalCase> {
  const now = new Date().toISOString();
  const { articleIds, summary } = analyzeCaseDescription(input.description, input.articles);
  const legalCase: LegalCase = {
    id: uuidv4(),
    title: input.title.trim() || "Nouveau cas",
    description: input.description.trim(),
    status: input.status ?? "open",
    matchedArticleIds: articleIds,
    analysisSummary: summary,
    createdAt: now,
    updatedAt: now,
  };
  const cases = await readCases();
  cases.push(legalCase);
  await writeCases(cases);
  return legalCase;
}

export async function updateLegalCase(
  id: string,
  patch: Partial<
    Pick<LegalCase, "title" | "description" | "status" | "matchedArticleIds" | "analysisSummary">
  > & { articles?: LegalArticle[]; reanalyze?: boolean }
): Promise<LegalCase | null> {
  const cases = await readCases();
  const index = cases.findIndex((c) => c.id === id);
  if (index < 0) return null;

  const current = cases[index];
  const next: LegalCase = {
    ...current,
    ...patch,
    title: patch.title !== undefined ? patch.title.trim() || current.title : current.title,
    description:
      patch.description !== undefined ? patch.description.trim() : current.description,
    updatedAt: new Date().toISOString(),
  };

  if (patch.reanalyze && patch.articles?.length) {
    const { articleIds, summary } = analyzeCaseDescription(next.description, patch.articles);
    next.matchedArticleIds = articleIds;
    next.analysisSummary = summary;
  }

  cases[index] = next;
  await writeCases(cases);
  return next;
}

export async function deleteLegalCase(id: string): Promise<boolean> {
  const cases = await readCases();
  const filtered = cases.filter((c) => c.id !== id);
  if (filtered.length === cases.length) return false;
  await writeCases(filtered);
  return true;
}
