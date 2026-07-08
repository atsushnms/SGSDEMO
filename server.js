/**
 * PromptQuest — サーバーエントリーポイント
 *
 * Node.js + Express による軽量 API サーバー。
 * - 静的ファイル(public/)の配信
 * - チャレンジ一覧 / 多言語リソースの提供
 * - GitHub Models を用いたプロンプト評価 API
 *
 * プロトタイプのためユーザー認証は不要。進捗はクライアント側(localStorage)で管理する。
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');

const { getChallenges, getChallengeById, badges } = require('./src/challenges');
const llm = require('./src/llm');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// 多言語リソースを起動時に読み込む
const locales = {
  ja: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'ja.json'), 'utf8')),
  en: JSON.parse(fs.readFileSync(path.join(__dirname, 'locales', 'en.json'), 'utf8'))
};

function normalizeLang(lang) {
  return lang === 'en' ? 'en' : 'ja';
}

/** 指定言語の UI 翻訳リソースを返す */
app.get('/api/i18n/:lang', (req, res) => {
  const lang = normalizeLang(req.params.lang);
  res.json(locales[lang]);
});

/** 指定言語のバッジ定義を返す */
app.get('/api/badges', (req, res) => {
  const lang = normalizeLang(req.query.lang);
  res.json(
    badges.map((b) => ({ id: b.id, threshold: b.threshold, ...b[lang] }))
  );
});

/** 指定言語のチャレンジ一覧を返す */
app.get('/api/challenges', (req, res) => {
  const lang = normalizeLang(req.query.lang);
  res.json(getChallenges(lang));
});

/** LLM が利用可能か（トークン設定済みか）を返す */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', llmConfigured: llm.isConfigured() });
});

/** プロンプト評価エンドポイント */
app.post('/api/evaluate', async (req, res) => {
  const { challengeId, prompt } = req.body || {};
  const lang = normalizeLang(req.body && req.body.lang);

  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'empty' });
  }

  const challenge = getChallengeById(challengeId);
  if (!challenge) {
    return res.status(404).json({ error: 'challenge_not_found' });
  }

  if (!llm.isConfigured()) {
    return res.status(503).json({ error: 'notConfigured' });
  }

  try {
    const evaluation = await llm.evaluatePrompt(challenge, prompt.trim(), lang);
    // スコアに応じて獲得XPを算出（満点でチャレンジのXP、比例配分）
    const earnedXp = Math.round((evaluation.score / 100) * challenge.xp);
    res.json({ ...evaluation, earnedXp, maxXp: challenge.xp });
  } catch (err) {
    console.error('[evaluate] error:', err.message);
    res.status(502).json({ error: 'generic', detail: err.message });
  }
});

// SPA フォールバック: 未知のGETは index.html を返す
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// テスト時などにインポートできるよう、直接実行時のみ listen する
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n  🎮 PromptQuest running at http://localhost:${PORT}`);
    if (!llm.isConfigured()) {
      console.warn(
        '  ⚠  GITHUB_TOKEN が未設定です。プロンプト評価を使うには .env にトークンを設定してください。'
      );
    }
  });
}

module.exports = app;
