/**
 * PromptQuest の基本的な結合テスト。
 * Node.js 標準の test runner (node --test) を使用する。
 * 外部 LLM は呼び出さない（トークン未設定時の挙動と、公開APIの整合性を検証）。
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { getChallenges, getChallengeById } = require('../src/challenges');
const llm = require('../src/llm');
const app = require('../server');

let server;
let baseUrl;

before(async () => {
  // トークン未設定状態を保証（LLM を実呼び出ししない）
  delete process.env.GITHUB_TOKEN;
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(() => {
  server && server.close();
});

test('getChallenges はデフォルトで日本語の一覧を返す', () => {
  const ja = getChallenges('ja');
  assert.ok(Array.isArray(ja) && ja.length > 0);
  assert.ok(ja[0].title && ja[0].scenario && Array.isArray(ja[0].criteria));
});

test('getChallenges は英語ローカライズを返す', () => {
  const en = getChallenges('en');
  const ja = getChallenges('ja');
  assert.equal(en.length, ja.length);
  assert.notEqual(en[0].title, ja[0].title);
});

test('getChallengeById は両言語データを保持する', () => {
  const c = getChallengeById('summarize-log');
  assert.ok(c && c.ja && c.en);
});

test('extractJson はコードフェンス付きJSONを解析する', () => {
  const parsed = llm.extractJson('前置き\n```json\n{"score": 88}\n```\n後置き');
  assert.equal(parsed.score, 88);
});

test('GET /api/challenges は言語指定で一覧を返す', async () => {
  const res = await fetch(`${baseUrl}/api/challenges?lang=en`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body) && body.length > 0);
});

test('GET /api/i18n/ja は日本語リソースを返す', async () => {
  const res = await fetch(`${baseUrl}/api/i18n/ja`);
  const body = await res.json();
  assert.equal(body.meta.lang, 'ja');
});

test('GET /api/health は llmConfigured=false を返す（トークン未設定）', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  const body = await res.json();
  assert.equal(body.llmConfigured, false);
});

test('POST /api/evaluate は空プロンプトを 400 で拒否する', async () => {
  const res = await fetch(`${baseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: 'summarize-log', prompt: '   ' })
  });
  assert.equal(res.status, 400);
});

test('POST /api/evaluate はトークン未設定時 503 を返す', async () => {
  const res = await fetch(`${baseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: 'summarize-log', prompt: '有効なプロンプト' })
  });
  assert.equal(res.status, 503);
  const body = await res.json();
  assert.equal(body.error, 'notConfigured');
});

test('POST /api/evaluate は未知のチャレンジを 404 で拒否する', async () => {
  const res = await fetch(`${baseUrl}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: 'nope', prompt: 'x' })
  });
  assert.equal(res.status, 404);
});
