import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../index.html");
const css = read("../neuro-nova-shell.css");
const app = read("../app.js");
const snake = read("../neuro-nova-snake.js");
const research = read("../neuro-nova-research.js");
const studio = read("../../../java/com/neuroassistant/app/studio/StudioIntegration.kt");

test("app shell loads versioned styles and learning modules", () => {
  assert.match(html, /neuro-nova-shell\.css\?v=0\.24\.0/);
  assert.match(html, /neuro-nova-research\.js\?v=0\.24\.0/);
  assert.match(html, /neuro-nova-snake\.js\?v=0\.24\.0/);
});

test("routes explicitly hide unrelated screens and adapt to compact widths", () => {
  for (const route of ["home", "models", "chat", "chats", "data", "tools", "settings"]) {
    assert.match(css, new RegExp('body\\[data-page="' + route + '"\\]'));
  }
  assert.match(css, /@media\(max-width:820px\)/);
  assert.match(css, /body\[data-page="home"\].*#statusPanel/s);
});

test("WebLLM runtime version and model catalog are declared", () => {
  assert.match(app, /WEBLLM_VERSION = "0\.2\.86"/);
  for (const id of ["SmolLM2-135M-Instruct-q0f16-MLC", "Qwen2.5-0.5B-Instruct-q4f16_1-MLC", "Qwen3-1.7B-q4f16_1-MLC", "Qwen3-4B-q4f16_1-MLC"]) {
    assert.ok(app.includes(id), "Missing model ID: " + id);
  }
});

test("Snake supports visible play, headless batches, manual training and export", () => {
  assert.match(snake, /nnsHeadless/);
  assert.match(snake, /nnsManualLearn/);
  assert.match(snake, /tickHeadless/);
  assert.match(snake, /neuro-snake-training\.json/);
  assert.match(snake, /algorithm:'relative-action-qlearning-v2'/);
});

test("research can import multiple HTTPS sources and labels retrieval honestly", () => {
  assert.match(research, /не переобучает веса языковой модели/);
  assert.match(research, /urls\.length>10/);
  assert.match(research, /window\.NeuroStudio\.fetchUrl/);
});

test("internet search supports Russian and English and blocks local targets", () => {
  assert.match(studio, /listOf\("ru","en"\)/);
  assert.match(studio, /listOf\("en","ru"\)/);
  assert.match(studio, /isSiteLocalAddress/);
  assert.match(studio, /maxChunks=360/);
  assert.match(studio, /maxSources=40/);
});


test("tablet breakpoint keeps navigation and active panels in separate grid columns", () => {
  const tablet = css.slice(css.lastIndexOf("@media(max-width:820px)"));
  assert.match(tablet, /grid-template-columns:\s*(?:190|200|210)px\s+minmax\(0,1fr\)/);
  assert.match(tablet, /#statusPanel[^}]*grid-column:\s*2/);
  assert.match(tablet, /\.control-deck[^}]*grid-column:\s*2/);
  assert.doesNotMatch(tablet, /#statusPanel,\.app-shell>\.control-deck\{grid-column:auto/);
});

test("headless snake training caps each main-thread batch and yields between batches", () => {
  assert.match(snake, /nnsBatch[^\n]{0,120}max="5000"/);
  assert.match(snake, /Math\.min\(5000,Math\.max\(100,Number\(\$\('nnsBatch'\)\.value\)\)\)/);
  assert.match(snake, /setTimeout\(\(\)=>tickHeadless\(token\),0\)/);
});
