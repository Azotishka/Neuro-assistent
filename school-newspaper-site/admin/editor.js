"use strict";

// An editor for public Markdown files. No secret, PIN or GitHub credential is used.
const REPO = "Azotishka/Neuro-assistent";
const FOLDER = "school-newspaper-site/content/issues";
const fieldNames = ["title", "issue_number", "date", "theme", "summary", "body"];
const form = document.querySelector("#issue-form");
const chooser = document.querySelector("#existing");
const status = document.querySelector("#publish-status");
const catalogueStatus = document.querySelector("#catalogue-status");
const filenameEl = document.querySelector("#filename");
const githubLink = document.querySelector("#github-link");
const fields = Object.fromEntries(fieldNames.map((name) => [name, document.getElementById(name)]));
let issues = [];
let sourceFile = "";
let loading = false;

const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};
const text = (value) => String(value ?? "").trim();

function getIssue() {
  return Object.fromEntries(fieldNames.map((name) => [name, fields[name].value.trim()]));
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0430-\u044f\u0451]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function chosenFilename() {
  if (sourceFile) return sourceFile;
  const issue = getIssue();
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(issue.date) ? issue.date : today();
  // Keep filenames portable across GitHub and local downloads.
  return stamp + "-issue-" + (slug(issue.issue_number).replace(/[^a-z0-9-]/g, "") || "new") + "-" + (slug(issue.title).replace(/[^a-z0-9-]/g, "") || "news") + ".md";
}

function makeMarkdown() {
  const issue = getIssue();
  // JSON-quoted string values are a safe subset of YAML front matter.
  const meta = ["title", "issue_number", "date", "theme", "summary"]
    .map((key) => key + ": " + JSON.stringify(issue[key])).join("\n");
  return "---\n" + meta + "\n---\n\n" + issue.body + "\n";
}

function valid() {
  const issue = getIssue();
  if (!issue.title || !issue.issue_number || !issue.date || !issue.body) {
    status.textContent = "Заполните заголовок, номер, дату и текст выпуска.";
    form.reportValidity();
    return false;
  }
  return true;
}

function updateLinks() {
  const name = chosenFilename();
  filenameEl.textContent = name;
  const base = "https://github.com/" + REPO;
  if (sourceFile) {
    githubLink.href = base + "/edit/main/" + FOLDER + "/" + encodeURIComponent(sourceFile);
    githubLink.textContent = "Редактировать файл в GitHub ↗";
  } else {
    githubLink.href = base + "/new/main/" + FOLDER + "?filename=" + encodeURIComponent(name);
    githubLink.textContent = "Создать файл в GitHub ↗";
  }
}

function previewText(element, value, fallback = "") {
  element.textContent = value || fallback;
}

function updatePreview() {
  const issue = getIssue();
  previewText(document.querySelector("#preview-meta"),
    [issue.issue_number && "№ " + issue.issue_number, issue.date, issue.theme].filter(Boolean).join(" · "),
    "Черновик школьной газеты");
  previewText(document.querySelector("#preview-heading"), issue.title, "Новый выпуск");
  previewText(document.querySelector("#preview-summary"), issue.summary);
  // Never interpret untrusted Markdown as HTML in the admin.
  previewText(document.querySelector("#preview-body"), issue.body, "Здесь появится текст выпуска…");
  updateLinks();
}

function fillIssue(issue, origin = "") {
  loading = true;
  fieldNames.forEach((name) => { fields[name].value = text(issue[name]); });
  sourceFile = origin;
  if (!origin) chooser.value = "";
  loading = false;
  status.textContent = sourceFile
    ? "После правок скопируйте текст и замените содержимое существующего файла в GitHub."
    : "Новый номер ещё не опубликован. Подготовьте его и добавьте файл в GitHub.";
  updatePreview();
}

function resetIssue() {
  fillIssue({date: today()}, "");
}

async function loadIssues() {
  try {
    const response = await fetch("../content/issues.json", {credentials: "same-origin", cache: "no-store"});
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Некорректный каталог");
    issues = data;
    data.forEach((issue, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = (issue.issue_number ? "№ " + issue.issue_number + " · " : "") + issue.title;
      chooser.appendChild(option);
    });
    catalogueStatus.textContent = data.length
      ? "В архиве опубликовано выпусков: " + data.length + ". Выберите номер из списка или создайте новый."
      : "Архив пока пуст. Можно подготовить первый выпуск.";
  } catch (_) {
    catalogueStatus.textContent = "Не удалось получить архив. Создать новый выпуск всё равно можно.";
  }
}

chooser.addEventListener("change", () => {
  const idx = Number(chooser.value);
  if (chooser.value === "" || !issues[idx]) { resetIssue(); return; }
  const issue = issues[idx];
  // A missing source_file means the catalogue predates the auto-build workflow.
  // Do not guess a filename: that could silently create a duplicate.
  if (!/^[\w.-]+\.md$/.test(issue.source_file || "")) {
    catalogueStatus.textContent = "Этот выпуск пока не связан с исходным файлом. Дождитесь обновления сайта или найдите файл вручную в репозитории.";
    fillIssue(issue, "");
    githubLink.href = "https://github.com/" + REPO + "/tree/main/" + FOLDER;
    githubLink.textContent = "Найти исходный файл в GitHub ↗";
    return;
  }
  fillIssue(issue, issue.source_file);
});

document.querySelector("#new").addEventListener("click", () => resetIssue());
form.addEventListener("input", () => { if (!loading) updatePreview(); });

document.querySelector("#copy").addEventListener("click", async () => {
  if (!valid()) return;
  const content = makeMarkdown();
  try {
    await navigator.clipboard.writeText(content);
    status.textContent = "Текст скопирован. Откройте GitHub и вставьте его в файл. Изменения ещё не опубликованы.";
  } catch (_) {
    status.textContent = "Браузер не разрешил копирование. Нажмите «Скачать .md» и перенесите содержимое файла в GitHub.";
  }
});

document.querySelector("#download").addEventListener("click", () => {
  if (!valid()) return;
  const url = URL.createObjectURL(new Blob([makeMarkdown()], {type: "text/markdown;charset=utf-8"}));
  const link = document.createElement("a");
  link.href = url;
  link.download = chosenFilename();
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  status.textContent = "Файл скачан на устройство. Для публикации его всё ещё нужно сохранить в GitHub.";
});

githubLink.addEventListener("click", (event) => {
  if (!valid()) event.preventDefault();
  else status.textContent = "GitHub откроется отдельно. Скопируйте текст, вставьте его в файл и подтвердите сохранение.";
});

resetIssue();
loadIssues();
