/**
 * i18n (国際化) ヘルパー。
 * 言語リソースをサーバーから取得し、data-i18n 属性を持つ要素へ適用する。
 * デフォルト言語は日本語(ja)。選択は localStorage に保存する。
 */
const I18n = (() => {
  const STORAGE_KEY = 'promptquest.lang';
  let current = localStorage.getItem(STORAGE_KEY) || 'ja';
  let dict = {};
  const listeners = [];

  /** ドット区切りキーで辞書から値を取得する */
  function t(key) {
    return key.split('.').reduce((obj, k) => (obj && obj[k] != null ? obj[k] : null), dict) ?? key;
  }

  /** DOM 内の data-i18n 要素を翻訳で更新する */
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach((el) => {
      const value = t(el.getAttribute('data-i18n'));
      if (typeof value === 'string') el.textContent = value;
    });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const value = t(el.getAttribute('data-i18n-placeholder'));
      if (typeof value === 'string') el.setAttribute('placeholder', value);
    });
  }

  /** 言語リソースを読み込む */
  async function load(lang) {
    const res = await fetch(`/api/i18n/${lang}`);
    dict = await res.json();
    current = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    apply();
    listeners.forEach((fn) => fn(lang));
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  return {
    get lang() {
      return current;
    },
    t,
    apply,
    load,
    onChange
  };
})();
