/**
 * チャレンジ（クエスト）データ定義
 * 各チャレンジは初級〜上級の難易度に分かれており、
 * ユーザーはプロンプトを作成して LLM に採点してもらう。
 *
 * 課題文・シナリオ・評価基準は日本語(ja)/英語(en)の両方を持つ。
 */

const challenges = [
  {
    id: 'summarize-log',
    level: 'beginner',
    xp: 100,
    ja: {
      title: 'ログ要約クエスト',
      category: '実務シナリオ',
      scenario:
        '大量のアプリケーションログから重要な情報を抜き出して要約するプロンプトを作成してください。エラーの原因と対応の優先度が一目でわかるようにするのが目標です。',
      goal: 'ログを「概要・重大なエラー・推奨アクション」の3項目で構造化して要約させるプロンプトを書く。',
      criteria: [
        '出力フォーマットを明確に指定しているか',
        '要約の観点（エラー・優先度）を指示しているか',
        '簡潔で曖昧さのない指示になっているか'
      ]
    },
    en: {
      title: 'Log Summary Quest',
      category: 'Real-world Scenario',
      scenario:
        'Create a prompt that extracts key information from a large volume of application logs and summarizes it. The goal is to make the root cause of errors and their priority obvious at a glance.',
      goal: 'Write a prompt that summarizes logs into three structured sections: Overview, Critical Errors, and Recommended Actions.',
      criteria: [
        'Does it clearly specify the output format?',
        'Does it instruct which aspects to summarize (errors, priority)?',
        'Is the instruction concise and unambiguous?'
      ]
    }
  },
  {
    id: 'client-requirements',
    level: 'intermediate',
    xp: 150,
    ja: {
      title: 'クライアント要件整理ミッション',
      category: '実務シナリオ',
      scenario:
        '顧客との打ち合わせメモは断片的で情報が散らばっています。これを整理して開発チームが使える要件一覧に変換するプロンプトを作成してください。',
      goal: '曖昧なメモから「機能要件・非機能要件・不明点/確認事項」を抽出・分類させるプロンプトを書く。',
      criteria: [
        '入力（メモ）と出力（分類された要件）の関係を明確にしているか',
        '不明点を洗い出す指示を含めているか',
        '実務で使える具体的なフォーマットを指定しているか'
      ]
    },
    en: {
      title: 'Client Requirements Mission',
      category: 'Real-world Scenario',
      scenario:
        'Meeting notes with a client are fragmented and scattered. Create a prompt that organizes them into a requirements list the development team can actually use.',
      goal: 'Write a prompt that extracts and classifies notes into Functional Requirements, Non-functional Requirements, and Open Questions.',
      criteria: [
        'Does it clarify the relationship between input (notes) and output (classified requirements)?',
        'Does it include an instruction to surface open questions?',
        'Does it specify a concrete, usable output format?'
      ]
    }
  },
  {
    id: 'code-review',
    level: 'intermediate',
    xp: 150,
    ja: {
      title: 'コードレビュー自動化チャレンジ',
      category: '開発効率化',
      scenario:
        'プルリクエストのコードレビューを支援するプロンプトを作成してください。バグ・セキュリティ・可読性の観点で建設的なフィードバックを返させたいです。',
      goal: 'コード断片を受け取り、観点別に問題点と改善案を提示させるプロンプトを書く。',
      criteria: [
        'レビューの観点（バグ・セキュリティ・可読性等）を明示しているか',
        '改善案まで求めているか',
        '出力の構造（観点ごと）を指定しているか'
      ]
    },
    en: {
      title: 'Automated Code Review Challenge',
      category: 'Developer Productivity',
      scenario:
        'Create a prompt that assists with pull request code reviews. You want constructive feedback covering bugs, security, and readability.',
      goal: 'Write a prompt that takes a code snippet and returns issues and improvement suggestions grouped by aspect.',
      criteria: [
        'Does it specify review aspects (bugs, security, readability, etc.)?',
        'Does it also ask for improvement suggestions?',
        'Does it define the output structure (per aspect)?'
      ]
    }
  },
  {
    id: 'persona-explain',
    level: 'beginner',
    xp: 100,
    ja: {
      title: 'ペルソナ指定入門',
      category: 'プロンプト基礎',
      scenario:
        '同じ技術概念でも、相手によって説明の仕方を変える必要があります。AIに役割（ペルソナ）を与えて説明させるプロンプトを作成してください。',
      goal: '「非エンジニアの経営層」向けにマイクロサービスを説明させるプロンプトを、役割・対象・トーンを指定して書く。',
      criteria: [
        'AIに与える役割（ペルソナ）を指定しているか',
        '対象読者とトーンを指定しているか',
        '専門用語の扱いについて指示しているか'
      ]
    },
    en: {
      title: 'Persona Prompting Basics',
      category: 'Prompt Fundamentals',
      scenario:
        'The same technical concept must be explained differently depending on the audience. Create a prompt that assigns the AI a role (persona) to tailor its explanation.',
      goal: 'Write a prompt that explains microservices to "non-technical executives", specifying the role, audience, and tone.',
      criteria: [
        'Does it assign a role (persona) to the AI?',
        'Does it specify the target audience and tone?',
        'Does it instruct how to handle technical jargon?'
      ]
    }
  },
  {
    id: 'chain-of-thought',
    level: 'advanced',
    xp: 200,
    ja: {
      title: '段階的推論マスター',
      category: '高度なテクニック',
      scenario:
        '複雑な技術的意思決定（例：データベース選定）をAIに支援させたいです。結論だけでなく、根拠を段階的に示させる高度なプロンプトを作成してください。',
      goal: '要件を踏まえて選択肢を比較し、段階的な推論を経て推奨案を提示させるプロンプトを書く。',
      criteria: [
        '段階的に考えさせる（思考プロセスを明示させる）指示があるか',
        '比較の評価軸を指定しているか',
        '最終的な推奨と根拠を求めているか'
      ]
    },
    en: {
      title: 'Step-by-step Reasoning Master',
      category: 'Advanced Techniques',
      scenario:
        'You want the AI to assist with a complex technical decision (e.g., database selection). Create an advanced prompt that shows reasoning step by step, not just the conclusion.',
      goal: 'Write a prompt that compares options against requirements and reaches a recommendation through explicit step-by-step reasoning.',
      criteria: [
        'Does it instruct the model to reason step by step (show its thinking)?',
        'Does it specify the evaluation criteria for comparison?',
        'Does it ask for a final recommendation with justification?'
      ]
    }
  }
];

/** バッジ定義: 累計XPに応じて付与される */
const badges = [
  { id: 'novice', threshold: 0, ja: { name: 'プロンプト見習い', icon: '🌱' }, en: { name: 'Prompt Novice', icon: '🌱' } },
  { id: 'apprentice', threshold: 200, ja: { name: 'プロンプト職人', icon: '⚙️' }, en: { name: 'Prompt Apprentice', icon: '⚙️' } },
  { id: 'expert', threshold: 500, ja: { name: 'プロンプトエキスパート', icon: '🚀' }, en: { name: 'Prompt Expert', icon: '🚀' } },
  { id: 'master', threshold: 800, ja: { name: 'プロンプトマスター', icon: '👑' }, en: { name: 'Prompt Master', icon: '👑' } }
];

/**
 * 指定した言語のチャレンジ一覧を返す（LLM の評価基準など内部情報も含めて返すが、
 * criteria は学習のヒントとして表示してよい）。
 * @param {string} lang - 'ja' | 'en'
 */
function getChallenges(lang) {
  const l = lang === 'en' ? 'en' : 'ja';
  return challenges.map((c) => ({
    id: c.id,
    level: c.level,
    xp: c.xp,
    ...c[l]
  }));
}

/** id からチャレンジ本体を取得する（見つからなければ undefined） */
function getChallengeById(id) {
  return challenges.find((c) => c.id === id);
}

module.exports = { challenges, badges, getChallenges, getChallengeById };
