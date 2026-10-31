const https = require('https');
const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

const SETTINGS_FILE = path.join(DB_DIR, 'settings.json');
const STATS_FILE = path.join(DB_DIR, 'stats.json');
const LOGS_FILE = path.join(DB_DIR, 'translation_logs.json');

let currentKeyIndex = 0;

function getSettings() {
    try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch (e) { return {}; }
}
function getStats() {
    try { return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')); } catch (e) { return { reqCount: 0, charCount: 0 }; }
}
function updateStats(chars) {
    try {
        let stats = getStats();
        stats.reqCount = (stats.reqCount || 0) + 1;
        stats.charCount = (stats.charCount || 0) + chars;
        fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2));
    } catch (e) {}
}
function logTranslation(apiKey, chars, targetLang) {
    try {
        let logs = [];
        if (fs.existsSync(LOGS_FILE)) {
            logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf8'));
        }
        logs.push({
            id: Date.now() + Math.random().toString(36).substring(2, 6),
            time: new Date().toISOString(),
            // 脱敏处理，只保留前4位和后4位
            apiKey: apiKey.length > 8 ? apiKey.substring(0, 4) + '***' + apiKey.slice(-4) : apiKey,
            chars: chars,
            targetLang: targetLang
        });
        // 只保留最近 30 天的数据，防止文件过大导致性能问题
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        logs = logs.filter(l => new Date(l.time).getTime() > thirtyDaysAgo);
        fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
    } catch (e) {}
}

async function deeplTranslate(text, targetLang, sourceLang = 'auto') {
    const settings = getSettings();
    const keys = [];
    if (settings.deeplKey1 && settings.deeplKey1.trim() !== '') keys.push(settings.deeplKey1.trim());
    if (settings.deeplKey2 && settings.deeplKey2.trim() !== '') keys.push(settings.deeplKey2.trim());
    if (keys.length === 0) keys.push('67c34072-6777-4998-a6c8-3fd7d4fa0a1d:fx'); 

    const isArray = Array.isArray(text);
    const bodyData = { text: isArray ? text : [text], target_lang: targetLang };
    if (sourceLang && sourceLang.toLowerCase() !== 'auto') bodyData.source_lang = sourceLang;
    const payload = JSON.stringify(bodyData);

    let lastError = null;
    const textLength = isArray ? text.reduce((acc, cur) => acc + String(cur).length, 0) : String(text).length;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[currentKeyIndex % keys.length];
        const isFree = key.endsWith(':fx');
        const hostname = isFree ? 'api-free.deepl.com' : 'api.deepl.com';
        
        try {
            const result = await new Promise((resolve, reject) => {
                const req = https.request({
                    hostname, port: 443, path: '/v2/translate', method: 'POST',
                    headers: {
                        'Authorization': `DeepL-Auth-Key ${key}`,
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(payload)
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => {
                        if (res.statusCode === 200) resolve(JSON.parse(data));
                        else reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    });
                });
                req.setTimeout(15000, () => { req.destroy(); reject(new Error('请求超时')); });
                req.on('error', reject);
                req.write(payload);
                req.end();
            });

            currentKeyIndex = (currentKeyIndex + 1) % keys.length; 
            
            updateStats(textLength);
            logTranslation(key, textLength, targetLang);
            
            return isArray ? result.translations.map(t => t.text) : result.translations[0].text;
            
        } catch (e) {
            lastError = e;
            currentKeyIndex = (currentKeyIndex + 1) % keys.length; 
        }
    }
    throw lastError;
}

async function translateWithPolling(text, targetLang, sourceLang = 'auto') {
    if (!text || (Array.isArray(text) && text.length === 0)) return text;
    let target = String(targetLang).split('-')[0];
    let src = (sourceLang && sourceLang !== 'auto') ? String(sourceLang).split('-')[0] : 'auto';

    const deeplLangMap = {
        'zh': 'ZH', 'en': 'EN-US', 'pt': 'PT-BR', 
        'de': 'DE', 'es': 'ES', 'ko': 'KO', 'uk': 'UK', 'tr': 'TR', 'vi': 'VI', 'ar': 'AR'
    };
    const targetForDeepL = deeplLangMap[target] || target.toUpperCase();
    const sourceForDeepL = (src !== 'auto') ? (deeplLangMap[src] || src.toUpperCase()) : 'auto';
    return await deeplTranslate(text, targetForDeepL, sourceForDeepL);
}

module.exports = { translateWithPolling, describeError: (e) => e.message || '未知错误', clearCache: () => {}, ERROR_TYPES: {}, TranslationError: Error };