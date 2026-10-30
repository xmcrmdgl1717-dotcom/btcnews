let adminPwd = sessionStorage.getItem('wad_admin_pwd') || localStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let allVisits = [];
let currentSurveySourceLang = 'zh';
let currentReviewMode = 'all';
let currentEditArticleGroupId = null;
let currentEditArticleMainLang = 'zh';
let aceEditor = null;

const ADMIN_I18N = {
    zh: {
        navDashboard: '📊 数据汇总', navUsers: '👥 用户管理', navArticles: '📝 文章管理',
        navReviews: '💬 评论管理', navSurveys: '📋 问卷管理', navOffers: '🎁 优惠管理',
        navPartners: '🤝 合作墙管理', navLanguages: '🌐 多语言管理', navSettings: '⚙️ 系统设置', navCodeEditor: '💻 代码编辑器',
        changePwd: '修改密码', logout: '退出登录', loginTitle: '后台登录', loginPlaceholder: '请输入后台密码', loginBtn: '登录',
        pageDashboard: '数据汇总', pageUsers: '用户管理', pageArticles: '文章管理', pageReviews: '评论管理',
        pageSurveys: '问卷管理', pageOffers: '优惠管理', pagePartners: '合作墙管理', pageLanguages: '多语言管理',
        pageSettings: '系统设置', pageCodeEditor: '代码编辑器'
    },
    en: {
        navDashboard: '📊 Dashboard', navUsers: '👥 Users', navArticles: '📝 Articles',
        navReviews: '💬 Reviews', navSurveys: '📋 Surveys', navOffers: '🎁 Offers',
        navPartners: '🤝 Partners', navLanguages: '🌐 Languages', navSettings: '⚙️ Settings', navCodeEditor: '💻 Code Editor',
        changePwd: 'Change Password', logout: 'Logout', loginTitle: 'Admin Login', loginPlaceholder: 'Enter admin password', loginBtn: 'Login',
        pageDashboard: 'Dashboard', pageUsers: 'Users', pageArticles: 'Articles', pageReviews: 'Reviews',
        pageSurveys: 'Surveys', pageOffers: 'Offers', pagePartners: 'Partners', pageLanguages: 'Languages',
        pageSettings: 'Settings', pageCodeEditor: 'Code Editor'
    }
};
let adminLang = localStorage.getItem('wad_admin_lang') || 'zh';

function formatTranslateError(data) {
    let msg = data.error || '操作失败';
    if (data.reason) msg += '\n原因: ' + data.reason;
    if (Array.isArray(data.details) && data.details.length) {
        msg += '\n\n各服务商失败明细:';
        data.details.forEach(d => {
            let shortMsg = d.message;
            if (shortMsg.includes('portal.libretranslate.com') || shortMsg.includes('api key')) shortMsg = '官方接口需要 API Key，已自动切换其他节点';
            else if (shortMsg.includes('unsupported')) shortMsg = '不支持该语言对 (已跳过)';
            else if (shortMsg.includes('EMPTY_RESULT') || shortMsg.includes('返回空结果')) shortMsg = '返回空结果 (已跳过)';
            else if (shortMsg.includes('fetch failed') || shortMsg.includes('网络')) shortMsg = '网络连接失败';
            msg += `\n- ${d.provider}: ${shortMsg}`;
        });
    }
    return msg;
}

function applyAdminLang() {
    const dict = ADMIN_I18N[adminLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key] !== undefined) el.innerText = dict[key];
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (dict[key] !== undefined) el.placeholder = dict[key];
    });
    const activeMenu = document.querySelector('.menu-item.active');
    if (activeMenu) {
        const navKey = activeMenu.getAttribute('data-i18n');
        const pageKey = navKey ? navKey.replace(/^nav/, 'page') : '';
        if (dict[pageKey]) document.getElementById('pageTitle').innerText = dict[pageKey];
    }
    const label = document.getElementById('adminLangLabel');
    if (label) label.innerText = adminLang === 'zh' ? 'EN' : '中';
}

function toggleAdminLang() {
    adminLang = adminLang === 'zh' ? 'en' : 'zh';
    localStorage.setItem('wad_admin_lang', adminLang);
    applyAdminLang();
}

function toggleTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
        html.classList.remove('dark'); html.classList.add('light'); localStorage.setItem('wad_theme', 'light');
    } else {
        html.classList.remove('light'); html.classList.add('dark'); localStorage.setItem('wad_theme', 'dark');
    }
}

async function doLogin() {
    adminPwd = document.getElementById('adminPwd').value;
    try {
        const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
        if (res.status === 403) return alert(adminLang === 'zh' ? '密码错误' : 'Wrong password');
        sessionStorage.setItem('wad_admin_pwd', adminPwd);
        localStorage.setItem('wad_admin_pwd', adminPwd);
        document.getElementById('loginOverlay').classList.add('hidden');
        fetchData();
    } catch (e) { alert(adminLang === 'zh' ? '登录失败' : 'Login failed'); }
}

async function tryAutoLogin() {
    if (!adminPwd) return;
    try {
        const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
        if (res.ok) {
            document.getElementById('loginOverlay').classList.add('hidden');
            fetchData();
        } else {
            sessionStorage.removeItem('wad_admin_pwd'); localStorage.removeItem('wad_admin_pwd');
            adminPwd = '';
            document.getElementById('loginOverlay').classList.remove('hidden');
        }
    } catch (e) {}
}

function logout() { 
    sessionStorage.removeItem('wad_admin_pwd'); localStorage.removeItem('wad_admin_pwd'); location.reload(); 
}

function switchTab(tabId, el) {
    document.querySelectorAll('.menu-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
    const dict = ADMIN_I18N[adminLang];
    const navKey = el.getAttribute('data-i18n');
    const pageKey = navKey ? navKey.replace(/^nav/, 'page') : '';
    document.getElementById('pageTitle').innerText = dict[pageKey] || el.innerText;
    if (tabId === 'code') loadFileList();
}

function openChangePwd() { document.getElementById('changePwdModal').classList.add('active'); }
async function savePassword() {
    const pwd = document.getElementById('newPwdInput').value;
    if (!pwd) return;
    await fetch('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ newPassword: pwd }) });
    sessionStorage.removeItem('wad_admin_pwd'); alert('修改成功，请重新登录'); location.reload();
}

async function uploadImage(file) {
    const formData = new FormData(); formData.append('image', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-pwd': adminPwd }, body: formData });
    const data = await res.json(); return data.url;
}

/* ================= 代码编辑器逻辑 ================= */
function initCodeEditor() {
    if (!aceEditor) {
        aceEditor = ace.edit("codeEditor");
        aceEditor.setTheme("ace/theme/tomorrow_night");
        aceEditor.session.setMode("ace/mode/javascript");
        aceEditor.setOptions({ fontSize: "14px", showPrintMargin: false, wrap: true, enableBasicAutocompletion: true, enableLiveAutocompletion: true });
    }
}

async function loadFileList() {
    try {
        const res = await fetch('/api/admin/files', { headers: { 'x-admin-pwd': adminPwd } });
        const files = await res.json();
        const select = document.getElementById('codeFileSelect');
        select.innerHTML = files.map(f => `<option value="${f.name}">${f.name}</option>`).join('');
        if (files.length > 0) loadFileContent();
    } catch(e) { alert('加载文件列表失败'); }
}

async function loadFileContent() {
    const filename = document.getElementById('codeFileSelect').value;
    if (!filename) return;
    initCodeEditor();
    const btn = document.getElementById('saveCodeBtn');
    btn.disabled = true;
    try {
        const res = await fetch(`/api/admin/file-content?filename=${filename}`, { headers: { 'x-admin-pwd': adminPwd } });
        const data = await res.json();
        if (data.success) {
            aceEditor.setValue(data.content, -1);
            const ext = filename.split('.').pop();
            if (ext === 'js') aceEditor.session.setMode("ace/mode/javascript");
            else if (ext === 'html') aceEditor.session.setMode("ace/mode/html");
            else if (ext === 'json') aceEditor.session.setMode("ace/mode/json");
            else aceEditor.session.setMode("ace/mode/text");
            btn.disabled = false;
        } else alert(data.error);
    } catch (e) { alert('读取文件失败'); }
}

async function saveFileContent() {
    const filename = document.getElementById('codeFileSelect').value;
    if (!filename) return;
    const content = aceEditor.getValue();
    const btn = document.getElementById('saveCodeBtn');
    const originalText = btn.innerText;
    btn.innerText = '保存中...'; btn.disabled = true;
    try {
        const res = await fetch('/api/admin/file-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify({ filename, content })
        });
        const data = await res.json();
        if (data.success) {
            if (data.needsRestart) alert('代码已保存！注意：因为修改了后端文件，你需要去 Render 控制台手动重启一次服务才能生效。');
            else alert('代码保存成功！刷新网页即可查看效果。');
        } else alert(data.error);
    } catch (e) { alert('网络异常，保存失败'); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
}

/* ================= 表单与渲染逻辑 ================= */
function renderSurveyEditor(questions) {
    const area = document.getElementById('surveyConfigArea');
    area.innerHTML = '';
    if (!questions || questions.length === 0) {
        area.innerHTML = '<div class="text-center text-gray-500 py-4">暂无题目，请点击右上角"添加题目"</div>';
        return;
    }
    questions.forEach((q, i) => {
        const div = document.createElement('div');
        div.className = 'border border-gray-200 dark:border-slate-700 p-3 rounded bg-white dark:bg-[#0f172a] relative';
        div.innerHTML = `
            <button onclick="this.parentElement.remove()" class="absolute top-2 right-2 text-red-500 text-xs hover:underline">删除</button>
            <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">题目 ${i+1}</label>
            <input type="text" class="q-title input w-full p-2 rounded mb-2 text-sm" value="${q.title || ''}">
            <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">选项 (每行一个)</label>
            <textarea class="q-options input w-full p-2 rounded text-sm" rows="3">${(q.options||[]).join('\n')}</textarea>
        `;
        area.appendChild(div);
    });
}

function addSurveyQuestion() {
    const area = document.getElementById('surveyConfigArea');
    if (area.innerHTML.includes('暂无题目')) area.innerHTML = '';
    const div = document.createElement('div');
    div.className = 'border border-gray-200 dark:border-slate-700 p-3 rounded bg-white dark:bg-[#0f172a] relative';
    div.innerHTML = `
        <button onclick="this.parentElement.remove()" class="absolute top-2 right-2 text-red-500 text-xs hover:underline">删除</button>
        <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">新题目</label>
        <input type="text" class="q-title input w-full p-2 rounded mb-2 text-sm" placeholder="输入题目">
        <label class="block text-xs text-gray-500 dark:text-slate-400 mb-1">选项 (每行一个)</label>
        <textarea class="q-options input w-full p-2 rounded text-sm" rows="3" placeholder="选项1&#10;选项2"></textarea>
    `;
    area.appendChild(div);
}

function editSurveyGroup(sourceLang) {
    if (!window.allSurveys || !window.allSurveys.questions[sourceLang]) return;
    const questions = window.allSurveys.questions[sourceLang];
    renderSurveyEditor(questions);
    currentSurveySourceLang = sourceLang;

    document.getElementById('surveyFormTitle').innerText = '编辑问卷整组 (源语言: ' + sourceLang + ')';
    document.getElementById('surveyResetBtn').classList.remove('hidden');

    const langBox = document.getElementById('surveyLangBox');
    langBox.innerHTML = `
        <p class="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">当前编辑源语言: <span class="text-blue-500 uppercase">${sourceLang}</span>，勾选其他语言将进行机器翻译覆盖:</p>
        <div class="flex flex-wrap gap-3" id="surveyLangCheckboxes"></div>
    `;
    const cbContainer = document.getElementById('surveyLangCheckboxes');
    const existingLangs = Object.keys(window.allSurveys.questions);
    
    cbContainer.innerHTML = (window.allLangs || []).filter(l => l.active).map(l => `
        <label class="flex items-center gap-1 text-sm cursor-pointer">
            <input type="checkbox" value="${l.code}" class="accent-blue-500" 
                ${l.code === sourceLang ? 'checked disabled' : ''} 
                ${existingLangs.includes(l.code) ? 'checked' : ''}> 
            ${l.flag} ${l.name}
        </label>
    `).join('');
}

function resetSurveyForm() {
    currentSurveySourceLang = 'zh';
    document.getElementById('surveyFormTitle').innerText = '发布新问卷';
    document.getElementById('surveyResetBtn').classList.add('hidden');

    const langBox = document.getElementById('surveyLangBox');
    langBox.innerHTML = `
        <p class="text-xs font-bold text-gray-500 dark:text-slate-400 mb-2">发布语言 (源语言固定为中文，勾选其他语言将进行机翻):</p>
        <div class="flex flex-wrap gap-3" id="surveyLangCheckboxes"></div>
    `;
    renderSurveyEditor([]);

    document.getElementById('surveyLangCheckboxes').innerHTML = (window.allLangs || []).filter(l => l.active).map(l => `
        <label class="flex items-center gap-1 text-sm cursor-pointer">
            <input type="checkbox" value="${l.code}" class="accent-blue-500" ${l.code === 'zh' ? 'checked disabled' : ''}> 
            ${l.flag} ${l.name}
        </label>
    `).join('');
}

async function saveSurvey(btn) {
    const area = document.getElementById('surveyConfigArea');
    const questions = [];
    const children = Array.from(area.children).filter(el => el.tagName === 'DIV' && el.querySelector('.q-title'));

    for (let i = 0; i < children.length; i++) {
        const el = children[i];
        const title = el.querySelector('.q-title').value.trim();
        const optsText = el.querySelector('.q-options').value.trim();
        if (title && optsText) {
            const options = optsText.split('\n').map(o => o.trim()).filter(o => o);
            questions.push({ id: 'q' + (i + 1), title, options });
        }
    }

    const checkedLangs = Array.from(document.querySelectorAll('#surveyLangCheckboxes input:checked')).map(cb => cb.value);
    if (!checkedLangs.includes(currentSurveySourceLang)) checkedLangs.push(currentSurveySourceLang);

    const originalText = btn.innerText;
    btn.innerText = '正在保存处理...'; btn.disabled = true;

    try {
        const res = await fetch('/api/admin/survey/translate', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd },
            body: JSON.stringify({ questions, targetLangs: checkedLangs, sourceLang: currentSurveySourceLang })
        });
        const data = await res.json();
        if (data.success) { alert('问卷已保存并更新'); resetSurveyForm(); } 
        else alert(formatTranslateError(data));
    } finally {
        btn.innerText = originalText; btn.disabled = false; fetchData();
    }
}

async function deleteSurveyGroup() {
    if (!confirm('确认删除该问卷的所有语言版本吗？')) return;
    await fetch('/api/admin/survey/group', { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } });
    fetchData();
}

function renderVisitList() {
    const fStatus = document.getElementById('filterStatus').value;
    const fDevice = document.getElementById('filterDevice').value;
    const fOS = document.getElementById('filterOS').value;
    const fOSVersion = document.getElementById('filterOSVersion').value;
    const fLang = document.getElementById('filterLang').value;
    const keyword = document.getElementById('searchInput').value.toLowerCase();

    let filtered = allVisits.filter(v => {
        if (fStatus !== 'all' && v.status !== fStatus) return false;
        if (fDevice !== 'all' && v.device !== fDevice) return false;
        if (fOS !== 'all' && v.os !== fOS) return false;
        if (fOSVersion !== 'all' && v.osVersion !== fOSVersion) return false;
        if (fLang !== 'all' && v.lang !== fLang) return false;
        if (keyword) {
            const ipMatch = v.ip?.toLowerCase().includes(keyword);
            const emailMatch = v.email?.toLowerCase().includes(keyword);
            const fpMatch = v.fingerprint?.toLowerCase().includes(keyword);
            if (!ipMatch && !emailMatch && !fpMatch) return false;
        }
        return true;
    });

    document.getElementById('filteredCount').innerText = filtered.length;
    const listEl = document.getElementById('visitList');
    listEl.innerHTML = filtered.slice().reverse().map(v => {
        let statusColor = v.status === '已注册' ? 'bg-green-900/30 text-green-500 border-green-800' : (v.status === '已答题' ? 'bg-purple-900/30 text-purple-500 border-purple-800' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600');
        return `
            <div class="card p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="tag ${statusColor}">${v.status}</span>
                        <span class="text-xs text-gray-500 dark:text-slate-400">🕒 进入: ${new Date(v.visitTime).toLocaleString()}</span>
                        ${v.submitTime ? `<span class="text-xs text-blue-500 dark:text-blue-400">⏱️ 提交: ${new Date(v.submitTime).toLocaleString()}</span>` : ''}
                        ${v.duration ? `<span class="text-xs text-yellow-500 dark:text-yellow-400">⏳ 停留: ${v.duration}s</span>` : ''}
                    </div>
                    <div class="text-sm font-bold text-gray-800 dark:text-slate-200 mb-1 flex flex-wrap items-center gap-2">
                        <span>${v.email ? `📧 ${v.email}` : '游客访问'}</span>
                        ${v.walletAddress ? `<span class="text-blue-600 dark:text-blue-400 font-mono text-xs bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">💼 ${v.walletAddress}</span>` : ''}
                    </div>
                    <div class="flex flex-wrap items-center gap-2 mt-2">
                        <span class="tag bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700">📍 ${v.country || '未知'}</span>
                        <span class="tag bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700">🌐 ${v.ip || '未知IP'}</span>
                        <span class="tag bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700">💻 ${v.os} ${v.osVersion}</span>
                        <span class="tag bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700">🌍 ${v.browser} ${v.browserVersion}</span>
                        <span class="tag bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700">🗣️ ${v.lang}</span>
                        <span class="tag bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-700 text-[10px]">${v.fingerprint}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('') || '<div class="text-center text-gray-500 py-10">暂无记录</div>';
}

function resetFilters() {
    document.getElementById('filterStatus').value = 'all';
    document.getElementById('filterDevice').value = 'all';
    document.getElementById('filterOS').value = 'all';
    document.getElementById('filterOSVersion').value = 'all';
    document.getElementById('filterLang').value = 'all';
    document.getElementById('searchInput').value = '';
    renderVisitList();
}

function exportCSV() {
    const rows = [['状态', '邮箱', '钱包地址', '国家', 'IP', '系统', '版本', '浏览器', '语言', '进入时间', '停留(s)', '指纹']];
    allVisits.forEach(v => { rows.push([v.status, v.email || '', v.walletAddress || '', v.country || '', v.ip || '', v.os, v.osVersion, `${v.browser} ${v.browserVersion}`, v.lang, v.visitTime, v.duration || '', v.fingerprint]); });
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent)); link.setAttribute("download", "visits.csv");
    document.body.appendChild(link); link.click();
}

async function fetchData() {
    const res = await fetch('/api/admin/data', { headers: { 'x-admin-pwd': adminPwd } });
    if (res.status === 403) return;
    const data = await res.json();

    window.allArticles = data.articles; window.allPartners = data.partners; window.allUsers = data.users;
    window.allLangs = data.languages; window.allSurveys = data.surveys; window.allReviews = data.reviews || [];
    allVisits = data.visits || [];

    document.getElementById('statTotal').innerText = allVisits.length;
    document.getElementById('statVisiting').innerText = allVisits.filter(v => v.status === '访问中').length;
    document.getElementById('statRegistered').innerText = allVisits.filter(v => v.status === '已注册').length;
    document.getElementById('statAnswered').innerText = allVisits.filter(v => v.status === '已答题').length;
    document.getElementById('statAndroid').innerText = allVisits.filter(v => v.os === 'Android').length;
    document.getElementById('statIos').innerText = allVisits.filter(v => v.os === 'iOS').length;

    const langFilter = document.getElementById('filterLang'); const prevLang = langFilter.value;
    const uniqueLangs = [...new Set(allVisits.map(v => v.lang).filter(Boolean))];
    langFilter.innerHTML = '<option value="all">全部语言</option>' + uniqueLangs.map(l => `<option value="${l}">${l}</option>`).join('');
    if (uniqueLangs.includes(prevLang)) langFilter.value = prevLang;

    const verFilter = document.getElementById('filterOSVersion'); const prevVer = verFilter.value;
    const uniqueVers = [...new Set(allVisits.map(v => v.osVersion).filter(Boolean))];
    verFilter.innerHTML = '<option value="all">全部系统版本</option>' + uniqueVers.map(v => `<option value="${v}">${v}</option>`).join('');
    if (uniqueVers.includes(prevVer)) verFilter.value = prevVer;

    renderVisitList();

    const surveyQuestions = data.surveys.questions || {};
    const availableSurveyLangs = Object.keys(surveyQuestions);
    let pubHtml = '';

    if (availableSurveyLangs.length === 0) {
        pubHtml = '<div class="text-center text-gray-500 py-4">暂无发布的问卷</div>';
    } else {
        const mainLang = availableSurveyLangs.includes('zh') ? 'zh' : availableSurveyLangs[0];
        const otherLangs = availableSurveyLangs.filter(l => l !== mainLang);
        const mainLangObj = data.languages.find(l => l.code === mainLang) || { name: mainLang, flag: '🌐' };
        const mainCount = surveyQuestions[mainLang].length;

        pubHtml += `
            <div class="border border-gray-200 dark:border-slate-700 p-3 rounded mb-2 bg-white dark:bg-[#0f172a]">
                <div class="flex justify-between items-start mb-2">
                    <div><span class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase">${mainLang}</span><span class="text-sm ml-2">${mainLangObj.flag} ${mainLangObj.name}</span><div class="text-xs text-gray-500 mt-1">${mainCount} 道题目</div></div>
                    <div class="flex gap-2"><button onclick="editSurveyGroup('${mainLang}')" class="text-blue-500 text-xs hover:underline">编辑整组</button><button onclick="deleteSurveyGroup()" class="text-red-500 text-xs hover:underline">删除整组</button></div>
                </div>
                ${otherLangs.length > 0 ? `
                    <details class="mt-2"><summary class="text-xs text-gray-500 cursor-pointer">其他语言版本 (${otherLangs.length})</summary>
                        <div class="mt-2 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-slate-700">
                            ${otherLangs.map(lang => {
                                const langObj = data.languages.find(l => l.code === lang) || { name: lang, flag: '🌐' };
                                return `<div class="flex justify-between bg-gray-50 dark:bg-slate-800 p-2 rounded items-center"><div><span class="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">${lang}</span><span class="text-sm ml-1">${langObj.flag} ${langObj.name}</span></div></div>`;
                            }).join('')}
                        </div>
                    </details>
                ` : ''}
            </div>
        `;
    }
    document.getElementById('surveyPublishedList').innerHTML = pubHtml;

    document.getElementById('surveyList').innerHTML = data.surveys.submissions.map(s => `
        <tr><td class="p-3 font-medium">${s.email || '游客'}</td><td class="p-3 text-xs text-gray-500 dark:text-slate-400">${JSON.stringify(s.answers)}</td><td class="p-3 text-xs font-mono text-blue-500"><div>${s.wallet || ''}</div><div class="text-gray-400">${s.walletAddress || '-'}</div></td><td class="p-3 text-xs text-gray-500 dark:text-slate-400">${new Date(s.time).toLocaleString()}</td></tr>
    `).join('') || '<tr><td colspan="4" class="text-center py-4 text-gray-500">暂无记录</td></tr>';

    document.getElementById('userList').innerHTML = data.users.map(u => `<tr><td class="p-4">${u.email}</td><td class="p-4 text-gray-500">${u.password}</td><td class="p-4 font-bold text-blue-600">${u.balance || 0}</td><td class="p-4 text-gray-500">${new Date(u.time).toLocaleString()}</td></tr>`).join('');

    document.getElementById('articleLangCheckboxes').innerHTML = data.languages.filter(l => l.active).map(l => `<label class="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" value="${l.code}" class="accent-blue-500" ${l.code === 'zh' ? 'checked disabled' : ''}> ${l.flag} ${l.name}</label>`).join('');

    const groups = {};
    data.articles.forEach(a => { const gid = a.groupId || a.id; if (!groups[gid]) groups[gid] = []; groups[gid].push(a); });
    let articleHtml = '';
    Object.values(groups).forEach(group => {
        const mainArt = group.find(a => a.lang === 'zh') || group[0];
        const otherLangs = group.filter(a => a.id !== mainArt.id);
        const groupId = mainArt.groupId || mainArt.id;
        articleHtml += `
        <div class="border border-gray-200 dark:border-slate-700 p-3 rounded mb-2 bg-white dark:bg-[#0f172a]">
            <div class="flex justify-between items-start mb-2">
                <div><span class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase">${mainArt.lang}</span><h4 class="font-bold text-sm mt-1">${mainArt.title}</h4></div>
                <div class="flex gap-2"><button onclick="editArticleGroup('${groupId}')" class="text-blue-500 text-xs hover:underline">编辑整组</button><button onclick="deleteArticleGroup('${groupId}')" class="text-red-500 text-xs hover:underline">删除整组</button></div>
            </div>
            ${otherLangs.length > 0 ? `
                <details class="mt-2"><summary class="text-xs text-gray-500 cursor-pointer">其他语言 (${otherLangs.length})</summary>
                    <div class="mt-2 space-y-1 pl-2 border-l-2 border-gray-200 dark:border-slate-700">
                        ${otherLangs.map(a => `<div class="flex justify-between bg-gray-50 dark:bg-slate-800 p-2 rounded"><div><span class="text-[10px] bg-gray-200 dark:bg-slate-700 px-1.5 py-0.5 rounded uppercase">${a.lang}</span> <span class="text-sm">${a.title}</span></div></div>`).join('')}
                    </div>
                </details>
            ` : ''}
        </div>`;
    });
    document.getElementById('articleList').innerHTML = articleHtml || '<div class="text-center text-gray-500 py-4">暂无文章</div>';

    populateReviewLangSelects(data.languages);
    renderReviewList();
    const settings = data.settings || { reviewMode: 'all' };
    currentReviewMode = settings.reviewMode || 'all';
    updateReviewModeButtons(currentReviewMode);

    const logoImg = document.getElementById('currentSafariLogo'); const noLogo = document.getElementById('noSafariLogo');
    if (settings.safariLogo) {
        logoImg.src = settings.safariLogo; logoImg.classList.remove('hidden'); if(noLogo) noLogo.classList.add('hidden');
    } else {
        logoImg.src = ''; logoImg.classList.add('hidden'); if(noLogo) noLogo.classList.remove('hidden');
    }

    document.getElementById('offerList').innerHTML = data.offers.map(o => `<tr><td class="p-4"><div class="w-6 h-6 rounded" style="background-color: ${o.color}"></div></td><td class="p-4">${o.category}</td><td class="p-4 font-bold">${o.title}</td><td class="p-4 text-yellow-600">${o.reward}</td><td class="p-4"><button onclick="deleteOffer('${o.id}')" class="text-red-500 hover:underline">删除</button></td></tr>`).join('');
    document.getElementById('partnerList').innerHTML = data.partners.map(p => `<tr><td class="p-4">${p.imageUrl ? `<img src="${p.imageUrl}" class="h-8 w-auto object-contain">` : '<span class="text-gray-400">无图</span>'}</td><td class="p-4 font-bold">${p.name}</td><td class="p-4"><button onclick="editPartner('${p.id}')" class="text-blue-500 hover:underline mr-2">编辑</button><button onclick="deletePartner('${p.id}')" class="text-red-500 hover:underline">删除</button></td></tr>`).join('');
    document.getElementById('languageList').innerHTML = data.languages.map(l => `<tr><td class="p-4 font-bold">${l.code}</td><td class="p-4">${l.flag} ${l.name}</td><td class="p-4"><button onclick="toggleLangStatus('${l.code}', ${l.active})" class="px-3 py-1 rounded text-xs font-bold ${l.active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300'}">${l.active ? '启用中' : '已禁用'}</button></td><td class="p-4"><button onclick="openEditLang('${l.code}')" class="text-blue-500 hover:underline">编辑字典</button></td></tr>`).join('');
}

function editArticleGroup(groupId) {
    const group = window.allArticles.filter(a => (a.groupId || a.id) === groupId);
    if (!group || group.length === 0) return;
    const mainArt = group.find(a => a.lang === 'zh') || group[0];
    currentEditArticleGroupId = groupId; currentEditArticleMainLang = mainArt.lang;
    document.getElementById('editArticleId').value = mainArt.id; document.getElementById('artTitle').value = mainArt.title;
    document.getElementById('artSummary').value = mainArt.summary; document.getElementById('artCoverUrl').value = mainArt.coverUrl || '';
    quill.root.innerHTML = mainArt.content || '';
    document.getElementById('articleFormTitle').innerText = '编辑文章整组 (源语言: ' + mainArt.lang + ')';
    document.getElementById('articleSubmitBtn').innerText = '保存并翻译整组';
    document.getElementById('articleCancelBtn').classList.remove('hidden');
    
    const checkboxes = document.getElementById('articleLangCheckboxes').querySelectorAll('input');
    const existingLangs = group.map(a => a.lang);
    checkboxes.forEach(cb => { cb.checked = existingLangs.includes(cb.value); cb.disabled = (cb.value === mainArt.lang); });
    document.querySelector('#tab-articles').scrollIntoView({ behavior: 'smooth' });
}

function resetArticleForm() {
    currentEditArticleGroupId = null; currentEditArticleMainLang = 'zh';
    document.getElementById('editArticleId').value = ''; document.getElementById('artTitle').value = '';
    document.getElementById('artSummary').value = ''; document.getElementById('artCoverUrl').value = '';
    quill.setContents([]);
    document.getElementById('articleFormTitle').innerText = '发布新文章';
    document.getElementById('articleSubmitBtn').innerText = '智能翻译并发布';
    document.getElementById('articleCancelBtn').classList.add('hidden');
    const checkboxes = document.getElementById('articleLangCheckboxes').querySelectorAll('input');
    checkboxes.forEach(cb => { cb.disabled = (cb.value === 'zh'); cb.checked = (cb.value === 'zh'); });
}

async function submitArticle() {
    const groupId = currentEditArticleGroupId;
    const title = document.getElementById('artTitle').value; const summary = document.getElementById('artSummary').value;
    const coverUrl = document.getElementById('artCoverUrl').value; const content = quill.root.innerHTML;
    if (!title) return alert('请输入标题');
    const checkedLangs = Array.from(document.querySelectorAll('#articleLangCheckboxes input:checked')).map(cb => cb.value);
    if (checkedLangs.length === 0) return alert('请至少勾选一个发布语言');
    const btn = document.getElementById('articleSubmitBtn'); const originalText = btn.innerText;
    btn.innerText = '正在处理...'; btn.disabled = true;
    try {
        if (groupId) {
            const res = await fetch(`/api/admin/article/group/${groupId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ sourceLang: currentEditArticleMainLang, targetLangs: checkedLangs, title, summary, content, coverUrl }) });
            const data = await res.json();
            if (data.success) { alert('保存成功！'); resetArticleForm(); fetchData(); } else alert(formatTranslateError(data));
        } else {
            const res = await fetch('/api/admin/article/translate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ title, summary, content, coverUrl, targetLangs: checkedLangs }) });
            const data = await res.json();
            if (data.success) { alert('发布成功！'); resetArticleForm(); fetchData(); } else alert(formatTranslateError(data));
        }
    } catch (e) { alert('网络错误'); } finally { btn.innerText = originalText; btn.disabled = false; }
}

function populateReviewLangSelects(languages) {
    const cbContainer = document.getElementById('reviewLangCheckboxes');
    if (cbContainer) {
        cbContainer.innerHTML = languages.filter(l => l.active).map(l => `<label class="flex items-center gap-1 text-sm cursor-pointer"><input type="checkbox" value="${l.code}" class="accent-blue-500" ${l.code === 'zh' ? 'checked disabled' : ''}>${l.flag} ${l.name}</label>`).join('');
    }
    const langSel = document.getElementById('revLang');
    if (langSel) {
        const prev = langSel.value; langSel.innerHTML = languages.filter(l => l.active).map(l => `<option value="${l.code}">${l.flag} ${l.name} (${l.code})</option>`).join('');
        if (prev) langSel.value = prev;
    }
    const filterSel = document.getElementById('reviewFilterLang');
    if (filterSel) {
        const prevFilter = filterSel.value; filterSel.innerHTML = '<option value="all">全部语言</option>' + languages.map(l => `<option value="${l.code}">${l.flag} ${l.name}</option>`).join('');
        if (prevFilter) filterSel.value = prevFilter;
    }
}

function renderReviewList() {
    const reviews = window.allReviews || [];
    const filterLang = document.getElementById('reviewFilterLang').value;
    const langs = window.allLangs || [];
    const langMap = {}; langs.forEach(l => langMap[l.code] = l);
    let filtered = reviews; if (filterLang !== 'all') filtered = filtered.filter(r => r.lang === filterLang);
    const countEl = document.getElementById('reviewCount');
    if (countEl) countEl.innerText = filterLang === 'all' ? `(${reviews.length})` : `(${filtered.length} / ${reviews.length})`;
    const listEl = document.getElementById('reviewList');
    if (filtered.length === 0) { listEl.innerHTML = '<div class="text-center text-gray-500 py-4">暂无评论</div>'; return; }
    listEl.innerHTML = filtered.slice().reverse().map(r => {
        const langObj = langMap[r.lang] || { name: r.lang, flag: '🌐' };
        const s = Math.max(0, Math.min(5, Number(r.stars) || 0));
        const stars = '★'.repeat(s) + '☆'.repeat(5 - s);
        return `
            <div class="border border-gray-200 dark:border-slate-700 p-3 rounded bg-white dark:bg-[#0f172a]">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-1"><span class="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase">${r.lang}</span><span class="text-sm">${langObj.flag} ${langObj.name}</span></div>
                        <div class="text-yellow-400 text-sm mb-1 tracking-widest">${stars}</div>
                        <div class="font-bold text-sm text-gray-900 dark:text-slate-200">${r.name}</div>
                    </div>
                    <div class="flex gap-2"><button onclick="editReview('${r.id}')" class="text-blue-500 text-xs hover:underline">编辑</button><button onclick="deleteReview('${r.id}')" class="text-red-500 text-xs hover:underline">删除</button></div>
                </div>
                <p class="text-sm text-gray-600 dark:text-slate-400 italic mt-1">"${r.text}"</p>
            </div>`;
    }).join('');
}

function editReview(id) {
    const review = (window.allReviews || []).find(r => r.id === id); if (!review) return;
    document.getElementById('editReviewId').value = review.id; document.getElementById('revLang').value = review.lang;
    document.getElementById('revStars').value = review.stars; document.getElementById('revName').value = review.name;
    document.getElementById('revText').value = review.text;
    document.getElementById('reviewFormTitle').innerText = '编辑评论 (' + review.lang + ')';
    document.getElementById('reviewSubmitBtn').innerText = '保存修改';
    document.getElementById('reviewCancelBtn').classList.remove('hidden');
    document.getElementById('reviewLangCheckboxBox').classList.add('hidden');
    document.getElementById('reviewLangSelectBox').classList.remove('hidden');
    document.getElementById('reviewFormTitle').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function resetReviewForm() {
    document.getElementById('editReviewId').value = ''; document.getElementById('revStars').value = '5';
    document.getElementById('revName').value = ''; document.getElementById('revText').value = '';
    document.getElementById('reviewFormTitle').innerText = '发布评论';
    document.getElementById('reviewSubmitBtn').innerText = '智能翻译并发布';
    document.getElementById('reviewCancelBtn').classList.add('hidden');
    document.getElementById('reviewLangCheckboxBox').classList.remove('hidden');
    document.getElementById('reviewLangSelectBox').classList.add('hidden');
}

async function saveReview() {
    const id = document.getElementById('editReviewId').value;
    const stars = Number(document.getElementById('revStars').value);
    const name = document.getElementById('revName').value.trim(); const text = document.getElementById('revText').value.trim();
    if (!name) return alert('请填写用户名'); if (!text) return alert('请填写评论内容');
    if (id) {
        const lang = document.getElementById('revLang').value;
        if (!lang) return alert('请选择语言');
        const res = await fetch(`/api/admin/reviews/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ lang, stars, name, text }) });
        if (res.ok) { resetReviewForm(); fetchData(); } else alert('操作失败');
    } else {
        const checkedLangs = Array.from(document.querySelectorAll('#reviewLangCheckboxes input:checked')).map(cb => cb.value);
        if (!checkedLangs.includes('zh')) checkedLangs.push('zh');
        const btn = document.getElementById('reviewSubmitBtn'); const originalText = btn.innerText;
        btn.innerText = '正在翻译发布...'; btn.disabled = true;
        try {
            const res = await fetch('/api/admin/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ targetLangs: checkedLangs, stars, name, text }) });
            const data = await res.json();
            if (data.success) { alert('发布成功！'); resetReviewForm(); fetchData(); } else alert(formatTranslateError(data));
        } catch (e) { alert('网络错误'); } finally { btn.innerText = originalText; btn.disabled = false; }
    }
}

async function deleteReview(id) { if (!confirm('确认删除该评论？')) return; await fetch('/api/admin/reviews/' + id, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); }

function updateReviewModeButtons(mode) {
    const allBtn = document.getElementById('modeBtn-all'); const matchBtn = document.getElementById('modeBtn-match');
    if (!allBtn || !matchBtn) return;
    if (mode === 'match') { matchBtn.className = 'px-3 py-1 rounded text-xs font-bold bg-blue-600 text-white'; allBtn.className = 'px-3 py-1 rounded text-xs font-bold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'; } 
    else { allBtn.className = 'px-3 py-1 rounded text-xs font-bold bg-blue-600 text-white'; matchBtn.className = 'px-3 py-1 rounded text-xs font-bold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300'; }
}

async function setReviewMode(mode) {
    try {
        const res = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ reviewMode: mode }) });
        if (!res.ok) return alert('设置失败');
        currentReviewMode = mode; updateReviewModeButtons(mode);
        alert(mode === 'match' ? '已切换：按用户当前语言随机展示评论' : '已切换：全部评论随机展示');
    } catch (e) { alert('设置失败'); }
}

async function uploadSafariLogo() {
    const fileInput = document.getElementById('safariLogoFile');
    if (!fileInput.files[0]) return alert('请先选择图片');
    const btn = event.target; const originalText = btn.innerText;
    btn.innerText = '上传中...'; btn.disabled = true;
    try {
        const url = await uploadImage(fileInput.files[0]);
        if (!url) throw new Error('上传失败');
        await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ safariLogo: url }) });
        alert('LOGO 保存成功'); fileInput.value = ''; fetchData();
    } catch (e) { alert('网络错误或上传失败'); } 
    finally { btn.innerText = originalText; btn.disabled = false; }
}

async function savePartner() {
    const id = document.getElementById('editPartnerId').value;
    const name = document.getElementById('pName').value; const imageUrl = document.getElementById('pImageUrl').value;
    if (!name) return alert('请填写商家名称');
    let url = '/api/admin/partners'; let method = 'POST';
    if (id) { url = `/api/admin/partners/${id}`; method = 'PUT'; }
    await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ name, imageUrl }) });
    resetPartnerForm(); fetchData();
}
function editPartner(id) {
    const p = (window.allPartners || []).find(item => item.id === id); if (!p) return;
    document.getElementById('editPartnerId').value = p.id; document.getElementById('pName').value = p.name; document.getElementById('pImageUrl').value = p.imageUrl || '';
    document.getElementById('partnerFormTitle').innerText = '编辑合作商家'; document.getElementById('partnerSubmitBtn').innerText = '保存修改';
    document.getElementById('partnerCancelBtn').classList.remove('hidden');
}
function resetPartnerForm() {
    document.getElementById('editPartnerId').value = ''; document.getElementById('pName').value = ''; document.getElementById('pFile').value = ''; document.getElementById('pImageUrl').value = '';
    document.getElementById('partnerFormTitle').innerText = '添加合作商家'; document.getElementById('partnerSubmitBtn').innerText = '添加';
    document.getElementById('partnerCancelBtn').classList.add('hidden');
}
async function deletePartner(id) { if (!confirm('确认删除？')) return; await fetch('/api/admin/partners/' + id, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); }
async function deleteOffer(id) { if (!confirm('确认删除？')) return; await fetch('/api/admin/offers/' + id, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); }
async function deleteArticleGroup(groupId) { if (!confirm('确认删除该组下所有语言的文章吗？')) return; await fetch('/api/admin/article-group/' + groupId, { method: 'DELETE', headers: { 'x-admin-pwd': adminPwd } }); fetchData(); }
async function addOffer() {
    const payload = { category: document.getElementById('oCategory').value, color: document.getElementById('oColor').value, title: document.getElementById('oTitle').value, reward: document.getElementById('oReward').value };
    if (!payload.title || !payload.reward) return alert('请填写完整');
    await fetch('/api/admin/offers', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify(payload) });
    fetchData();
}
async function addLanguage() {
    const code = document.getElementById('newLangCode').value.trim(); const name = document.getElementById('newLangName').value.trim(); const flag = document.getElementById('newLangFlag').value.trim();
    if (!code || !name) return alert('请填写语言代码和名称');
    const res = await fetch('/api/admin/languages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ code, name, flag }) });
    const data = await res.json();
    if (data.success) { document.getElementById('newLangCode').value = ''; document.getElementById('newLangName').value = ''; document.getElementById('newLangFlag').value = ''; fetchData(); } 
    else alert(data.error);
}
async function toggleLangStatus(code, currentStatus) { await fetch(`/api/admin/languages/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ active: !currentStatus }) }); fetchData(); }
function openEditLang(code) { const l = (window.allLangs || []).find(item => item.code === code); if (!l) return; document.getElementById('editLangCode').value = l.code; document.getElementById('editLangDict').value = JSON.stringify(l.dict, null, 2); document.getElementById('editLangModal').classList.add('active'); }
async function saveLangDict() {
    const code = document.getElementById('editLangCode').value;
    try {
        const dict = JSON.parse(document.getElementById('editLangDict').value);
        await fetch(`/api/admin/languages/${code}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-pwd': adminPwd }, body: JSON.stringify({ dict }) });
        document.getElementById('editLangModal').classList.remove('active'); fetchData();
    } catch (e) { alert('JSON 格式错误'); }
}

document.addEventListener('DOMContentLoaded', () => {
    if (adminPwd) document.getElementById('loginOverlay').classList.add('hidden');
    if (document.getElementById('editor-container')) {
        quill = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    }
    document.getElementById('artCoverFile').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; document.getElementById('artCoverUrl').value = await uploadImage(file); });
    quill.getModule('toolbar').addHandler('image', () => { const input = document.createElement('input'); input.setAttribute('type', 'file'); input.setAttribute('accept', 'image/*'); input.click(); input.onchange = async () => { const file = input.files[0]; const url = await uploadImage(file); if (url) { const range = quill.getSelection(true); quill.insertEmbed(range.index, 'image', url); } }; });
    document.getElementById('pFile').addEventListener('change', async (e) => { const file = e.target.files[0]; if (!file) return; document.getElementById('pImageUrl').value = await uploadImage(file); });
    applyAdminLang();
    tryAutoLogin();
});
