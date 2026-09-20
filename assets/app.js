const REPO = "Azotishka/Neuro-assistent";
const BRANCH = "main";
const CONTENT_DIR = "school-newspaper-site/content/issues";
const FALLBACK_ISSUES = [
  {
    title: "Пилотный выпуск газеты губернаторского лицея",
    issue_number: "01",
    date: "2026-09-20",
    theme: "Старт редакции",
    summary: "Первый демонстрационный номер: как редакция лицея собирает новости, проекты и идеи для будущих выпусков.",
    path: "content/issues/2026-09-20-pilot.md",
    body: `# Пилотный выпуск

Добро пожаловать в онлайн-газету губернаторского лицея. Здесь можно публиковать новости, исследования, интервью и творческие проекты.

## Что будет в следующих номерах

- школьные события и фоторепортажи;
- проектные работы учеников;
- интервью с участниками школьной жизни;
- афиша конкурсов и мероприятий.

> Редакция может заменить этот демонстрационный выпуск настоящим материалом через раздел "Добавить выпуск".`
  }
];

const state = {
  issues: [],
  query: ""
};

const listEl = document.querySelector("#issue-list");
const readerEl = document.querySelector("#reader");
const searchEl = document.querySelector("#search");
const todayEl = document.querySelector("#today");

todayEl.textContent = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric"
}).format(new Date());

searchEl.addEventListener("input", (event) => {
  state.query = event.target.value.trim().toLowerCase();
  renderList();
});

loadIssues();

async function loadIssues() {
  try {
    const apiUrl = `https://api.github.com/repos/${REPO}/contents/${CONTENT_DIR}?ref=${BRANCH}`;
    const response = await fetch(apiUrl, { headers: { Accept: "application/vnd.github+json" } });
    if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
    const files = await response.json();
    const markdownFiles = files.filter((file) => file.name.endsWith(".md"));
    const loaded = await Promise.all(markdownFiles.map(loadIssueFile));
    state.issues = loaded.filter(Boolean).sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    state.issues = FALLBACK_ISSUES;
  }

  if (!state.issues.length) {
    state.issues = FALLBACK_ISSUES;
  }

  renderList();
  renderIssue(state.issues[0]);
}

async function loadIssueFile(file) {
  try {
    const response = await fetch(file.download_url);
    if (!response.ok) throw new Error(`Raw file: ${response.status}`);
    const text = await response.text();
    const parsed = parseFrontMatter(text);
    return {
      title: parsed.meta.title || file.name.replace(/\.md$/, ""),
      issue_number: parsed.meta.issue_number || "",
      date: parsed.meta.date || "1970-01-01",
      theme: parsed.meta.theme || "Выпуск",
      summary: parsed.meta.summary || "",
      path: file.path,
      body: parsed.body
    };
  } catch (error) {
    return null;
  }
}

function parseFrontMatter(markdown) {
  if (!markdown.startsWith("---")) {
    return { meta: {}, body: markdown };
  }

  const end = markdown.indexOf("\n---", 3);
  if (end === -1) {
    return { meta: {}, body: markdown };
  }

  const yaml = markdown.slice(3, end).trim();
  const body = markdown.slice(end + 4).trim();
  const meta = {};

  yaml.split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    meta[key] = value;
  });

  return { meta, body };
}

function renderList() {
  const filtered = state.issues.filter((issue) => {
    const haystack = `${issue.title} ${issue.theme} ${issue.summary} ${issue.date}`.toLowerCase();
    return haystack.includes(state.query);
  });

  listEl.innerHTML = "";

  if (!filtered.length) {
    listEl.innerHTML = `<p class="reader-empty">Ничего не найдено. Попробуйте другой запрос.</p>`;
    return;
  }

  filtered.forEach((issue, index) => {
    const button = document.createElement("button");
    button.className = `issue-card${index === 0 ? " active" : ""}`;
    button.type = "button";
    button.innerHTML = `
      <span>${formatDate(issue.date)} · ${escapeHtml(issue.theme)}</span>
      <strong>${escapeHtml(issue.title)}</strong>
      <small>${escapeHtml(issue.summary || "Открыть выпуск для чтения")}</small>
    `;
    button.addEventListener("click", () => {
      document.querySelectorAll(".issue-card").forEach((card) => card.classList.remove("active"));
      button.classList.add("active");
      renderIssue(issue);
    });
    listEl.appendChild(button);
  });
}

function renderIssue(issue) {
  if (!issue) return;

  readerEl.innerHTML = `
    <article class="issue-view">
      <header class="issue-plate">
        <div class="issue-number">${escapeHtml(issue.issue_number || "№")}</div>
        <div>
          <p class="issue-meta">${formatDate(issue.date)} · ${escapeHtml(issue.theme)}</p>
          <h2>${escapeHtml(issue.title)}</h2>
          <p class="issue-summary">${escapeHtml(issue.summary || "")}</p>
        </div>
      </header>
      <div class="reader-actions">
        <a class="button" href="${rawUrl(issue.path)}" target="_blank" rel="noreferrer">Открыть исходник</a>
        <a class="button primary" href="admin/">Добавить новый выпуск</a>
      </div>
      <div class="article-body">${markdownToHtml(issue.body)}</div>
    </article>
  `;
}

function rawUrl(path) {
  if (!path) return "#";
  const normalized = path.startsWith("school-newspaper-site/")
    ? path
    : `school-newspaper-site/${path}`;
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${normalized}`;
}

function markdownToHtml(markdown) {
  const safe = escapeHtml(markdown);
  const lines = safe.split(/\r?\n/);
  const blocks = [];
  let paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${inlineMarkdown(trimmed.slice(4))}</h3>`);
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${inlineMarkdown(trimmed.slice(3))}</h2>`);
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h1>${inlineMarkdown(trimmed.slice(2))}</h1>`);
      return;
    }

    if (trimmed.startsWith("&gt; ")) {
      flushParagraph();
      flushList();
      blocks.push(`<blockquote>${inlineMarkdown(trimmed.slice(5))}</blockquote>`);
      return;
    }

    if (/^- /.test(trimmed)) {
      flushParagraph();
      list.push(trimmed.slice(2));
      return;
    }

    paragraph.push(trimmed);
  });

  flushParagraph();
  flushList();
  return blocks.join("");
}

function inlineMarkdown(text) {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt, src) => `<img src="${resolveMediaUrl(src)}" alt="${alt}">`)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function resolveMediaUrl(src) {
  if (/^https?:\/\//.test(src)) return src;
  const cleaned = src.replace(/^\.?\//, "");
  return `https://raw.githubusercontent.com/${REPO}/${BRANCH}/school-newspaper-site/${cleaned}`;
}

function formatDate(date) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(parsed);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
