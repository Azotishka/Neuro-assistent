#!/usr/bin/env python3
"""Build the public issue catalogue from the Markdown files committed by editors.

No GitHub credentials are needed: this runs in GitHub Actions before Pages deploy.
Only a small, deliberately restricted YAML front-matter subset is accepted.
"""
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ISSUES_DIR = ROOT / "content" / "issues"
OUTPUT = ROOT / "content" / "issues.json"
FIELDS = ("title", "issue_number", "date", "theme", "summary", "file", "attachments")
REQUIRED = ("title", "issue_number", "date")


def frontmatter_value(raw: str, path: Path, key: str) -> str:
    raw = raw.strip()
    if raw.startswith('"'):
        try:
            result = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path.name}: invalid double-quoted {key}: {exc}") from exc
    elif raw.startswith("'"):
        if not raw.endswith("'") or len(raw) < 2:
            raise ValueError(f"{path.name}: invalid single-quoted {key}")
        result = raw[1:-1].replace("''", "'")
    else:
        result = raw
    if not isinstance(result, str):
        raise ValueError(f"{path.name}: {key} must be text")
    return result



def plain_markdown(value: str) -> str:
    value = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", value)
    value = re.sub(r"[*_~]+", "", value)
    return re.sub(r"\s+", " ", value).strip()


def split_articles(body: str, fallback_theme: str) -> list[dict]:
    """Turn editor ## sections into a news-style list without changing source text."""
    matches = list(re.finditer(r"(?m)^##\s+(.+?)\s*$", body))
    if not matches:
        teasers = []
        for paragraph in re.split(r"\n\s*\n", body):
            teaser = re.match(r"^\*\*(.+?)\*\*\s*(.+)$", paragraph.strip(), re.DOTALL)
            if teaser:
                teaser_body = teaser.group(2).strip()
                teasers.append({"id": f"article-{len(teasers) + 1}", "title": plain_markdown(teaser.group(1))[:180], "section": fallback_theme or "Материалы выпуска", "author": "", "lead": plain_markdown(teaser_body)[:360], "body": teaser_body})
        return teasers if len(teasers) >= 2 else []
    articles = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(body)
        chunk = body[match.end():end].strip()
        chunk = re.sub(r"(?m)^---\s*$", "", chunk).strip()
        if not chunk:
            continue
        title = plain_markdown(match.group(1))[:180]
        section = fallback_theme or "Материалы выпуска"
        author = ""
        meta = re.match(r"^\*\*(.+?)\*\*\s*(?:\n+|$)", chunk)
        if meta:
            meta_text = plain_markdown(meta.group(1))
            parts = [part.strip() for part in meta_text.split("·") if part.strip()]
            if parts:
                section = parts[0][:80]
            for part in parts[1:]:
                if part.lower().startswith("автор:"):
                    author = part.split(":", 1)[1].strip()[:100]
            chunk = chunk[meta.end():].strip()
        paragraphs = [plain_markdown(p) for p in re.split(r"\n\s*\n", chunk) if plain_markdown(p)]
        lead = (paragraphs[0] if paragraphs else "")[:360]
        articles.append({
            "id": f"article-{index + 1}",
            "title": title,
            "section": section,
            "author": author,
            "lead": lead,
            "body": chunk,
        })
    return articles

def parse_issue(path: Path) -> dict:
    content = path.read_text(encoding="utf-8-sig").replace("\r\n", "\n")
    match = re.match(r"\A---\n(.*?)\n---\n(?:\n)?(.*)\Z", content, re.DOTALL)
    if not match:
        raise ValueError(f"{path.name}: expected --- front matter and Markdown body")
    fields = {}
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if ":" not in line:
            raise ValueError(f"{path.name}: invalid front matter line: {line!r}")
        name, value = line.split(":", 1)
        key = name.strip()
        if key not in FIELDS or key in fields:
            raise ValueError(f"{path.name}: unknown or duplicate field: {key}")
        fields[key] = frontmatter_value(value, path, key)
    for required in REQUIRED:
        if not fields.get(required):
            raise ValueError(f"{path.name}: missing {required}")
    try:
        date.fromisoformat(fields["date"])
    except ValueError as exc:
        raise ValueError(f"{path.name}: date must be YYYY-MM-DD") from exc
    # A link appears only after the original binary is present in the repository.
    attached = fields.get("file", "")
    if attached:
        valid = re.fullmatch(r"content/files/[\w\u0400-\u04ff .()\-]+\.(?:pdf|docx?|odt|rtf|txt|pptx?|xlsx?|csv|jpe?g|png|webp|zip)", attached, re.IGNORECASE)
        if not valid or ".." in attached:
            raise ValueError(f"{path.name}: invalid attachment path")
        if not (ROOT / attached).is_file():
            print(f"Attachment not uploaded yet: {attached}", file=sys.stderr)
            fields["file"] = ""
    raw_attachments = fields.get("attachments", "")
    attachments = []
    if raw_attachments:
        try:
            candidates = json.loads(raw_attachments)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path.name}: attachments must be a JSON array string") from exc
        if not isinstance(candidates, list) or not all(isinstance(item, str) for item in candidates):
            raise ValueError(f"{path.name}: attachments must contain file paths")
        for item in candidates[:20]:
            valid = re.fullmatch(r"content/files/[\w\u0400-\u04ff .()\-]+\.(?:pdf|docx?|odt|rtf|txt|md|pptx?|xlsx?|csv|jpe?g|png|webp|zip)", item, re.IGNORECASE)
            if not valid or ".." in item:
                raise ValueError(f"{path.name}: invalid attachment path")
            if (ROOT / item).is_file():
                attachments.append(item)
            else:
                print(f"Attachment not uploaded yet: {item}", file=sys.stderr)
        fields["attachments"] = attachments
    body = match.group(2).strip()
    if not body:
        raise ValueError(f"{path.name}: empty article")
    return {**{key: fields.get(key, [] if key == "attachments" else "") for key in FIELDS},
            "body": body, "articles": split_articles(body, fields.get("theme", "")), "source_file": path.name}


def main() -> None:
    issues = [parse_issue(path) for path in sorted(ISSUES_DIR.glob("*.md"))]
    issues.sort(key=lambda issue: (issue["date"], issue["issue_number"]), reverse=True)
    OUTPUT.write_text(json.dumps(issues, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(issues)} issue(s) into {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, ValueError) as exc:
        print(f"Issue catalogue build failed: {exc}", file=sys.stderr)
        sys.exit(1)
