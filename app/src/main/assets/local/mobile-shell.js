import { tryToolRoute, calculateExpression, prettyNumber } from "./tools.js?v=3.10.0";

const ROUTES = new Set(["home", "chats", "chat", "models", "data", "tools", "settings"]);
const ROUTE_ALIAS = new Map([["library", "data"], ["more", "settings"]]);
const body = document.body;
const $ = (id) => document.getElementById(id);
let currentRoute = "home";
let chatFilter = "all";
let chatRenderLimit = 50;
let toolCategory = "all";

const TOOL_DEFS = [
  { id:"calculator", icon:"=", name:"Калькулятор", desc:"Выражения, проценты и быстрые вычисления", category:"local", local:true },
  { id:"units", icon:"↔", name:"Конвертер единиц", desc:"Длина, масса, объём и температура", category:"local", tab:"tools", anchor:"unitValue" },
  { id:"json", icon:"{}", name:"JSON", desc:"Проверка и красивое форматирование", category:"dev", tab:"tools", anchor:"jsonInput" },
  { id:"regex", icon:".*", name:"Regex", desc:"Тест регулярных выражений и совпадений", category:"dev", tab:"tools", anchor:"regexPattern" },
  { id:"python", icon:"Py", name:"Python", desc:"Локальная песочница Pyodide", category:"dev", tab:"tools", anchor:"pythonCode", heavy:true },
  { id:"ide", icon:"</>", name:"Мини-IDE", desc:"HTML/CSS/JS с живым предпросмотром", category:"dev", tab:"tools", anchor:"ideHtml" },
  { id:"csv", icon:"▦", name:"CSV-анализ", desc:"Статистика таблиц и выводы ИИ", category:"data", tab:"tools", anchor:"csvDocSelect" },
  { id:"search", icon:"⌕", name:"Глобальный поиск", desc:"Чаты, память, файлы и заметки", category:"data", tab:"search", anchor:"globalSearchInput" },
  { id:"study", icon:"A+", name:"Учёба", desc:"Объяснения, тесты и карточки", category:"ai", tab:"ai", anchor:"labPrompt" },
  { id:"rewrite", icon:"✎", name:"Редактор", desc:"Кратче, проще, исправить, перевести", category:"ai", tab:"ai", anchor:"rewriteInput" },
  { id:"agents", icon:"✦", name:"ИИ-лаборатория", desc:"Агенты, судья и улучшение ответа", category:"ai", tab:"ai", anchor:"labPrompt" },
  { id:"notes", icon:"▤", name:"Заметки и задачи", desc:"Локальная работа с проектами", category:"work", tab:"work", anchor:"noteList" },
  { id:"voice", icon:"◉", name:"Голос", desc:"Диктовка, озвучка и конспект", category:"media", tab:"media", anchor:"voiceTranscript" },
  { id:"ocr", icon:"▣", name:"Камера / OCR", desc:"Распознавание текста на изображениях", category:"media", tab:"media", anchor:"ocrFile" },
  { id:"vault", icon:"⌑", name:"Приватный сейф", desc:"Зашифрованные локальные заметки", category:"privacy", tab:"system", anchor:"vaultArea" },
  { id:"web", icon:"↗", name:"Веб-режим", desc:"Поиск с явным подтверждением приватности", category:"online", tab:"system", anchor:"webQuery" },
  { id:"benchmark", icon:"△", name:"Тест скорости", desc:"Замер tok/s и времени первого токена", category:"system", tab:"system", anchor:"benchmarkRun" },
  { id:"readiness", icon:"✓", name:"Офлайн-готовность", desc:"Проверка кэша и возможностей устройства", category:"system", tab:"system", anchor:"readinessBtn" },
  { id:"diagnostics", icon:"i", name:"Диагностика", desc:"WebGPU, модель и последняя ошибка", category:"system", tab:"system", anchor:"runtimeDiagnostic" },
];
const CATEGORY_LABELS = { all:"Все", local:"Быстрые", ai:"ИИ", dev:"Код", data:"Данные", work:"Работа", media:"Медиа", privacy:"Приватность", system:"Система", online:"Онлайн" };

function normalizeRoute(value) {
  const raw = String(value || "").replace(/^#\/?/, "").toLowerCase();
  const aliased = ROUTE_ALIAS.get(raw) || raw;
  return ROUTES.has(aliased) ? aliased : "home";
}
function routeFromLocation() { return normalizeRoute(location.hash || localStorage.getItem("qwen:route") || "home"); }

function setRoute(route, { historyMode = "push", scroll = true } = {}) {
  route = normalizeRoute(route);
  currentRoute = route;
  body.dataset.page = route;
  localStorage.setItem("qwen:route", route);
  document.querySelectorAll("[data-route]").forEach((button) => {
    const active = normalizeRoute(button.dataset.route) === route;
    button.classList.toggle("active", active);
    if (button.closest("nav")) {
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    }
  });
  const nextUrl = `${location.pathname}${location.search}#${route}`;
  if (historyMode === "push" && location.hash !== `#${route}`) history.pushState({ qwenRoute: route }, "", nextUrl);
  else if (historyMode === "replace") history.replaceState({ qwenRoute: route }, "", nextUrl);
  if (scroll) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "auto" }));
  if (route === "chats") renderChatManager();
  if (route === "tools") renderToolCenter();
  if (route === "home" || route === "settings" || route === "data") refreshDashboard();
  window.dispatchEvent(new CustomEvent("qwen:route", { detail: { route } }));
}

function navigate(route) { setRoute(route, { historyMode: "push", scroll: true }); }
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-route]");
  if (!button) return;
  event.preventDefault();
  navigate(button.dataset.route);
});
window.addEventListener("popstate", () => setRoute(routeFromLocation(), { historyMode: "none", scroll: true }));
window.addEventListener("hashchange", () => {
  const route = routeFromLocation();
  if (route !== currentRoute) setRoute(route, { historyMode: "none", scroll: true });
});

async function waitForBridge(timeout = 6000) {
  const start = performance.now();
  while (!window.QwenAppBridge && performance.now() - start < timeout) await new Promise((r) => setTimeout(r, 40));
  return window.QwenAppBridge || null;
}
async function waitForFeatures(timeout = 10000) {
  const start = performance.now();
  while (!window.QwenLocalFeatures && !window.QwenFeatureInitFailed && performance.now() - start < timeout) await new Promise((r) => setTimeout(r, 50));
  return window.QwenLocalFeatures || null;
}

function humanDate(ts) {
  if (!ts) return "";
  try { return new Intl.DateTimeFormat("ru", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }).format(new Date(ts)); } catch { return ""; }
}
function preview(chat, max = 100) {
  if (typeof chat?.preview === "string") return chat.preview.slice(0, max);
  const item = [...(chat.messages || [])].reverse().find((m) => typeof m?.content === "string" && m.content.trim());
  return (item?.content || "Пустой чат").replace(/\s+/g, " ").trim().slice(0, max);
}
function sortedChats(chats) {
  return [...chats].sort((a,b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.updatedAt || 0) - (a.updatedAt || 0));
}
function chatMatches(chat, q) {
  if (!q) return true;
  const hay = (chat.searchText || `${chat.title || ""} ${(chat.messages || []).slice(-50).map((m) => m.content || "").join(" ")}`).toLowerCase();
  return hay.includes(q.toLowerCase());
}

function makeChatCard(chat, currentId, compact = false) {
  const card = document.createElement("article");
  card.className = `page-chat-card${chat.id === currentId ? " current" : ""}${chat.pinned ? " pinned" : ""}${compact ? " compact" : ""}`;
  const open = document.createElement("button");
  open.className = "page-chat-open"; open.type = "button";
  const top = document.createElement("span"); top.className = "page-chat-card-top";
  const title = document.createElement("strong"); title.textContent = `${chat.pinned ? "★ " : ""}${chat.title || "Новый чат"}`;
  const meta = document.createElement("small"); meta.textContent = `${humanDate(chat.updatedAt)} · ${chat.messageCount ?? (chat.messages || []).length} сообщ.`;
  top.append(title, meta);
  const prev = document.createElement("p"); prev.textContent = preview(chat, compact ? 65 : 140);
  open.append(top, prev);
  open.addEventListener("click", async () => {
    const bridge = await waitForBridge();
    if (await bridge?.switchChat(chat.id)) navigate("chat");
  });
  card.appendChild(open);
  if (!compact) {
    const actions = document.createElement("div"); actions.className = "page-chat-actions";
    const specs = [
      [chat.pinned ? "★" : "☆", chat.pinned ? "Открепить" : "Закрепить", "pin"],
      ["⧉", "Дублировать", "duplicate"], ["✎", "Переименовать", "rename"], ["×", "Удалить", "delete"],
    ];
    for (const [symbol,label,action] of specs) {
      const b = document.createElement("button"); b.type = "button"; b.textContent = symbol; b.title = label; b.setAttribute("aria-label", label);
      if (action === "delete") b.classList.add("danger-chat-action");
      b.addEventListener("click", async () => {
        const bridge = await waitForBridge(); if (!bridge) return;
        if (action === "pin") await bridge.pinChat(chat.id);
        if (action === "duplicate") await bridge.duplicateChat(chat.id);
        if (action === "rename") await bridge.renameChat(chat.id);
        if (action === "delete") await bridge.deleteChat(chat.id);
        renderChatManager(); refreshDashboard();
      });
      actions.appendChild(b);
    }
    card.appendChild(actions);
  }
  return card;
}

async function renderChatManager() {
  const bridge = await waitForBridge(); if (!bridge) return;
  const all = sortedChats(bridge.getChats?.() || []);
  const currentId = bridge.getCurrentChat?.()?.id;
  const query = $("pageChatSearch")?.value?.trim() || "";
  let list = all.filter((c) => chatMatches(c, query));
  if (chatFilter === "pinned") list = list.filter((c) => c.pinned);
  if (chatFilter === "recent") list = list.filter((c) => Date.now() - (c.updatedAt || 0) < 7 * 86400000);
  const host = $("pageChatList"); if (host) {
    host.replaceChildren();
    if (!list.length) {
      const empty = document.createElement("div"); empty.className = "empty-state large-empty"; empty.textContent = query ? "По этому запросу чатов не найдено." : "Здесь пока нет чатов."; host.appendChild(empty);
    } else {
      list.slice(0, chatRenderLimit).forEach((c) => host.appendChild(makeChatCard(c, currentId)));
      if (list.length > chatRenderLimit) {
        const more = document.createElement("button"); more.type = "button"; more.className = "chat-show-more"; more.textContent = `Показать ещё ${Math.min(50, list.length - chatRenderLimit)} из ${list.length - chatRenderLimit}`;
        more.addEventListener("click", () => { chatRenderLimit += 50; renderChatManager(); });
        host.appendChild(more);
      }
    }
  }
  const totalMessages = all.reduce((sum,c) => sum + (c.messageCount ?? (c.messages || []).length), 0);
  if ($("chatManagerCount")) $("chatManagerCount").textContent = `${all.length} ${all.length === 1 ? "чат" : "чатов"}`;
  if ($("chatManagerMessages")) $("chatManagerMessages").textContent = `${totalMessages} сообщений`;
  renderRail(all, currentId);
}

function renderRail(chats, currentId) {
  const host = $("railChatList"); if (!host) return;
  const q = $("railChatSearch")?.value?.trim() || "";
  const list = chats.filter((c) => chatMatches(c, q)).slice(0, 9);
  host.replaceChildren();
  list.forEach((chat) => {
    const b = document.createElement("button"); b.type = "button"; b.className = `rail-chat-item${chat.id === currentId ? " active" : ""}`;
    const strong = document.createElement("strong"); strong.textContent = `${chat.pinned ? "★ " : ""}${chat.title || "Новый чат"}`;
    const small = document.createElement("small"); small.textContent = preview(chat, 58);
    b.append(strong, small); b.addEventListener("click", async () => { const bridge = await waitForBridge(); if (await bridge?.switchChat(chat.id)) navigate("chat"); });
    host.appendChild(b);
  });
}

$("pageChatSearch")?.addEventListener("input", () => { chatRenderLimit = 50; renderChatManager(); });
$("railChatSearch")?.addEventListener("input", renderChatManager);
document.querySelectorAll("[data-chat-filter]").forEach((b) => b.addEventListener("click", () => {
  chatFilter = b.dataset.chatFilter; chatRenderLimit = 50;
  document.querySelectorAll("[data-chat-filter]").forEach((x) => x.classList.toggle("active", x === b));
  renderChatManager();
}));
$("currentChatTitle")?.addEventListener("click", () => navigate("chats"));
$("currentChatTitle")?.setAttribute("role", "button");
$("currentChatTitle")?.setAttribute("tabindex", "0");
$("currentChatTitle")?.setAttribute("aria-label", "Открыть список чатов");
$("currentChatTitle")?.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate("chats"); } });
$("pageNewChat")?.addEventListener("click", async () => { const bridge = await waitForBridge(); await bridge?.newChat(); navigate("chat"); });
$("railNewChat")?.addEventListener("click", async () => { const bridge = await waitForBridge(); await bridge?.newChat(); navigate("chat"); });
window.addEventListener("qwen:chats-updated", () => { renderChatManager(); refreshDashboard(); });
window.addEventListener("qwen:app-ready", () => { renderChatManager(); refreshDashboard(); renderToolCenter(); });

function readToolPrefs() {
  try {
    const favorites = JSON.parse(localStorage.getItem("qwen:toolFavorites") || "[]");
    const recent = JSON.parse(localStorage.getItem("qwen:toolRecent") || "[]");
    return { favorites: Array.isArray(favorites) ? favorites.filter((x) => typeof x === "string") : [], recent: Array.isArray(recent) ? recent.filter((x) => typeof x === "string") : [] };
  } catch { return { favorites: [], recent: [] }; }
}
function saveToolPrefs(prefs) {
  try {
    localStorage.setItem("qwen:toolFavorites", JSON.stringify([...new Set(Array.isArray(prefs?.favorites) ? prefs.favorites : [])].slice(0,12)));
    localStorage.setItem("qwen:toolRecent", JSON.stringify([...new Set(Array.isArray(prefs?.recent) ? prefs.recent : [])].slice(0,10)));
  } catch {}
}
function touchRecent(id) {
  const prefs = readToolPrefs(); prefs.recent = [id, ...prefs.recent.filter((x) => x !== id)]; saveToolPrefs(prefs);
}
async function openFeature(tab, anchor) {
  const features = await waitForFeatures();
  if (!features) { window.QwenAppBridge?.showToast?.(window.QwenFeatureInitFailed ? `Расширенные функции недоступны: ${String(window.QwenFeatureInitFailed).slice(0,90)}` : "ИИ-система ещё загружается", 2600); return; }
  touchRecent(TOOL_DEFS.find((t) => t.tab === tab && (!anchor || t.anchor === anchor))?.id || tab);
  features.open?.(tab, anchor);
  renderToolCenter();
}

function makeToolCard(tool) {
  const prefs = readToolPrefs();
  const card = document.createElement("article"); card.className = `tool-directory-card category-${tool.category}`;
  const star = document.createElement("button"); star.type = "button"; star.className = "tool-star"; star.textContent = prefs.favorites.includes(tool.id) ? "★" : "☆"; star.setAttribute("aria-label", prefs.favorites.includes(tool.id) ? "Убрать из избранного" : "Добавить в избранное");
  star.addEventListener("click", () => {
    const p = readToolPrefs(); p.favorites = p.favorites.includes(tool.id) ? p.favorites.filter((x) => x !== tool.id) : [tool.id, ...p.favorites]; saveToolPrefs(p); renderToolCenter();
  });
  const open = document.createElement("button"); open.type = "button"; open.className = "tool-directory-open";
  const icon = document.createElement("span"); icon.className = "tool-directory-icon"; icon.textContent = tool.icon;
  const name = document.createElement("strong"); name.textContent = tool.name;
  const desc = document.createElement("small"); desc.textContent = tool.desc;
  open.append(icon,name,desc);
  open.addEventListener("click", () => {
    touchRecent(tool.id);
    if (tool.local && tool.id === "calculator") { $("quickCalcInput")?.focus(); $("quickCalcCard")?.scrollIntoView({ behavior:"smooth", block:"center" }); }
    else openFeature(tool.tab, tool.anchor);
  });
  card.append(star,open); return card;
}

function renderToolCenter() {
  const host = $("toolDirectory"), favoritesHost = $("favoriteToolGrid"); if (!host || !favoritesHost) return;
  const query = $("toolSearch")?.value?.trim().toLowerCase() || "";
  const prefs = readToolPrefs();
  const filtered = TOOL_DEFS.filter((t) => (toolCategory === "all" || t.category === toolCategory) && (!query || `${t.name} ${t.desc} ${CATEGORY_LABELS[t.category]}`.toLowerCase().includes(query)));
  host.replaceChildren(); filtered.forEach((t) => host.appendChild(makeToolCard(t)));
  const preferred = [...prefs.favorites, ...prefs.recent].filter((id, i, a) => a.indexOf(id) === i).map((id) => TOOL_DEFS.find((t) => t.id === id)).filter(Boolean).slice(0,5);
  favoritesHost.replaceChildren();
  if (!preferred.length) {
    const hint = document.createElement("div"); hint.className = "empty-state tool-empty"; hint.textContent = "Нажми ☆ на инструменте — он появится здесь."; favoritesHost.appendChild(hint);
  } else preferred.forEach((t) => favoritesHost.appendChild(makeToolCard(t)));
  if ($("toolCountLabel")) $("toolCountLabel").textContent = `${filtered.length} из ${TOOL_DEFS.length}`;
}

function renderToolCategories() {
  const host = $("toolCategoryChips"); if (!host) return;
  const cats = ["all", ...new Set(TOOL_DEFS.map((t) => t.category))];
  host.replaceChildren();
  cats.forEach((cat) => {
    const b = document.createElement("button"); b.type = "button"; b.textContent = CATEGORY_LABELS[cat] || cat; b.classList.toggle("active", toolCategory === cat);
    b.addEventListener("click", () => { toolCategory = cat; renderToolCategories(); renderToolCenter(); }); host.appendChild(b);
  });
}
$("toolSearch")?.addEventListener("input", renderToolCenter);
$("quickCalcRun")?.addEventListener("click", runQuickCalc);
$("quickCalcInput")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); runQuickCalc(); } });
function runQuickCalc() {
  const input = $("quickCalcInput")?.value?.trim() || ""; const out = $("quickCalcOutput"); if (!out) return;
  if (!input) { out.textContent = "Введи выражение"; return; }
  try {
    const routed = tryToolRoute(input);
    out.textContent = routed?.answer || prettyNumber(calculateExpression(input));
    out.classList.remove("error"); touchRecent("calculator");
  } catch (err) { const raw = err?.message ?? err; out.textContent = typeof raw === "string" ? raw : (() => { try { return JSON.stringify(raw); } catch { return "Не удалось посчитать"; } })(); out.classList.add("error"); }
  renderToolCenter();
}

async function refreshDashboard() {
  const bridge = await waitForBridge(); if (!bridge) return;
  const chats = bridge.getChats?.() || []; const current = bridge.getCurrentChat?.() || {};
  const model = bridge.getModelState?.() || {};
  if ($("homeCurrentChatTitle")) $("homeCurrentChatTitle").textContent = current.title || "Новый чат";
  if ($("homeCurrentChatPreview")) $("homeCurrentChatPreview").textContent = preview(current, 150);
  if ($("homeChatCount")) $("homeChatCount").textContent = String(chats.length);
  const summary = bridge.getDataSummary?.() || { memories:0, documents:0 };
  if ($("homeDataCount")) $("homeDataCount").textContent = String((summary.memories || 0) + (summary.documents || 0));
  const selected = model.models?.[model.selectedKey];
  if ($("homeModelState")) $("homeModelState").textContent = selected?.label || "Модель";
  if ($("homeModelNote")) $("homeModelNote").textContent = model.loadedKey ? "загружена в GPU" : "не загружена";
  if ($("dataPageSummary")) $("dataPageSummary").innerHTML = `<div><small>ПАМЯТЬ</small><strong>${summary.memories || 0}</strong></div><div><small>ФАЙЛЫ</small><strong>${summary.documents || 0}</strong></div><div><small>ЧАТЫ</small><strong>${chats.length}</strong></div>`;
  if ($("settingsDeviceSummary")) {
    const d = model.device || {};
    $("settingsDeviceSummary").innerHTML = `<div><small>УСТРОЙСТВО</small><strong>${d.label || "Браузер"}</strong></div><div><small>ПРОФИЛЬ</small><strong>${d.isIOS ? "iPhone Safe" : "Стандартный"}</strong></div><div><small>КОНТЕКСТ</small><strong>${model.contextSetting || "авто"}</strong></div>`;
  }
}

function openHub(tab) {
  if (tab === "memory") $("memoryBadge")?.click(); else if (tab === "files") $("filesBadge")?.click(); else $("hubBtn")?.click();
}
document.querySelectorAll("[data-open-hub]").forEach((b) => b.addEventListener("click", () => openHub(b.dataset.openHub)));
$("libraryNewChat")?.addEventListener("click", async () => { const bridge = await waitForBridge(); await bridge?.newChat(); navigate("chat"); });

async function openFeatureFromButton(button) {
  const raw = button.dataset.featureOpen || button.dataset.openAi || "home";
  const [tab, anchor] = raw.split(":"); await openFeature(tab, anchor || null);
}
document.querySelectorAll("[data-feature-open], [data-open-ai]").forEach((b) => b.addEventListener("click", () => openFeatureFromButton(b)));

$("settingsStatsBtn")?.addEventListener("click", () => $("statsBtn")?.click());
$("settingsThemeBtn")?.addEventListener("click", () => $("themeBtn")?.click());
$("settingsReleaseBtn")?.addEventListener("click", async () => { const bridge = await waitForBridge(); await bridge?.releaseModel?.(); refreshDashboard(); });
$("enableSafeModeBtn")?.addEventListener("click", async () => {
  const ok = await window.QwenMobileBridge?.enableSafeMode?.(); if (ok) { $("safeModeSummary").textContent = "Мини 135M · 1K · без рассуждений"; refreshDashboard(); navigate("models"); }
});

const heavyToggle = $("heavyModelsToggle");
heavyToggle?.addEventListener("click", () => {
  const shown = body.classList.toggle("show-heavy-models");
  const poco = document.documentElement.classList.contains("is-poco-x6-pro");
  heavyToggle.setAttribute("aria-expanded", String(shown));
  heavyToggle.textContent = shown
    ? (poco ? "Скрыть экспериментальные модели" : "Скрыть мощные модели")
    : (poco ? "Показать экспериментальные модели" : "Показать мощные модели");
});

function syncStandaloneChrome() {
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  document.documentElement.classList.toggle("mobile-standalone", standalone);
}
syncStandaloneChrome();
matchMedia("(display-mode: standalone)").addEventListener?.("change", syncStandaloneChrome);

renderToolCategories(); renderToolCenter();
setRoute(routeFromLocation(), { historyMode: "replace", scroll: false });
setTimeout(() => { renderChatManager(); refreshDashboard(); }, 80);

window.QwenNavigation = { navigate, current: () => currentRoute, openFeature };
