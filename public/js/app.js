/**
 * PromptQuest — フロントエンドアプリケーションロジック
 *
 * - ビュー(ホーム/クエスト一覧/クエスト詳細/マイページ)の切り替え
 * - チャレンジの取得と表示
 * - プロンプト評価APIの呼び出しと結果表示
 * - 進捗(XP・履歴・バッジ)の localStorage 管理
 *
 * ユーザー入力やLLM応答は textContent 経由で描画し、XSS を防止する。
 */
(() => {
  'use strict';

  const PROGRESS_KEY = 'promptquest.progress';

  const state = {
    challenges: [],
    badges: [],
    activeQuest: null
  };

  /* ---------- 進捗の永続化 ---------- */
  function loadProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      const p = raw ? JSON.parse(raw) : null;
      return {
        xp: (p && p.xp) || 0,
        history: (p && Array.isArray(p.history)) ? p.history : {},
        log: (p && Array.isArray(p.log)) ? p.log : []
      };
    } catch (_e) {
      return { xp: 0, history: {}, log: [] };
    }
  }

  function saveProgress(p) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }

  let progress = loadProgress();

  /** 累計XPからレベルを算出（250XPごとに1レベル） */
  function levelFromXp(xp) {
    return Math.floor(xp / 250) + 1;
  }

  function clearedCount() {
    return Object.keys(progress.history).length;
  }

  /* ---------- DOM ヘルパー ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function el(tag, opts = {}, children = []) {
    const node = document.createElement(tag);
    if (opts.class) node.className = opts.class;
    if (opts.text != null) node.textContent = opts.text;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => node.setAttribute(k, v));
    if (opts.html != null) node.innerHTML = opts.html;
    (Array.isArray(children) ? children : [children]).forEach((c) => c && node.appendChild(c));
    return node;
  }

  let toastTimer;
  function toast(message, type = 'info') {
    const t = $('#toast');
    t.textContent = message;
    t.className = `toast toast-${type}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      t.hidden = true;
    }, 4000);
  }

  /* ---------- ナビゲーション ---------- */
  function showView(name) {
    $$('.view').forEach((v) => {
      v.hidden = v.id !== `view-${name}`;
    });
    $$('.nav-link').forEach((b) => {
      b.classList.toggle('active', b.getAttribute('data-nav') === name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'home') renderStats();
    if (name === 'quests') renderQuestList();
    if (name === 'myPage') renderMyPage();
  }

  /* ---------- レンダリング ---------- */
  function renderStats() {
    $$('[data-stat="level"]').forEach((n) => (n.textContent = levelFromXp(progress.xp)));
    $$('[data-stat="xp"]').forEach((n) => (n.textContent = progress.xp));
    $$('[data-stat="cleared"]').forEach((n) => (n.textContent = clearedCount()));
  }

  function renderQuestList() {
    const list = $('#quest-list');
    list.textContent = '';
    state.challenges.forEach((c) => {
      const isCleared = Boolean(progress.history[c.id]);
      const card = el('button', {
        class: `quest-card level-${c.level}`,
        attrs: { 'data-id': c.id, type: 'button' }
      });
      const top = el('div', { class: 'quest-card-top' }, [
        el('span', { class: `pill pill-${c.level}`, text: I18n.t(`quests.levels.${c.level}`) }),
        el('span', { class: 'quest-xp', text: `+${c.xp} ${I18n.t('quests.xpLabel')}` })
      ]);
      const category = el('span', { class: 'quest-category', text: c.category });
      const title = el('h3', { class: 'quest-title', text: c.title });
      const scenario = el('p', { class: 'quest-snippet', text: c.scenario });
      const foot = el('div', { class: 'quest-card-foot' }, [
        el('span', {
          class: 'quest-status',
          text: isCleared ? `✓ ${I18n.t('quests.cleared')}` : I18n.t('quests.start')
        })
      ]);
      if (isCleared) card.classList.add('is-cleared');
      card.append(top, category, title, scenario, foot);
      card.addEventListener('click', () => openQuest(c.id));
      list.appendChild(card);
    });
  }

  function openQuest(id) {
    const c = state.challenges.find((q) => q.id === id);
    if (!c) return;
    state.activeQuest = c;
    const root = $('#quest-detail');
    root.textContent = '';

    const header = el('div', { class: 'quest-detail-head' }, [
      el('span', { class: `pill pill-${c.level}`, text: I18n.t(`quests.levels.${c.level}`) }),
      el('span', { class: 'quest-category', text: c.category })
    ]);
    const title = el('h2', { class: 'quest-detail-title', text: c.title });

    const scenario = el('div', { class: 'field-block' }, [
      el('h4', { text: I18n.t('quest.scenario') }),
      el('p', { text: c.scenario })
    ]);
    const goal = el('div', { class: 'field-block' }, [
      el('h4', { text: I18n.t('quest.goal') }),
      el('p', { text: c.goal })
    ]);
    const criteriaList = el('ul', { class: 'criteria' });
    (c.criteria || []).forEach((cr) => criteriaList.appendChild(el('li', { text: cr })));
    const criteria = el('div', { class: 'field-block' }, [
      el('h4', { text: I18n.t('quest.criteria') }),
      criteriaList
    ]);

    const textarea = el('textarea', {
      class: 'prompt-input',
      attrs: {
        id: 'prompt-input',
        rows: '6',
        placeholder: I18n.t('quest.placeholder'),
        'aria-label': I18n.t('quest.yourPrompt')
      }
    });

    const submit = el('button', {
      class: 'btn btn-primary',
      attrs: { id: 'submit-prompt', type: 'button' },
      text: I18n.t('quest.submit')
    });
    const clear = el('button', {
      class: 'btn btn-ghost',
      attrs: { type: 'button' },
      text: I18n.t('quest.clear')
    });
    clear.addEventListener('click', () => {
      textarea.value = '';
      textarea.focus();
    });
    submit.addEventListener('click', () => submitPrompt(c, textarea, submit));

    const actions = el('div', { class: 'quest-actions' }, [submit, clear]);
    const inputBlock = el('div', { class: 'field-block' }, [
      el('h4', { text: I18n.t('quest.yourPrompt') }),
      textarea,
      actions
    ]);

    const resultBox = el('div', { class: 'result-box', attrs: { id: 'result-box' }, });
    resultBox.hidden = true;

    root.append(header, title, scenario, goal, criteria, inputBlock, resultBox);
    showView('quest');
  }

  async function submitPrompt(challenge, textarea, submitBtn) {
    const prompt = textarea.value.trim();
    if (!prompt) {
      toast(I18n.t('errors.empty'), 'error');
      textarea.focus();
      return;
    }
    submitBtn.disabled = true;
    submitBtn.classList.add('is-loading');
    const original = submitBtn.textContent;
    submitBtn.textContent = I18n.t('quest.evaluating');

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: challenge.id, prompt, lang: I18n.lang })
      });
      const data = await res.json();
      if (!res.ok) {
        const key = data && data.error ? `errors.${data.error}` : 'errors.generic';
        const msg = I18n.t(key);
        toast(typeof msg === 'string' && msg !== key ? msg : I18n.t('errors.generic'), 'error');
        return;
      }
      applyResult(challenge, data);
    } catch (_e) {
      toast(I18n.t('errors.generic'), 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('is-loading');
      submitBtn.textContent = original;
    }
  }

  function applyResult(challenge, data) {
    // 進捗を更新（そのクエストのベストスコアを保持）
    const prevBadgeLevel = highestBadge(progress.xp);
    const prev = progress.history[challenge.id];
    const prevXp = prev ? prev.earnedXp : 0;
    if (data.earnedXp > prevXp) {
      progress.xp += data.earnedXp - prevXp;
    }
    progress.history[challenge.id] = {
      score: data.score,
      earnedXp: data.earnedXp,
      title: challenge.title,
      at: Date.now()
    };
    progress.log.unshift({
      id: challenge.id,
      title: challenge.title,
      score: data.score,
      earnedXp: data.earnedXp,
      at: Date.now()
    });
    progress.log = progress.log.slice(0, 30);
    saveProgress(progress);

    renderResult(challenge, data);
    renderStats();

    const newBadge = highestBadge(progress.xp);
    if (newBadge && (!prevBadgeLevel || newBadge.id !== prevBadgeLevel.id)) {
      toast(`${I18n.t('result.newBadge')} ${newBadge.icon} ${newBadge.name}`, 'success');
    }
  }

  function renderResult(challenge, data) {
    const box = $('#result-box');
    box.textContent = '';
    box.hidden = false;

    const scoreClass = data.score >= 80 ? 'high' : data.score >= 50 ? 'mid' : 'low';
    const ring = el('div', { class: `score-ring score-${scoreClass}` }, [
      el('span', { class: 'score-num', text: String(data.score) }),
      el('span', { class: 'score-max', text: '/100' })
    ]);
    ring.style.setProperty('--pct', `${(data.score / 100) * 360}deg`);
    const heading = el('div', { class: 'result-head' }, [
      el('h3', { text: I18n.t('result.heading') }),
      el('span', { class: 'xp-earned', text: `+${data.earnedXp} ${I18n.t('result.earnedXp')}` })
    ]);

    const verdict = el('p', { class: 'verdict', text: data.verdict });

    const strengths = buildList(I18n.t('result.strengths'), data.strengths, 'good');
    const improvements = buildList(I18n.t('result.improvements'), data.improvements, 'warn');

    const sample = el('div', { class: 'field-block sample-block' }, [
      el('h4', { text: I18n.t('result.sampleAnswer') }),
      el('pre', { class: 'sample-answer', text: data.sampleAnswer || '' })
    ]);

    const retry = el('button', {
      class: 'btn btn-ghost',
      attrs: { type: 'button' },
      text: I18n.t('result.retry')
    });
    retry.addEventListener('click', () => {
      box.hidden = true;
      $('#prompt-input').focus();
    });
    const actions = el('div', { class: 'quest-actions' }, [retry]);

    box.append(heading, el('div', { class: 'score-row' }, [ring, verdict]), strengths, improvements, sample, actions);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function buildList(title, items, variant) {
    const ul = el('ul', { class: `feedback-list feedback-${variant}` });
    (items || []).forEach((it) => ul.appendChild(el('li', { text: it })));
    return el('div', { class: 'field-block' }, [el('h4', { text: title }), ul]);
  }

  /* ---------- バッジ ---------- */
  function highestBadge(xp) {
    let best = null;
    state.badges.forEach((b) => {
      if (xp >= b.threshold && (!best || b.threshold >= best.threshold)) best = b;
    });
    return best;
  }

  function renderMyPage() {
    // バッジ
    const badgeRoot = $('#badge-list');
    badgeRoot.textContent = '';
    state.badges.forEach((b) => {
      const earned = progress.xp >= b.threshold;
      const item = el('div', { class: `badge ${earned ? 'earned' : 'locked'}` }, [
        el('span', { class: 'badge-icon', text: earned ? b.icon : '🔒' }),
        el('span', { class: 'badge-name', text: b.name }),
        el('span', { class: 'badge-th', text: `${b.threshold} XP` })
      ]);
      badgeRoot.appendChild(item);
    });

    // 履歴
    const histRoot = $('#history-list');
    histRoot.textContent = '';
    if (!progress.log.length) {
      histRoot.appendChild(el('p', { class: 'empty', text: I18n.t('myPage.noHistory') }));
      return;
    }
    progress.log.forEach((h) => {
      const date = new Date(h.at).toLocaleString(I18n.lang === 'en' ? 'en-US' : 'ja-JP');
      const row = el('div', { class: 'history-row' }, [
        el('span', { class: 'history-title', text: h.title }),
        el('span', { class: 'history-score', text: `${h.score}/100` }),
        el('span', { class: 'history-xp', text: `+${h.earnedXp} XP` }),
        el('span', { class: 'history-date', text: date })
      ]);
      histRoot.appendChild(row);
    });
  }

  /* ---------- 初期化 ---------- */
  async function fetchData() {
    const [challenges, badges] = await Promise.all([
      fetch(`/api/challenges?lang=${I18n.lang}`).then((r) => r.json()),
      fetch(`/api/badges?lang=${I18n.lang}`).then((r) => r.json())
    ]);
    state.challenges = challenges;
    state.badges = badges;
  }

  function bindEvents() {
    // ナビゲーション
    $$('[data-nav]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        showView(btn.getAttribute('data-nav'));
      });
    });

    // 言語切替
    $$('.lang-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const lang = btn.getAttribute('data-lang');
        if (lang === I18n.lang) return;
        await I18n.load(lang);
        updateLangButtons();
        await fetchData();
        // 現在のビューを再描画
        const active = $$('.view').find((v) => !v.hidden);
        const name = active ? active.id.replace('view-', '') : 'home';
        if (name === 'quest' && state.activeQuest) {
          openQuest(state.activeQuest.id);
        } else {
          showView(name);
        }
      });
    });

    // 進捗リセット
    $('#reset-btn').addEventListener('click', () => {
      if (confirm(I18n.t('myPage.resetConfirm'))) {
        progress = { xp: 0, history: {}, log: [] };
        saveProgress(progress);
        renderMyPage();
        renderStats();
      }
    });
  }

  function updateLangButtons() {
    $$('.lang-btn').forEach((b) => {
      const pressed = b.getAttribute('data-lang') === I18n.lang;
      b.setAttribute('aria-pressed', String(pressed));
      b.classList.toggle('active', pressed);
    });
  }

  async function init() {
    await I18n.load(I18n.lang);
    updateLangButtons();
    await fetchData();
    bindEvents();
    showView('home');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
