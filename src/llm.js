/**
 * GitHub Models を用いた LLM プロンプト評価クライアント。
 *
 * Mock ではなく、実際に GitHub Models の推論エンドポイントを呼び出す。
 * 認証には環境変数 GITHUB_TOKEN (models:read 権限) を使用する。
 */

const DEFAULT_ENDPOINT = 'https://models.github.ai/inference/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

/** GitHub Models の設定が有効かどうか（トークンが設定されているか）を返す。 */
function isConfigured() {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim());
}

/**
 * LLM に対して chat completion をリクエストする低レベル関数。
 * @param {Array<{role:string, content:string}>} messages
 * @param {object} [options]
 * @returns {Promise<string>} アシスタントの応答テキスト
 */
async function chat(messages, options = {}) {
  if (!isConfigured()) {
    throw new Error(
      'GITHUB_TOKEN が設定されていません。.env にトークンを設定してください。 / GITHUB_TOKEN is not set. Please configure it in .env.'
    );
  }

  const endpoint = process.env.GITHUB_MODELS_ENDPOINT || DEFAULT_ENDPOINT;
  const model = process.env.GITHUB_MODELS_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs || 30000);

  let response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + process.env.GITHUB_TOKEN
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        response_format: options.responseFormat
      }),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`GitHub Models API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM から有効な応答が得られませんでした。 / No valid response from the LLM.');
  }
  return content;
}

/**
 * 応答テキストから JSON を抽出してパースする。
 * ```json ... ``` のコードフェンスや前後の余分なテキストにも耐性を持たせる。
 */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('LLM 応答から JSON を抽出できませんでした。');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

/**
 * ユーザーのプロンプトを課題に照らして LLM に評価させる。
 * @param {object} challenge - challenges.js の 1 要素（両言語データを含む）
 * @param {string} userPrompt - ユーザーが入力したプロンプト
 * @param {string} lang - 'ja' | 'en'
 * @returns {Promise<{score:number, verdict:string, strengths:string[], improvements:string[], sampleAnswer:string}>}
 */
async function evaluatePrompt(challenge, userPrompt, lang) {
  const l = lang === 'en' ? 'en' : 'ja';
  const c = challenge[l];
  const languageName = l === 'en' ? 'English' : 'Japanese (日本語)';

  const systemMessage = {
    role: 'system',
    content:
      'You are an expert prompt-engineering coach who evaluates prompts written by software engineers. ' +
      'You give fair, encouraging, and concrete feedback. ' +
      `Always write every string value in your response in ${languageName}. ` +
      'Respond ONLY with a valid JSON object, no markdown, matching this schema: ' +
      '{"score": number (0-100), "verdict": string (one short sentence), ' +
      '"strengths": string[] (1-3 items), "improvements": string[] (1-3 items), ' +
      '"sampleAnswer": string (an improved example prompt)}.'
  };

  const userMessage = {
    role: 'user',
    content:
      `# Challenge title\n${c.title}\n\n` +
      `# Scenario\n${c.scenario}\n\n` +
      `# Goal\n${c.goal}\n\n` +
      `# Evaluation criteria\n- ${c.criteria.join('\n- ')}\n\n` +
      `# The engineer's prompt to evaluate\n"""\n${userPrompt}\n"""\n\n` +
      'Evaluate how well the prompt achieves the goal against the criteria, then return the JSON.'
  };

  const raw = await chat([systemMessage, userMessage], { temperature: 0.2 });
  const parsed = extractJson(raw);

  // 値の正規化と防御的な既定値
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  return {
    score,
    verdict: String(parsed.verdict || ''),
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
    improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : [],
    sampleAnswer: String(parsed.sampleAnswer || '')
  };
}

module.exports = { isConfigured, chat, evaluatePrompt, extractJson, DEFAULT_ENDPOINT, DEFAULT_MODEL };
