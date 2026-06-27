#!/usr/bin/env python3
"""Extrait les articles de la Loi 015/2002 depuis le PDF officiel."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "public/docs/code-du-travail.pdf"
OUT_PATH = ROOT / "public/data/code-travail-articles.json"

HEADER_RE = re.compile(
    r"Journal Officiel[^\n]*\n\s*\d+\s*\n",
    re.IGNORECASE,
)
ARTICLE_RE = re.compile(
    r"Article\s+(?:(\d+)|1er|premier)\s*:",
    re.IGNORECASE,
)
CHAPTER_RE = re.compile(
    r"^Chapitre\s+[IVXLC\d]+[^:]*:?\s*(.+)$",
    re.IGNORECASE | re.MULTILINE,
)
SECTION_RE = re.compile(
    r"^Section\s+[IVXLC\d]+[^:]*:?\s*(.+)$",
    re.IGNORECASE | re.MULTILINE,
)
TITLE_RE = re.compile(
    r"^Titre\s+[IVXLC\d]+[^:]*:?\s*(.+)$",
    re.IGNORECASE | re.MULTILINE,
)


def normalize_whitespace(text: str) -> str:
    text = HEADER_RE.sub("\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text


def article_number(match: re.Match[str]) -> str:
    if match.group(1):
        return match.group(1)
    return "1"


def first_sentence_title(body: str, num: str) -> str:
    cleaned = body.strip()
    if not cleaned:
        return f"Article {num}"
    sentence = re.split(r"(?<=[.;])\s+", cleaned, maxsplit=1)[0]
    sentence = sentence.strip()
    if len(sentence) < 12:
        sentence = cleaned[:120].strip()
    if len(sentence) > 120:
        sentence = sentence[:117].rstrip() + "…"
    return sentence or f"Article {num}"


def clean_label(value: str) -> str:
    value = value.strip()
    if len(value) < 3 or value in {":", "-", "—"}:
        return ""
    return value[:100]


def format_body(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r"[ \t]+", " ", raw)
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    raw = re.sub(r" *\n *", "\n", raw)
    return raw.strip()


def strip_trailing_structure(body: str) -> str:
    body = re.sub(
        r"\s*(Chapitre|Section|Titre)\s+[IVXLC\d]+[^.]*$",
        "",
        body,
        flags=re.IGNORECASE,
    ).strip()
    return body


def update_context(pre: str, chapter: str, section: str) -> tuple[str, str]:
    chapter_out, section_out = chapter, section
    chapters = re.findall(
        r"Chapitre\s+[IVXLC\d]+[^:]*:\s*([^\n]+)",
        pre,
        re.IGNORECASE,
    )
    if chapters:
        label = clean_label(chapters[-1])
        if label:
            chapter_out = label
    sections = re.findall(
        r"Section\s+[IVXLC\d]+[^:]*:\s*([^\n]+)",
        pre,
        re.IGNORECASE,
    )
    if sections:
        label = clean_label(sections[-1])
        if label:
            section_out = label
    titles = re.findall(
        r"Titre\s+[IVXLC\d]+[^:]*:\s*([^\n]+)",
        pre,
        re.IGNORECASE,
    )
    if titles and not chapter_out:
        label = clean_label(titles[-1])
        if label:
            chapter_out = label
    return chapter_out, section_out


def extract_articles(code_text: str) -> list[dict]:
    matches = list(ARTICLE_RE.finditer(code_text))
    articles: list[dict] = []
    chapter = ""
    section = ""

    for index, match in enumerate(matches):
        num = article_number(match)
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(code_text)
        body = format_body(code_text[start:end])
        body = strip_trailing_structure(body)

        pre = code_text[max(0, match.start() - 3000) : match.start()]
        chapter, section = update_context(pre, chapter, section)
        category = chapter or section or "Dispositions générales"

        articles.append(
            {
                "id": f"art-{num}",
                "article": f"Article {num}" if num != "1" else "Article 1er",
                "title": first_sentence_title(body, num),
                "body": body,
                "summary": body[:300] + ("…" if len(body) > 300 else ""),
                "category": category,
                "source": "Loi n°015/2002 — Journal Officiel (25 oct. 2002)",
                "keywords": [],
            }
        )

    # Dernier article gagne si doublon (texte le plus long)
    by_id: dict[str, dict] = {}
    for item in articles:
        existing = by_id.get(item["id"])
        if not existing or len(item["body"]) > len(existing["body"]):
            by_id[item["id"]] = item

    result = list(by_id.values())
    result.sort(key=lambda a: int(re.search(r"\d+", a["id"]).group()))  # type: ignore[union-attr]
    return result


def main() -> int:
    if not PDF_PATH.is_file():
        print(f"PDF introuvable: {PDF_PATH}", file=sys.stderr)
        return 1

    reader = PdfReader(str(PDF_PATH))
    full = normalize_whitespace(
        "".join((page.extract_text() or "") + "\n" for page in reader.pages)
    )

    start = full.find("LOI N° 015/2002 DU 16 OCTOBRE 2002")
    end = full.find("LOI N° 016/2002 DU 16 OCTOBRE 2002 PORTANT", start + 1000)
    if start < 0 or end < 0:
        print("Impossible de délimiter la Loi 015/2002 dans le PDF.", file=sys.stderr)
        return 1

    articles = extract_articles(full[start:end])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(
        json.dumps(articles, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Écrit {len(articles)} articles → {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
