// translator.js
const { translate: googleApiTranslate } = require('google-translate-api-x');

/* ============================================================
 * 错误类型 & 错误描述（供前端展示）
 * ============================================================ */
const ERROR_TYPES = {
  NETWORK: 'NETWORK',
  RATE_LIMIT: 'RATE_LIMIT',
  QUOTA: 'QUOTA',
  TEXT_TOO_LONG: 'TEXT_TOO_LONG',
  EMPTY_RESULT: 'EMPTY_RESULT',
  PARSE_ERROR: 'PARSE_ERROR',
  UNSUPPORTED_LANG: 'UNSUPPORTED_LANG',
  UNKNOWN: 'UNKNOWN'
};

const ERROR_DESCRIPTIONS = {
  NETWORK: '网络连接失败或请求超时',
  RATE_LIMIT: '请求过于频繁，被服务商限流',
  QUOTA: '该服务商免费额度已耗尽或需要API Key',
  TEXT_TOO_LONG: '文本过长，分段后仍无法翻译',
  EMPTY_RESULT: '服务商返回空结果',
  PARSE_ERROR: '服务商响应无法解析',
  UNSUPPORTED_LANG: '该服务商不支持此语言对',
  UNKNOWN: '未知错误'
};

class TranslationError extends Error {
  constructor(type, provider, message, raw) {
    super(message);
    this.name = 'TranslationError';
    this.type = type;
    this.provider = provider;
    this.raw = raw;
  }
  toJSON() {
    return { type: this.type, provider: this.provider, message: this.message };
  }
}

function describeError(err) {
  if (!err) return '未知错误';
  const base = ERROR_DESCRIPTIONS[err.type] || '未知错误';
  if (Array.isArray(err.errors) && err.errors.length) {
    return base + '（各服务商：' + err.errors.map(e => `${e.provider}→${ERROR_DESCRIPTIONS[e.type] || e.type}`).join('，') + '）';
  }
  return err.provider ? `${base} [${err.provider}]` : base;
}

/* ============================================================
 * 通用超时 fetch
 * ============================================================ */
const DEFAULT_TIMEOUT = 8000;

async function fetchWithTimeout(url, options = {}, timeout = DEFAULT_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new TranslationError(ERROR_TYPES.NETWORK, 'fetch', `请求超时（${timeout}ms）`);
    }
    throw new TranslationError(ERROR_TYPES.NETWORK, 'fetch', '网络错误: ' + e.message);
  } finally {
    clearTimeout(timer);
  }
}

/* ============================================================
 * 按 UTF-8 字节分段（MyMemory 单次 500 字节限制）
 * ============================================================ */
function splitByUtf8Bytes(text, maxBytes) {
  const chunks = [];
  let current = '';
  let currentBytes = 0;
  for (const char of text) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    if (currentBytes + charBytes > maxBytes && current) {
      chunks.push(current);
      current = char;
      currentBytes = charBytes;
    } else {
      current += char;
      currentBytes += charBytes;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/* ============================================================
 * 各服务商适配器
 * ============================================================ */

// 1) Google（修复了 zh 不支持的问题）
async function googleTranslate(text, targetLang, sourceLang = 'auto') {
  try {
    const opts = { to: targetLang };
    if (sourceLang && sourceLang !== 'auto') {
      opts.from = sourceLang;
      opts.forceFrom = true; // 关键修复：强制使用指定的源语言，绕过库的校验
    }
    const res = await googleApiTranslate(text, opts);
    const out = (res && res.text) || '';
    if (!String(out).trim()) {
      throw new TranslationError(ERROR_TYPES.EMPTY_RESULT, 'google', 'Google 返回空结果');
    }
    return out;
  } catch (e) {
    if (e instanceof TranslationError) throw e;
    const msg = String((e && e.message) || e);
    if (/too many|429|rate limit/i.test(msg)) {
      throw new TranslationError(ERROR_TYPES.RATE_LIMIT, 'google', msg);
    }
    if (/forbidden|403|blocked/i.test(msg)) {
      throw new TranslationError(ERROR_TYPES.QUOTA, 'google', msg);
    }
    if (/not supported|invalid.*lang/i.test(msg)) {
      throw new TranslationError(ERROR_TYPES.UNSUPPORTED_LANG, 'google', msg);
    }
    throw new TranslationError(ERROR_TYPES.UNKNOWN, 'google', msg);
  }
}

// 2) MyMemory（修复了中文源语言导致的空结果问题）
const MYMEMORY_MAX_BYTES = 480;

async function mymemoryTranslate(text, targetLang, sourceLang = 'auto') {
  const src = (!sourceLang || sourceLang === 'auto') ? 'Autodetect' : sourceLang;
  
  // 关键修复：MyMemory 对中文源语言支持极差，直接拦截，让轮询器跳过它
  if (src.startsWith('zh') || (src === 'Autodetect' && /[\u4e00-\u9fa5]/.test(text))) {
    throw new TranslationError(ERROR_TYPES.UNSUPPORTED_LANG, 'mymemory', 'MyMemory 不支持中文源语言');
  }

  const chunks = splitByUtf8Bytes(String(text), MYMEMORY_MAX_BYTES);
  const parts = [];
  for (const chunk of chunks) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${encodeURIComponent(src)}|${encodeURIComponent(targetLang)}`;
    const res = await fetchWithTimeout(url);
    if (res.status === 429) {
      throw new TranslationError(ERROR_TYPES.RATE_LIMIT, 'mymemory', 'MyMemory 限流 (429)');
    }
    if (res.status === 403 || res.status === 402) {
      throw new TranslationError(ERROR_TYPES.QUOTA, 'mymemory', `MyMemory 配额耗尽 (${res.status})`);
    }
    if (!res.ok) {
      throw new TranslationError(ERROR_TYPES.UNKNOWN, 'mymemory', 'HTTP ' + res.status);
    }
    let data;
    try {
      data = await res.json();
    } catch (_) {
      throw new TranslationError(ERROR_TYPES.PARSE_ERROR, 'mymemory', '响应不是合法 JSON');
    }
    if (String(data.responseStatus) !== '200') {
      const details = String(data.responseDetails || '');
      if (/quota|limit|exceed|too many|invalid.*lang/i.test(details)) {
        const type = /quota|limit|exceed|too many/i.test(details) ? ERROR_TYPES.QUOTA : ERROR_TYPES.UNSUPPORTED_LANG;
        throw new TranslationError(type, 'mymemory', details || ('状态 ' + data.responseStatus));
      }
      throw new TranslationError(ERROR_TYPES.UNKNOWN, 'mymemory', details || ('状态 ' + data.responseStatus));
    }
    const out = data.responseData && data.responseData.translatedText;
    if (!out || !String(out).trim()) {
      throw new TranslationError(ERROR_TYPES.EMPTY_RESULT, 'mymemory', '返回空结果');
    }
    parts.push(out);
  }
  return parts.join('');
}

// 3) LibreTranslate（修复了官方接口需要 API Key 的问题，增加多节点轮询）
const LIBRE_ENDPOINTS = [
  'https://translate.argosopentech.com', // 社区维护的免费实例
  'https://libretranslate.de',           // 历史公共实例
  'https://libretranslate.com'           // 官方（目前可能强制要求 Key）
];

async function libreTranslate(text, targetLang, sourceLang = 'auto') {
  const src = (!sourceLang || sourceLang === 'auto') ? 'auto' : sourceLang;
  let lastErr = null;

  for (const base of LIBRE_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(base + '/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: String(text), source: src, target: targetLang, format: 'html' })
      });

      if (res.status === 400) {
        const errorText = await res.text();
        if (errorText.includes('api key') || errorText.includes('portal.libretranslate.com')) {
          lastErr = new TranslationError(ERROR_TYPES.QUOTA, 'libretranslate', `${base} 需要 API Key`);
          continue;
        }
      }
      if (res.status === 429) {
        lastErr = new TranslationError(ERROR_TYPES.RATE_LIMIT, 'libretranslate', `${base} 限流`);
        continue;
      }
      if (res.status === 403 || res.status === 402) {
        lastErr = new TranslationError(ERROR_TYPES.QUOTA, 'libretranslate', `${base} 配额/鉴权失败`);
        continue;
      }
      if (!res.ok) {
        lastErr = new TranslationError(ERROR_TYPES.UNKNOWN, 'libretranslate', `${base} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (data.error) {
        lastErr = new TranslationError(ERROR_TYPES.UNKNOWN, 'libretranslate', `${base} 返回错误: ${data.error}`);
        continue;
      }
      const out = data.translatedText;
      if (!out || !String(out).trim()) {
        lastErr = new TranslationError(ERROR_TYPES.EMPTY_RESULT, 'libretranslate', `${base} 返回空结果`);
        continue;
      }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new TranslationError(ERROR_TYPES.UNKNOWN, 'libretranslate', '所有 LibreTranslate 实例均失败');
}

// 4) Lingva（扩充了可用实例列表，增加容错）
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://translate.plausibility.cloud',
  'https://lingva.lunar.icu',
  'https://translate.igna.wtf',
  'https://translate.projectsegfau.lt',
  'https://translate.dr460nf1r3.org',
  'https://lingva.garudalinux.org',
  'https://translate.jae.fi'
];

async function lingvaTranslate(text, targetLang, sourceLang = 'auto') {
  const src = (!sourceLang || sourceLang === 'auto') ? 'auto' : sourceLang;
  const shuffled = [...LINGVA_INSTANCES].sort(() => Math.random() - 0.5);
  let lastErr = null;
  
  for (const base of shuffled) {
    try {
      const url = `${base}/api/v1/${src}/${targetLang}/${encodeURIComponent(String(text))}`;
      const res = await fetchWithTimeout(url, {}, 6000);
      
      if (res.status === 429) {
        lastErr = new TranslationError(ERROR_TYPES.RATE_LIMIT, 'lingva', `${base} 限流`);
        continue;
      }
      if (!res.ok) {
        lastErr = new TranslationError(ERROR_TYPES.UNKNOWN, 'lingva', `${base} HTTP ${res.status}`);
        continue;
      }
      let data;
      try {
        data = await res.json();
      } catch (_) {
        lastErr = new TranslationError(ERROR_TYPES.PARSE_ERROR, 'lingva', `${base} 响应不是合法 JSON`);
        continue;
      }
      const out = data && data.translation;
      if (!out || !String(out).trim()) {
        lastErr = new TranslationError(ERROR_TYPES.EMPTY_RESULT, 'lingva', `${base} 返回空结果`);
        continue;
      }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new TranslationError(ERROR_TYPES.UNKNOWN, 'lingva', '所有实例均失败');
}

/* ============================================================
 * 轮询调度器
 * ============================================================ */
const PROVIDERS = [
  { name: 'google', fn: googleTranslate },
  { name: 'mymemory', fn: mymemoryTranslate },
  { name: 'libretranslate', fn: libreTranslate },
  { name: 'lingva', fn: lingvaTranslate }
];

// 'round-robin'（默认，均匀轮询）| 'priority'（Google 优先，失败再降级）
const TRANSLATE_MODE = process.env.TRANSLATE_MODE || 'round-robin';

let currentIndex = 0;

// 简单 LRU 缓存
const CACHE_MAX = 5000;
const cache = new Map();
function cacheKey(text, targetLang, sourceLang) {
  return `${sourceLang}|${targetLang}|${text}`;
}
function cacheGet(key) {
  if (!cache.has(key)) return null;
  const v = cache.get(key);
  cache.delete(key);
  cache.set(key, v);
  return v;
}
function cacheSet(key, value) {
  cache.set(key, value);
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}
function clearCache() { cache.clear(); }

/**
 * 统一翻译入口：轮询 + 降级 + 缓存
 * @returns {Promise<string>} 翻译后的纯文本/HTML 字符串
 * @throws {TranslationError} 全部失败时抛出，err.errors 包含每个服务商的失败原因
 */
async function translateWithPolling(text, targetLang, sourceLang = 'auto') {
  if (text === null || text === undefined) return text;
  const str = String(text);
  if (!str.trim()) return str;

  const target = String(targetLang).split('-')[0];
  const src = (sourceLang && sourceLang !== 'auto') ? String(sourceLang).split('-')[0] : 'auto';
  if (src !== 'auto' && src === target) return str;

  const ck = cacheKey(str, target, src);
  const cached = cacheGet(ck);
  if (cached !== null) return cached;

  const errors = [];
  const start = (TRANSLATE_MODE === 'priority') ? 0 : currentIndex;

  for (let i = 0; i < PROVIDERS.length; i++) {
    const p = PROVIDERS[(start + i) % PROVIDERS.length];
    try {
      const out = await p.fn(str, target, src);
      if (TRANSLATE_MODE !== 'priority') {
        currentIndex = (start + i + 1) % PROVIDERS.length;
      }
      cacheSet(ck, out);
      return out;
    } catch (e) {
      errors.push({
        provider: p.name,
        type: e.type || ERROR_TYPES.UNKNOWN,
        message: e.message || String(e)
      });
    }
  }

  const err = new TranslationError(
    ERROR_TYPES.UNKNOWN,
    'all',
    '所有翻译服务均失败: ' + errors.map(e => `${e.provider}[${e.type}]`).join(' | ')
  );
  err.errors = errors;
  throw err;
}

module.exports = {
  translateWithPolling,
  describeError,
  clearCache,
  ERROR_TYPES,
  TranslationError
};
