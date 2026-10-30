const coinSvg = `<svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#FBBF24"/><circle cx="12" cy="12" r="8" fill="#FCD34D"/><path d="M12 6V18M15 9C15 7.89543 13.6569 7 12 7C10.3431 7 9 7.89543 9 9C9 10.1046 10.3431 11 12 11C13.6569 11 15 11.8954 15 13C15 14.1046 13.6569 15 12 15C10.3431 15 9 14.1046 9 13" stroke="#B45309" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let currentLang = 'zh';
let currentDict = {};
let availableLangs = [];
let trackId = null;
let countryCode = 'CN';
let browserLang = navigator.language || navigator.userLanguage;
let carouselArticles = [];
let carouselIndex = 0;
let carouselInterval = null;
let currentSurveyStep = 1;
let ipInfoPromise = null;

function fetchIPInfo() {
    if (!ipInfoPromise) ipInfoPromise = getIPInfo().catch(() => ({ ip: 'Unknown', country: 'Unknown' }));
    return ipInfoPromise;
}

function renderReviews(reviews) {
    const listEl = document.getElementById('reviewsList');
    if (!listEl) return;
    if (!reviews || reviews.length === 0) {
        listEl.innerHTML = `<div class="text-center text-gray-500 py-4 col-span-2">${currentDict.msgNoReviews || '暂无评价'}</div>`;
        return;
    }
    let shuffled = [...reviews].sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 4);
    let html = '';
    selected.forEach(item => {
        let starsHtml = '';
        for(let i=0; i<item.stars; i++) starsHtml += '★';
        html += `<div class="border border-gray-100 rounded-xl p-5 bg-white shadow-sm flex flex-col justify-between">
            <div><div class="text-yellow-400 text-sm mb-3 tracking-widest">${starsHtml}</div><p class="text-gray-600 text-sm mb-4 leading-relaxed italic">"${item.text}"</p></div>
            <div><div class="font-bold text-gray-900 text-sm">${item.name}</div></div></div>`;
    });
    listEl.innerHTML = html;
}

function generateFingerprint() {
    let fp = null;
    try { fp = localStorage.getItem('wad_fp'); } catch (e) {}
    if (fp) return fp;
    let rnd = '';
    if (window.crypto && typeof crypto.randomUUID === 'function') rnd = crypto.randomUUID();
    else if (window.crypto && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint8Array(16); crypto.getRandomValues(buf);
        rnd = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
    } else rnd = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
    fp = 'fp_' + rnd;
    try { localStorage.setItem('wad_fp', fp); } catch (e) {}
    return fp;
}

function getUAInfo() {
    const ua = navigator.userAgent;
    let device = /Mobile|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop';
    let os = 'Unknown', osVersion = 'Unknown', browser = 'Unknown', browserVersion = 'Unknown';
    if (/Windows/.test(ua)) { os = 'Windows'; osVersion = ua.match(/Windows NT ([\d.]+)/)?.[1] || ''; }
    else if (/Mac OS/.test(ua)) { os = 'macOS'; osVersion = ua.match(/Mac OS X ([\d_.]+)/)?.[1]?.replace(/_/g, '.') || ''; }
    else if (/Android/.test(ua)) { os = 'Android'; osVersion = ua.match(/Android ([\d.]+)/)?.[1] || ''; }
    else if (/iPhone|iPad|iPod/.test(ua)) { os = 'iOS'; osVersion = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') || ''; }
    if (/Chrome/.test(ua) && !/Edg|OPR|Brave/.test(ua)) { browser = 'Chrome'; browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || ''; }
    else if (/Safari/.test(ua) && !/Chrome|Edg|OPR/.test(ua)) { browser = 'Safari'; browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || ''; }
    else if (/Firefox/.test(ua)) { browser = 'Firefox'; browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || ''; }
    else if (/Edg/.test(ua)) { browser = 'Edge'; browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || ''; }
    return { device, os, osVersion, browser, browserVersion };
}

async function getIPInfo() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
        const res = await fetch('https://ipapi.co/json/', { signal: controller.signal });
        if (!res.ok) throw new Error('ipapi');
        const data = await res.json();
        return { ip: data.ip || 'Unknown', country: data.country_code || 'Unknown' };
    } catch (e) { return { ip: 'Unknown', country: 'Unknown' }; } finally { clearTimeout(timer); }
}

async function recordVisit() {
    try {
        const uaInfo = getUAInfo();
        const ipInfo = await fetchIPInfo();
        countryCode = ipInfo.country;
        const payload = { action: 'visit', fingerprint: generateFingerprint(), ...uaInfo, ip: ipInfo.ip, country: ipInfo.country, lang: currentLang };
        const res = await fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true });
        if (!res.ok) throw new Error('track status');
        const data = await res.json();
        trackId = data.id;
    } catch (e) {}
}

window.addEventListener('beforeunload', () => {
    if (!trackId) return;
    try {
        const blob = new Blob([JSON.stringify({ id: trackId, action: 'leave' })], { type: 'application/json' });
        navigator.sendBeacon('/api/track', blob);
    } catch (e) {}
});

function autoMatchLanguage(langs) {
    const savedLang = localStorage.getItem('wad_lang');
    if (savedLang && langs.find(l => l.code === savedLang)) return savedLang;
    const countryMap = { 'US': 'en-US', 'GB': 'en-GB', 'VN': 'vi', 'DE': 'de', 'AE': 'ar', 'AR': 'es', 'BR': 'pt', 'KR': 'ko', 'UA': 'uk', 'TR': 'tr', 'CN': 'zh' };
    const matchByCountry = countryMap[countryCode];
    if (matchByCountry && langs.find(l => l.code === matchByCountry)) return matchByCountry;
    const matchByDevice = browserLang.split('-')[0];
    const foundDevice = langs.find(l => l.code.startsWith(matchByDevice));
    if (foundDevice) return foundDevice.code;
    return 'zh';
}

async function initLanguages() {
    try {
        const res = await fetch('/api/languages');
        availableLangs = await res.json();
        const menu = document.getElementById('langMenu');
        menu.innerHTML = availableLangs.map(l => `<a href="#" onclick="changeLang('${l.code}', '${l.name}')" class="block px-4 py-2 text-sm hover:bg-gray-100">${l.flag} ${l.name}</a>`).join('');
        const finalLang = autoMatchLanguage(availableLangs);
        const langObj = availableLangs.find(l => l.code === finalLang);
        if (langObj) {
            currentLang = langObj.code;
            currentDict = langObj.dict;
            document.getElementById('currentLangText').innerText = langObj.name;
        }
        applyLanguage();
        loadAllData();
        fetchIPInfo().then(ipInfo => {
            countryCode = ipInfo.country;
            if (localStorage.getItem('wad_lang')) return;
            const better = autoMatchLanguage(availableLangs);
            if (!better || better === currentLang) return;
            const betterObj = availableLangs.find(l => l.code === better);
            if (!betterObj) return;
            currentLang = betterObj.code;
            currentDict = betterObj.dict;
            document.getElementById('currentLangText').innerText = betterObj.name;
            applyLanguage();
            loadAllData();
        });
    } catch (e) {}
}

function toggleLangMenu() { document.getElementById('langMenu').classList.toggle('active'); }
function changeLang(code, name) {
    localStorage.setItem('wad_lang', code);
    const langObj = availableLangs.find(l => l.code === code);
    if (!langObj) return;
    currentLang = code; currentDict = langObj.dict;
    document.getElementById('langMenu').classList.remove('active');
    document.getElementById('currentLangText').innerText = name;
    applyLanguage(); loadAllData();
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (currentDict[key]) el.innerText = currentDict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (currentDict[key]) el.placeholder = currentDict[key];
    });
    if (document.getElementById('surveyModal').classList.contains('active')) { loadSurveyQuestions(); }
}

function isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream; }
function isSafari() { return isIOS() && /Safari/.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS|MQQBrowser|MicroMessenger|QQ\/|Weibo|AlipayClient/.test(navigator.userAgent); }

function triggerSafariCheck(action, url = '') {
    if (!isSafari()) { openModal('safariModal'); return; }
    let user = null; try { user = JSON.parse(localStorage.getItem('wad_user')); } catch(e) {}
    if (action === 'login') { if (user) window.location.href = 'dashboard.html'; else openModal('loginModal'); } 
    else if (action === 'link' && url) { if (!user) openModal('loginModal'); else window.location.href = url; }
}

function handleClaim() {
    if (!isSafari()) { openModal('safariModal'); return; }
    let user = null; try { user = JSON.parse(localStorage.getItem('wad_user')); } catch(e) {}
    if (user) openSurvey(); else openModal('registerModal');
}

function checkLoginForLeaderboard(event) {
    if (!isSafari()) { event.preventDefault(); openModal('safariModal'); return; }
    let user = null; try { user = JSON.parse(localStorage.getItem('wad_user')); } catch(e) {}
    if (!user) { event.preventDefault(); openModal('loginModal'); }
}

function checkLoginForArticle(event, url) {
    if (!isSafari()) { event.preventDefault(); openModal('safariModal'); return; }
    let user = null; try { user = JSON.parse(localStorage.getItem('wad_user')); } catch(e) {}
    if (!user) { event.preventDefault(); openModal('loginModal'); } else window.location.href = url;
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }
function setSafariLink() { const input = document.getElementById('safariLinkInput'); if (input) input.value = window.location.origin + window.location.pathname; }

async function loadSystemSettings() {
    try {
        const res = await fetch('/api/public/settings');
        const data = await res.json();
        if (data && data.safariLogo) {
            document.getElementById('defaultSafariSvg').classList.add('hidden');
            const img = document.getElementById('customSafariLogo');
            img.src = data.safariLogo; img.classList.remove('hidden');
        }
    } catch(e) {}
}

function copyLink() {
    const input = document.getElementById('safariLinkInput');
    if (input) {
        navigator.clipboard.writeText(input.value).then(() => {
            document.getElementById('copyMsg').classList.remove('hidden');
            setTimeout(() => document.getElementById('copyMsg').classList.add('hidden'), 2000);
        });
    }
}
function switchToLogin() { closeModal('registerModal'); openModal('loginModal'); }
function switchToRegister() { closeModal('loginModal'); openModal('registerModal'); }

function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('register') === 'true') {
        openModal('registerModal');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

async function loadMarquee() {
    const res = await fetch('/api/marquee');
    const data = await res.json();
    let html = '';
    [...data, ...data].forEach(item => { html += `<span class="inline-flex items-center gap-2 px-4"><i class="w-2 h-2 rounded-full bg-green-500"></i>${item.name} <b class="text-green-400">+${item.amount}</b></span>`; });
    document.getElementById('marqueeData').innerHTML = html;
}

async function loadNewsCarousel() {
    let data = await (await fetch(`/api/articles/latest?lang=${currentLang}`)).json();
    if (!data || data.length === 0) { data = await (await fetch(`/api/articles/latest?lang=zh`)).json(); }
    const container = document.getElementById('newsCarousel');
    const dotsContainer = document.getElementById('carouselDots');
    if (!data || data.length === 0) { container.innerHTML = `<div class="min-w-full snap-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100"><h2 class="text-xl font-bold mb-2">No News</h2></div>`; return; }
    carouselArticles = data; carouselIndex = 0;
    container.innerHTML = data.map((item) => `
        <div class="min-w-full snap-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 class="text-xl font-bold mb-2 leading-snug">${item.title}</h2>
            <p class="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">${item.summary}</p>
            ${item.coverUrl ? `<img src="${item.coverUrl}" class="w-full h-48 object-cover rounded-xl mb-4">` : ''}
            <div class="text-blue-600 font-medium text-sm text-center cursor-pointer" data-i18n="readMore" onclick="checkLoginForArticle(event, '/article.html?id=${item.id}')">查看全文</div>
        </div>
    `).join('');
    dotsContainer.innerHTML = data.map((_, i) => `<button onclick="scrollToArticle(${i})" class="w-2.5 h-2.5 rounded-full transition-all ${i === 0 ? 'bg-blue-600 w-6' : 'bg-gray-300'}"></button>`).join('');
    applyLanguage(); updateDots(0); startCarousel();
}

function startCarousel() { if (carouselInterval) clearInterval(carouselInterval); if (carouselArticles.length <= 1) return; carouselInterval = setInterval(() => { scrollToArticle((carouselIndex + 1) % carouselArticles.length); }, 4000); }
function scrollToArticle(index) { const container = document.getElementById('newsCarousel'); container.scrollTo({ left: container.offsetWidth * index, behavior: 'smooth' }); updateDots(index); }
function updateDots(index) {
    carouselIndex = index;
    const dots = document.getElementById('carouselDots').children;
    for (let i = 0; i < dots.length; i++) { dots[i].className = (i === index) ? 'w-2.5 h-2.5 rounded-full transition-all bg-blue-600 w-6' : 'w-2.5 h-2.5 rounded-full transition-all bg-gray-300'; }
}

async function loadPartners() {
    const partners = await (await fetch('/api/partners')).json();
    const grid = document.getElementById('partnersGrid');
    if (partners.length === 0) { grid.innerHTML = `<div class="col-span-3 text-center text-gray-400">${currentDict.msgNoPartners || '暂无品牌'}</div>`; return; }
    grid.innerHTML = partners.map(p => `
        <div class="bg-white p-3 rounded-xl shadow-sm flex flex-col items-center justify-center gap-2 h-24 hover:shadow-md transition-shadow">
            ${p.imageUrl ? `<img src="${p.imageUrl}" alt="${p.name}" class="w-full h-10 object-contain">` : `<div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">${p.name[0]}</div>`}
            <span class="font-bold text-gray-600 text-xs truncate w-full text-center">${p.name}</span>
        </div>`).join('');
}

async function loadReviews() {
    try { const reviews = await (await fetch(`/api/reviews?lang=${encodeURIComponent(currentLang)}`)).json(); renderReviews(reviews); } catch (e) { renderReviews([]); }
}

function openSurvey() { currentSurveyStep = 1; document.getElementById('walletAddressInput').value = ''; updateSurveyUI(); loadSurveyQuestions(); openModal('surveyModal'); }
function updateSurveyUI() {
    document.getElementById('surveyStep1').classList.add('hidden'); document.getElementById('surveyStep2').classList.add('hidden'); document.getElementById('surveyStep3').classList.add('hidden');
    document.getElementById(`surveyStep${currentSurveyStep}`).classList.remove('hidden');
    document.getElementById('surveyCloseBtn').style.display = (currentSurveyStep === 3) ? 'none' : 'block';
}

function nextSurveyStep() {
    if (currentSurveyStep === 1) {
        const checked = document.querySelectorAll('#surveyQuestions1 input[type="radio"]:checked');
        if (checked.length < document.querySelectorAll('#surveyQuestions1 > div').length) return alert(currentDict.msgAnswerAll || '请回答所有问题');
        currentSurveyStep = 2;
    } else if (currentSurveyStep === 2) {
        const checked = document.querySelectorAll('#surveyQuestions2 input[type="radio"]:checked');
        if (checked.length < document.querySelectorAll('#surveyQuestions2 > div').length) return alert(currentDict.msgAnswerAll || '请回答所有问题');
        currentSurveyStep = 3;
    }
    updateSurveyUI();
}

async function loadSurveyQuestions() {
    try {
        const questions = await (await fetch(`/api/survey/questions?lang=${currentLang}`)).json();
        if (!questions || questions.length < 5) { document.getElementById('surveyQuestions1').innerHTML = `<p class="text-sm text-gray-400">${currentDict.msgSurveyPreparing}</p>`; return; }
        let html1 = '', html2 = '';
        questions.slice(0, 2).forEach((q, i) => {
            html1 += `<div><p class="text-sm mb-2">${i+1}. ${q.title}</p>`;
            q.options.forEach(opt => { html1 += `<label class="flex items-center gap-2 text-sm text-gray-300 mb-1 cursor-pointer"><input type="radio" name="${q.id}" value="${opt}" class="accent-blue-500"> ${opt}</label>`; });
            html1 += `</div>`;
        });
        questions.slice(2, 5).forEach((q, i) => {
            html2 += `<div><p class="text-sm mb-2">${i+3}. ${q.title}</p>`;
            q.options.forEach(opt => { html2 += `<label class="flex items-center gap-2 text-sm text-gray-300 mb-1 cursor-pointer"><input type="radio" name="${q.id}" value="${opt}" class="accent-blue-500"> ${opt}</label>`; });
            html2 += `</div>`;
        });
        document.getElementById('surveyQuestions1').innerHTML = html1;
        document.getElementById('surveyQuestions2').innerHTML = html2;
    } catch (e) { document.getElementById('surveyQuestions1').innerHTML = `<p class="text-sm text-red-400">${currentDict.msgSurveyFailed}</p>`; }
}

async function submitSurvey() {
    const addr = document.getElementById('walletAddressInput').value.trim();
    if (!addr) return alert(currentDict.msgEnterWallet);
    const answers = {}; 
    document.querySelectorAll('#surveyQuestions1 input:checked, #surveyQuestions2 input:checked').forEach(i => answers[i.name] = i.value);
    let user = null; try { user = JSON.parse(localStorage.getItem('wad_user')); } catch(e) {}
    try {
        await fetch('/api/survey', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ answers, wallet: '', walletAddress: addr, email: user ? user.email : '游客', fingerprint: generateFingerprint() }) });
        alert(currentDict.msgSubmitSuccess); closeModal('surveyModal');
    } catch (e) { alert(currentDict.msgNetError); }
}

function updateAuthUI() {
    const area = document.getElementById('authBtnArea');
    let user = null; try { user = JSON.parse(localStorage.getItem('wad_user')); } catch(e) {}
    if (user) {
        area.innerHTML = `<div class="flex items-center gap-3"><span class="text-sm font-bold text-blue-600 flex items-center gap-1">${coinSvg} ${user.balance || 0}</span><div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold cursor-pointer" onclick="triggerSafariCheck('login')">${user.email[0].toUpperCase()}</div></div>`;
    } else {
        area.innerHTML = `<button onclick="triggerSafariCheck('login')" class="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700" data-i18n="login">登录</button>`;
        applyLanguage();
    }
}

async function doRegister() {
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPass').value;
    const confirmPass = document.getElementById('regConfirmPass').value;
    const payPassword = document.getElementById('regPayPass').value;
    if(!email || !password || !confirmPass || !payPassword) return alert(currentDict.msgFillAll);
    if(password !== confirmPass) return alert(currentDict.msgPwdMismatch);
    const res = await fetch('/api/register', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ email, password, payPassword, fingerprint: generateFingerprint(), country: countryCode, lang: currentLang, ...getUAInfo() }) });
    const data = await res.json();
    if (data.success) { alert(currentDict.msgRegSuccess); localStorage.setItem('wad_user', JSON.stringify(data.user)); window.location.href = '/'; } 
    else alert(currentDict[data.error] || data.error);
}

async function doLogin() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPass').value;
    const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({email, password}) });
    const data = await res.json();
    if(data.success) { localStorage.setItem('wad_user', JSON.stringify(data.user)); window.location.href = '/'; } 
    else alert(currentDict[data.error] || data.error);
}

async function loadTopLeaderboard() {
    const list = await (await fetch('/api/leaderboard?period=daily')).json();
    document.getElementById('topUsersList').innerHTML = list.slice(0, 5).map((u, i) => `
        <div class="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl">
            <div class="flex items-center gap-3"><span class="text-gray-400 font-bold w-4">#${i+1}</span>
            <div class="w-10 h-10 ${i === 0 ? 'bg-[#0A3466] text-white' : 'bg-gray-300 text-gray-700'} rounded-full flex items-center justify-center text-sm font-bold">${u.avatar}</div>
            <span class="font-medium text-sm">${u.name}</span></div>
            <span class="font-bold text-yellow-500 text-sm flex items-center gap-1">${coinSvg} ${u.amount.toLocaleString()}</span>
        </div>`).join('');
}

function loadAllData() { loadMarquee(); loadNewsCarousel(); loadTopLeaderboard(); loadPartners(); loadReviews(); }

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('newsCarousel').addEventListener('scroll', () => {
        const container = document.getElementById('newsCarousel');
        const index = Math.round(container.scrollLeft / container.offsetWidth);
        if (index !== carouselIndex) updateDots(index);
    });
    document.getElementById('newsCarousel').addEventListener('touchstart', () => { if (carouselInterval) clearInterval(carouselInterval); }, {passive: true});
    document.getElementById('newsCarousel').addEventListener('touchend', () => { startCarousel(); }, {passive: true});
    updateAuthUI(); checkUrlParams(); setSafariLink(); loadSystemSettings(); initLanguages().finally(recordVisit);
});
