let adminPwd = sessionStorage.getItem('wad_admin_pwd') || localStorage.getItem('wad_admin_pwd') || '';
let quill = null;
let allVisits = [];
let currentSurveySourceLang = 'zh';
let currentReviewMode = 'all';
let currentEditArticleGroupId = null;
let currentEditArticleMainLang = 'zh';

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

// ... [此处需要把之前 admin.html 里的 doLogin, tryAutoLogin, logout, switchTab, uploadImage 等所有函数原样复制过来] ...
// 注意：所有需要操作 DOM 的初始化代码放在最后的 DOMContentLoaded 中执行。

document.addEventListener('DOMContentLoaded', () => {
    if (adminPwd) document.getElementById('loginOverlay').classList.add('hidden');

    if (document.getElementById('editor-container')) {
        quill = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [ [{ header: [1, 2, false] }], ['bold', 'italic', 'underline'], ['image'], ['clean'] ] } });
    }

    // 事件绑定 (原本在 HTML 里的 onclick 可以通过 JS 绑定，或者保留 HTML 里的 onclick 调用全局函数)
    // 为了减少改动，建议将上面的函数放在全局作用域，HTML 中依然写 onclick="doLogin()"

    applyAdminLang();
    tryAutoLogin();
});
