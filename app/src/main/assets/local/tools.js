const UNIT_GROUPS = {
  length: {
    m: 1, meter: 1, meters: 1, метр: 1, метра: 1, метров: 1,
    km: 1000, км: 1000, kilometer: 1000, километра: 1000, километров: 1000,
    cm: 0.01, см: 0.01, mm: 0.001, мм: 0.001,
    mi: 1609.344, mile: 1609.344, miles: 1609.344, миля: 1609.344, мили: 1609.344,
    ft: 0.3048, foot: 0.3048, feet: 0.3048, фут: 0.3048, футов: 0.3048,
    in: 0.0254, inch: 0.0254, inches: 0.0254, дюйм: 0.0254, дюймов: 0.0254,
  },
  mass: {
    kg: 1, кг: 1, kilogram: 1, килограмм: 1, килограммов: 1,
    g: 0.001, гр: 0.001, грамм: 0.001, граммов: 0.001,
    lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, фунт: 0.45359237, фунтов: 0.45359237,
    oz: 0.028349523125, ounce: 0.028349523125, унция: 0.028349523125,
  },
  volume: {
    l: 1, л: 1, liter: 1, litre: 1, литр: 1, литров: 1,
    ml: 0.001, мл: 0.001, milliliter: 0.001, миллилитр: 0.001,
    cup: 0.2365882365, cups: 0.2365882365, чашка: 0.2365882365, чашек: 0.2365882365,
  },
  area: {
    m2: 1, "м2": 1, "м²": 1, sqm: 1, "квм": 1,
    km2: 1_000_000, "км2": 1_000_000, "км²": 1_000_000, sqkm: 1_000_000,
    cm2: 0.0001, "см2": 0.0001, "см²": 0.0001,
    ha: 10_000, hectare: 10_000, гектар: 10_000, гектаров: 10_000,
    acre: 4046.8564224, acres: 4046.8564224, акр: 4046.8564224, акров: 4046.8564224,
  },
  speed: {
    "m/s": 1, "м/с": 1, mps: 1,
    "km/h": 1 / 3.6, "км/ч": 1 / 3.6, kph: 1 / 3.6,
    mph: 0.44704, "ми/ч": 0.44704, knot: 0.514444, knots: 0.514444, узел: 0.514444,
  },
  data: {
    b: 1, byte: 1, bytes: 1, байт: 1, байта: 1, байтов: 1,
    kb: 1000, кб: 1000, mb: 1_000_000, мб: 1_000_000, gb: 1_000_000_000, гб: 1_000_000_000,
    kib: 1024, mib: 1024 ** 2, gib: 1024 ** 3,
  },
  time: {
    ms: 0.001, мс: 0.001, s: 1, sec: 1, second: 1, сек: 1, секунда: 1, секунд: 1,
    min: 60, minute: 60, мин: 60, минута: 60, минут: 60,
    h: 3600, hr: 3600, hour: 3600, ч: 3600, час: 3600, часов: 3600,
    day: 86400, days: 86400, день: 86400, дней: 86400,
  },
};

function normalizeUnit(unit) {
  return String(unit || "").trim().toLowerCase().replace(/[.,]$/g, "");
}

function unitGroup(unit) {
  const u = normalizeUnit(unit);
  for (const [group, map] of Object.entries(UNIT_GROUPS)) if (u in map) return [group, map[u]];
  if (["c", "°c", "celsius", "цельсий", "цельсия", "f", "°f", "fahrenheit", "фаренгейт", "фаренгейта", "k", "kelvin", "кельвин"].includes(u)) return ["temperature", u];
  return null;
}

function convertTemperature(value, from, to) {
  const f = normalizeUnit(from), t = normalizeUnit(to);
  const isC = (u) => ["c", "°c", "celsius", "цельсий", "цельсия"].includes(u);
  const isF = (u) => ["f", "°f", "fahrenheit", "фаренгейт", "фаренгейта"].includes(u);
  const isK = (u) => ["k", "kelvin", "кельвин"].includes(u);
  let c;
  if (isC(f)) c = value;
  else if (isF(f)) c = (value - 32) * 5 / 9;
  else if (isK(f)) c = value - 273.15;
  else throw new Error("Неизвестная температурная единица");
  if (isC(t)) return c;
  if (isF(t)) return c * 9 / 5 + 32;
  if (isK(t)) return c + 273.15;
  throw new Error("Неизвестная температурная единица");
}

export function convertUnits(value, from, to) {
  const a = unitGroup(from), b = unitGroup(to);
  if (!a || !b || a[0] !== b[0]) throw new Error("Эти единицы нельзя преобразовать друг в друга");
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error("Неверное число");
  if (a[0] === "temperature") return convertTemperature(n, from, to);
  return n * a[1] / b[1];
}

class ExprParser {
  constructor(input) { this.s = input.replace(/,/g, "."); this.i = 0; }
  peek() { return this.s[this.i]; }
  ws() { while (/\s/.test(this.peek() || "")) this.i++; }
  match(ch) { this.ws(); if (this.s.startsWith(ch, this.i)) { this.i += ch.length; return true; } return false; }
  parse() { const v = this.expr(); this.ws(); if (this.i < this.s.length) throw new Error(`Неожиданный символ: ${this.peek()}`); return v; }
  expr() { let v = this.term(); while (true) { if (this.match("+")) v += this.term(); else if (this.match("-")) v -= this.term(); else break; } return v; }
  term() { let v = this.power(); while (true) { if (this.match("*")) v *= this.power(); else if (this.match("/")) { const d = this.power(); if (d === 0) throw new Error("Деление на ноль"); v /= d; } else if (this.match("%")) v %= this.power(); else break; } return v; }
  power() { let v = this.unary(); if (this.match("^")) v = Math.pow(v, this.power()); return v; }
  unary() { if (this.match("+")) return this.unary(); if (this.match("-")) return -this.unary(); return this.primary(); }
  primary() {
    this.ws();
    if (this.match("(")) { const v = this.expr(); if (!this.match(")")) throw new Error("Нет закрывающей скобки"); return v; }
    const tail = this.s.slice(this.i);
    const fn = tail.match(/^(sqrt|sin|cos|tan|log|ln)\b/i);
    if (fn) {
      this.i += fn[0].length;
      if (!this.match("(")) throw new Error(`После ${fn[0]} нужна открывающая скобка`);
      const value = this.expr();
      if (!this.match(")")) throw new Error("Нет закрывающей скобки");
      const name = fn[0].toLowerCase();
      if (name === "sqrt") { if (value < 0) throw new Error("Корень из отрицательного числа не определён"); return Math.sqrt(value); }
      if (name === "sin") return Math.sin(value);
      if (name === "cos") return Math.cos(value);
      if (name === "tan") return Math.tan(value);
      if (value <= 0) throw new Error("Логарифм определён только для положительных чисел");
      return name === "ln" ? Math.log(value) : Math.log10(value);
    }
    const c = tail.match(/^(?:pi\b|π|e\b)/i);
    if (c) { this.i += c[0].length; return /^e$/i.test(c[0]) ? Math.E : Math.PI; }
    const m = tail.match(/^(\d+(?:\.\d+)?|\.\d+)/);
    if (!m) throw new Error("Ожидалось число");
    this.i += m[0].length;
    return Number(m[0]);
  }
}

export function calculateExpression(input) {
  const safe = String(input).trim().replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/√\s*\(/g, "sqrt(");
  if (!safe || safe.length > 220) throw new Error("Слишком длинное выражение");
  if (!/^[\d\s+\-*/%^().,πpieEsqrtanlog]+$/i.test(safe)) throw new Error("Допустимы только числа, функции и математические операторы");
  const result = new ExprParser(safe).parse();
  if (!Number.isFinite(result)) throw new Error("Результат не является конечным числом");
  return result;
}

export function prettyNumber(n) {
  if (!Number.isFinite(n)) return String(n);
  const rounded = Math.abs(n) >= 1e9 || (Math.abs(n) > 0 && Math.abs(n) < 1e-6) ? n.toExponential(8) : Number(n.toPrecision(12)).toString();
  return rounded;
}

export function tryToolRoute(text) {
  const input = String(text || "").trim();
  if (!input) return null;

  const percent = input.match(/(?:сколько\s+будет\s+)?([\d.,]+)\s*%\s*(?:от|of)\s*([\d.,]+)/i);
  if (percent) {
    const a = Number(percent[1].replace(",", ".")), b = Number(percent[2].replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b)) return { tool: "calculator", answer: `${prettyNumber(a)}% от ${prettyNumber(b)} = ${prettyNumber(a / 100 * b)}` };
  }

  const conv = input.match(/(-?[\d.,]+)\s*([a-zа-яё°]+)\s+(?:в|to|into)\s+([a-zа-яё°]+)/i);
  if (conv) {
    try {
      const value = Number(conv[1].replace(",", "."));
      const out = convertUnits(value, conv[2], conv[3]);
      return { tool: "unit", answer: `${prettyNumber(value)} ${conv[2]} = ${prettyNumber(out)} ${conv[3]}` };
    } catch {}
  }

  const candidate = input.replace(/^(посчитай|calculate|calc|вычисли)\s*[:：]?\s*/i, "").trim();
  if (/^[\d\s+\-*/%^().,πpieE×·÷]+$/i.test(candidate) && /[+\-*/%^×·÷]/.test(candidate)) {
    try { return { tool: "calculator", answer: `${candidate} = ${prettyNumber(calculateExpression(candidate))}` }; } catch {}
  }

  if (/^(какая|какой|what).*(дата|date)|^(дата|date)(\s|$)/i.test(input)) {
    return { tool: "date", answer: new Intl.DateTimeFormat("ru-RU", { dateStyle: "full" }).format(new Date()) };
  }
  if (/^(который час|время|time\??$|what time)/i.test(input)) {
    return { tool: "time", answer: new Intl.DateTimeFormat("ru-RU", { timeStyle: "medium" }).format(new Date()) };
  }
  return null;
}

export function formatJson(text) {
  const parsed = JSON.parse(text);
  return JSON.stringify(parsed, null, 2);
}

export function testRegex(pattern, flags, text) {
  const source = String(pattern || "");
  const input = String(text || "");
  if (source.length > 500) throw new Error("Шаблон Regex слишком длинный");
  if (input.length > 100_000) throw new Error("Тестовый текст ограничен 100 000 символами");
  // Nested quantified groups, such as (a+)+, are a common source of catastrophic backtracking.
  const unescaped = source.replace(/\\./g, "_");
  if (/\((?:[^()]|\([^)]*\))*[+*{][^)]*\)\s*(?:[+*]|\{\d)/.test(unescaped)) {
    throw new Error("Этот шаблон может слишком долго выполняться (вложенные квантификаторы)");
  }
  const re = new RegExp(source, flags);
  const matches = [];
  if (re.global) {
    for (const m of input.matchAll(re)) {
      matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
      if (matches.length >= 100) break;
    }
  } else {
    const m = re.exec(input);
    if (m) matches.push({ match: m[0], index: m.index, groups: m.slice(1) });
  }
  return matches;
}

export function parseCSV(text, delimiter = null) {
  const sample = String(text || "");
  if (!delimiter) {
    const first = sample.split(/\r?\n/, 1)[0] || "";
    const candidates = [",", ";", "\t"];
    delimiter = candidates.sort((a, b) => first.split(b).length - first.split(a).length)[0];
  }
  const rows = [];
  let row = [], field = "", quoted = false;
  for (let i = 0; i < sample.length; i++) {
    const ch = sample[i], next = sample[i + 1];
    if (ch === '"') {
      if (quoted && next === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) { row.push(field); field = ""; }
    else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(field); field = "";
      if (row.some((x) => x.length)) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((x) => x.length)) rows.push(row);
  return rows;
}

export function csvSummary(text) {
  const rows = parseCSV(text);
  if (!rows.length) throw new Error("CSV пуст");
  const headers = rows[0].map((h, i) => h.trim() || `column_${i + 1}`);
  const body = rows.slice(1);
  const cols = headers.map((name, i) => {
    const vals = body.map((r) => r[i] ?? "").filter((x) => x !== "");
    const nums = vals.map((x) => Number(String(x).replace(",", "."))).filter(Number.isFinite);
    const numericRatio = vals.length ? nums.length / vals.length : 0;
    const info = { name, nonEmpty: vals.length, unique: new Set(vals).size, type: numericRatio > .8 ? "number" : "text" };
    if (info.type === "number" && nums.length) {
      const sum = nums.reduce((a, b) => a + b, 0);
      info.min = Math.min(...nums); info.max = Math.max(...nums); info.mean = sum / nums.length;
    }
    return info;
  });
  return { rows: body.length, columns: headers.length, headers, cols, preview: body.slice(0, 6) };
}

export function scoreComplexity(text) {
  const t = String(text || "");
  let score = 0;
  score += Math.min(4, Math.floor(t.length / 500));
  if (/проанализ|сравни|докажи|архитект|алгоритм|debug|ошибк|reason|почему|пошаг|стратег|план/i.test(t)) score += 2;
  if (/код|javascript|python|typescript|sql|regex|api|class|function|ошибка/i.test(t)) score += 1;
  if (/максимально|подробно|глубоко|сложн|точно/i.test(t)) score += 1;
  if (/[\n]{2,}/.test(t)) score += 1;
  return score;
}

export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[ch]));
}
