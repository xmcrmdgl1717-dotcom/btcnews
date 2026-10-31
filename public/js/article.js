async function initLang() {
    try {
        const res = await fetch('/api/languages');
        const langs = await res.json();
        if(langs.length > 0) {
            const savedLang = localStorage.getItem('wad_lang') || langs[0].code;
            const dict = (langs.find(l => l.code === savedLang) || langs[0]).dict;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key]) {
                    if (el.tagName === 'A' && key === 'backHome') el.innerHTML = `&larr; ${dict[key]}`;
                    else el.innerText = dict[key];
                }
            });
        }
    } catch(e) {}
}

async function loadArticle() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && id !== 'default') {
        fetch(`/api/articles/${id}`).then(res => res.json()).then(data => {
            if (data) {
                document.title = data.title + " - W-Airdrop";
                document.getElementById('title').innerText = data.title;
                document.getElementById('time').innerText = new Date(data.time).toLocaleString();
                if(data.coverUrl) { const img = document.getElementById('cover'); img.src = data.coverUrl; img.classList.remove('hidden'); }
                document.getElementById('content').innerHTML = data.content;
            } else {
                // 找不到文章时的容错
                document.getElementById('title').innerText = "文章不存在或已被删除";
                document.getElementById('content').innerHTML = "<p class='text-gray-500'>请返回首页查看其他内容。</p>";
            }
        }).catch(e => {
            document.getElementById('title').innerText = "网络错误，加载失败";
        });
    } else {
        document.getElementById('title').innerText = "比特币一度跌破8万美元：三星引发科技股震荡，美联储鹰派立场施压";
        document.getElementById('content').innerHTML = "<p>受三星电子引发的科技股疲软以及美联储维持鹰派立场影响，全球市场避险情绪升温，比特币跌破8万美元。</p><p>加密货币期货市场爆仓金额达3.56亿美元。周四亚洲交易时段，比特币一度跌破8万美元，终结此前连续两天的反弹势头。</p>";
        const img = document.getElementById('cover'); img.src = "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?q=80&w=800&auto=format&fit=crop"; img.classList.remove('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initLang();
    loadArticle();
});