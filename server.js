const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { translate } = require('google-translate-api-x'); // 高稳定性翻译库

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'db');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_FILES = {
    users: path.join(DB_DIR, 'users.json'),
    articles: path.join(DB_DIR, 'articles.json'),
    surveys: path.join(DB_DIR, 'surveys.json'),
    offers: path.join(DB_DIR, 'offers.json'),
    languages: path.join(DB_DIR, 'languages.json'),
    partners: path.join(DB_DIR, 'partners.json')
};

// 默认字典数据
const defaultZhDict = { realtime: "实时", login: "登录", logout: "退出", registerTitle: "注册账号", registerBtn: "注册", heroTitle: "WEB3智能时代 8家顶级公司联合打造空投发送333ETH奖励", heroDesc: "使用我们8家产品的用户都能参加，无需任何操作，简单领取奖励，24小时内免费空投发放。", claimBtn: "免费领取", stat1: "累计发放", stat2: "注册用户", stat3: "每日打款", stat4: "Google Play 评分", howTitle: "如何领取", howDesc: "1. 注册账号 → 2. 认真填表 → 3. 领币到账", step1Title: "注册账号", step1Desc: "使用邮箱注册，并设置登录密码与支付密码。", step2Title: "认真填表", step2Desc: "认真完成问卷，提交后即具备奖励资格。", step3Title: "领币到账", step3Desc: "随时通过加密货币热门币链进行提现，门槛低，到账时间快。", leaderboardTitle: "幸运用户", viewLeaderboard: "查看完整排行榜 →", reviewsTitle: "用户怎么说", activeUser: "活跃用户", faqTitle: "常见问题", faqDesc: "有问题？我们来帮你。如果这里没有答案，支持团队随时待命。", faqQ1: "如何领取？", faqA1: "只要您有使用我们的8家产品，免费注册登录后，认真完成每一项表格，提交后就能免费领取。", faqQ2: "有哪些领取方式？", faqA2: "支持PayPal、比特币、莱特币、银行转账，以及Amazon、虚拟Visa卡等热门礼品卡。我们会定期增加新方式。", faqQ3: "领取有手续费吗？", faqA3: "大多数方式免手续费，包括莱特币、Solana、虚拟Visa卡和全部礼品卡。银行转账等会收取少量费用以覆盖转账成本。", faqQ4: "领取需要多久？", faqA4: "我们会尽快处理，通常在数小时内完成。", partnersTitle: "陆续增加合作商家", footerTitle: "8 家顶级公司 联合打造 空投发送 333ETH 奖励", footerWarning: "风险提示：加密货币价格波动剧烈，参与任何空投或奖励活动前请自行判断风险。", footerCopy: "© 2024 W-Airdrop. 保留所有权利。", navEarn: "赚钱", navOffers: "优惠", navSurveys: "问卷", navWithdraw: "提现", navRewards: "奖励", navLeaderboard: "排行榜", safariTitle: "请使用 Safari 浏览器打开", safariDesc: "请使用 iPhone / iPad 自带的 Safari 浏览器继续访问。", copyBtn: "复制当前链接", copied: "已复制", hasAccount: "已有账号？", goLogin: "去登录", noAccount: "还没有账号？", goRegister: "立即注册", loginTitle: "登录账号", loginBtn: "登录", labelEmail: "电子邮箱", labelPass: "登录密码", labelConfirm: "确认密码", labelPayPass: "支付密码", surveyTitle: "用户习惯请您认真填写", surveyDesc: "预计耗时: 2 分钟 | 提交即具空投资格", submitSurvey: "提交问卷", readMore: "查看全文" };

const defaultEnDict = { realtime: "Live", login: "Login", logout: "Logout", registerTitle: "Register", registerBtn: "Register", heroTitle: "8 Top Companies Jointly Launch 333 ETH Airdrop", heroDesc: "Users of our 8 products can participate, no action required, simply claim rewards, airdropped for free within 24 hours.", claimBtn: "Claim Free", stat1: "Distributed", stat2: "Users", stat3: "Daily Payouts", stat4: "Play Store Rating", howTitle: "How to Claim", howDesc: "1. Register → 2. Fill Form → 3. Receive Coins", step1Title: "Register", step1Desc: "Sign up with email and set passwords.", step2Title: "Fill Form", step2Desc: "Complete the survey to get qualified.", step3Title: "Receive Coins", step3Desc: "Withdraw via crypto anytime.", leaderboardTitle: "Lucky Users", viewLeaderboard: "View Leaderboard →", reviewsTitle: "What Users Say", activeUser: "Active User", faqTitle: "FAQ", faqDesc: "Need help? Check here.", faqQ1: "How to claim?", faqA1: "Register and complete forms.", faqQ2: "Claim methods?", faqA2: "PayPal, BTC, LTC, Bank, Gift Cards.", faqQ3: "Any fees?", faqA3: "Most are free.", faqQ4: "How long?", faqA4: "Usually within hours.", partnersTitle: "More Partners Coming", footerTitle: "8 Top Companies Jointly Launch 333 ETH Airdrop", footerWarning: "Risk warning: Crypto is volatile.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Earn", navOffers: "Offers", navSurveys: "Surveys", navWithdraw: "Withdraw", navRewards: "Rewards", navLeaderboard: "Leaderboard", safariTitle: "Please open in Safari", safariDesc: "Please use the native Safari browser on iPhone / iPad.", copyBtn: "Copy Link", copied: "Copied", hasAccount: "Have an account?", goLogin: "Login", noAccount: "No account?", goRegister: "Register", loginTitle: "Login", loginBtn: "Login", labelEmail: "Email", labelPass: "Password", labelConfirm: "Confirm Password", labelPayPass: "Pay Password", surveyTitle: "Please fill out the survey", surveyDesc: "Takes 2 mins", submitSurvey: "Submit", readMore: "Read More" };

Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'surveys') initialData = { questions: [], submissions: [] };
        if (key === 'languages') initialData = [
            { code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: defaultZhDict },
            { code: 'en-US', name: 'English (US)', flag: '🇺🇸', active: true, dict: defaultEnDict },
            { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', active: true, dict: defaultEnDict },
            { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', active: true, dict: defaultEnDict },
            { code: 'de', name: 'Deutsch', flag: '🇩🇪', active: true, dict: defaultEnDict },
            { code: 'ar', name: 'العربية', flag: '🇦🇪', active: true, dict: defaultEnDict },
            { code: 'es', name: 'Español', flag: '🇦🇷', active: true, dict: defaultEnDict },
            { code: 'pt', name: 'Português', flag: '🇧🇷', active: true, dict: defaultEnDict },
            { code: 'ko', name: '한국어', flag: '🇰🇷', active: true, dict: defaultEnDict },
            { code: 'uk', name: 'Українська', flag: '🇺🇦', active: true, dict: defaultEnDict },
            { code: 'tr', name: 'Türkçe', flag: '🇹🇷', active: true, dict: defaultEnDict }
        ];
        if (key === 'articles') initialData = [];
        if (key === 'offers') initialData = [];
        if (key === 'partners') initialData = [
            { id: uuidv4(), name: 'Bitget', imageUrl: '' }, { id: uuidv4(), name: 'Bitpie', imageUrl: '' },
            { id: uuidv4(), name: 'Trust Wallet', imageUrl: '' }, { id: uuidv4(), name: 'Phantom', imageUrl: '' },
            { id: uuidv4(), name: 'Solflare', imageUrl: '' }, { id: uuidv4(), name: 'Coin98', imageUrl: '' }
        ];
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage });

// ================= 前台 API =================
app.get('/api/languages', (req, res) => res.json(readDB('languages').filter(l => l.active)));
app.get('/api/partners', (req, res) => res.json(readDB('partners')));
app.get('/api/marquee', (req, res) => {
    const users = readDB('users').slice(-10).reverse();
    let list = users.map(u => ({ name: u.email.split('@')[0], amount: (Math.random() * 500).toFixed(0) }));
    const fakeNames = ['Lutali', 'Chimmy', 'Peter', 'Hoang Ha', 'Anon', 'Whe...', 'Safa'];
    while (list.length < 15) { list.push({ name: fakeNames[Math.floor(Math.random()*fakeNames.length)], amount: (Math.random() * 2000).toFixed(0) }); }
    res.json(list);
});

app.get('/api/offers', (req, res) => res.json(readDB('offers')));
app.post('/api/register', (req, res) => {
    const { email, password, payPassword } = req.body;
    const users = readDB('users');
    if (users.find(u => u.email === email)) return res.status(400).json({ error: '邮箱已注册' });
    const newUser = { id: uuidv4(), email, password, payPassword: payPassword || '', balance: 0, totalEarned: 0, time: new Date().toISOString() };
    users.push(newUser); writeDB('users', users); res.json({ success: true, user: newUser });
});
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const users = readDB('users');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) res.json({ success: true, user: { email: user.email, balance: user.balance || 0 } });
    else res.status(401).json({ error: '邮箱或密码错误' });
});
app.get('/api/leaderboard', (req, res) => {
    const period = req.query.period || 'daily';
    const users = readDB('users');
    let list = users.map(u => ({ name: u.email.split('@')[0], amount: period === 'daily' ? (u.balance || 0) : (u.totalEarned || 0), avatar: u.email[0].toUpperCase(), isReal: true }));
    const fakeNames = ['Johnny Midan', 'Bebazz YT', 'Awatix', 'Puppylover'];
    while (list.length < 100) { list.push({ name: fakeNames[Math.floor(Math.random()*fakeNames.length)] + Math.floor(Math.random()*99), amount: Math.floor(Math.random() * 50000) + 1000, avatar: 'U', isReal: false }); }
    list.sort((a, b) => b.amount - a.amount); res.json(list.slice(0, 100));
});
app.post('/api/user/tasks/complete', (req, res) => {
    const { email, reward } = req.body;
    const users = readDB('users');
    const user = users.find(u => u.email === email);
    if (user) { user.balance = (user.balance || 0) + reward; user.totalEarned = (user.totalEarned || 0) + reward; writeDB('users', users); res.json({ success: true, balance: user.balance, totalEarned: user.totalEarned }); }
    else res.status(404).json({ error: '用户不存在' });
});
app.get('/api/survey/questions', (req, res) => res.json(readDB('surveys').questions));
app.post('/api/survey', (req, res) => {
    const surveyData = readDB('surveys'); surveyData.submissions.push({ id: uuidv4(), answers: req.body.answers, time: new Date().toISOString() });
    writeDB('surveys', surveyData); res.json({ success: true });
});
app.get('/api/articles/latest', (req, res) => {
    const { lang = 'zh' } = req.query;
    const articles = readDB('articles').filter(a => a.lang === lang).sort((a,b) => new Date(b.time) - new Date(a.time));
    res.json(articles.slice(0, 3) || []);
});
app.get('/api/articles/:id', (req, res) => res.json(readDB('articles').find(a => a.id === req.params.id) || null));

// ================= 后台 API =================
const ADMIN_PWD = 'admin888';
const auth = (req, res, next) => {
    const pwd = req.headers['x-admin-pwd'] || req.query.pwd;
    if (pwd !== ADMIN_PWD) return res.status(403).json({ error: '密码错误' });
    next();
};

app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));
app.get('/api/admin/data', auth, (req, res) => {
    res.json({ users: readDB('users'), articles: readDB('articles'), surveys: readDB('surveys'), offers: readDB('offers'), languages: readDB('languages'), partners: readDB('partners') });
});

// 【核心优化：分批并行自动翻译】
app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs } = req.body;
    const articles = readDB('articles');
    
    // 1. 如果勾选了中文，直接存入
    if (targetLangs.includes('zh')) {
        articles.push({ id: uuidv4(), lang: 'zh', title, summary, content, coverUrl, time: new Date().toISOString() });
    }
    
    // 2. 筛选出需要翻译的外语
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    if (foreignLangs.length === 0) {
        writeDB('articles', articles);
        return res.json({ success: true });
    }

    try {
        const translatedArticles = [];
        
        // 3. 分批并行处理 (每批 3 种语言，避免撑爆 Render 内存)
        const batchSize = 3;
        for (let i = 0; i < foreignLangs.length; i += batchSize) {
            const batch = foreignLangs.slice(i, i + batchSize);
            
            const promises = batch.map(async (lang) => {
                const googleLang = lang.split('-')[0]; // en-US -> en
                
                // 对每个语言的标题、摘要、内容同时发起翻译请求，设置超时 15s，重试 3 次
                const [tTitle, tSummary, tContent] = await Promise.all([
                    translate(title, { to: googleLang, requestOptions: { retry: 3, delay: 500, timeout: 15000 } }),
                    translate(summary, { to: googleLang, requestOptions: { retry: 3, delay: 500, timeout: 15000 } }),
                    translate(content, { to: googleLang, requestOptions: { retry: 3, delay: 500, timeout: 15000 } })
                ]);
                
                return { 
                    id: uuidv4(), 
                    lang: lang, 
                    title: tTitle.text, 
                    summary: tSummary.text, 
                    content: tContent.text, 
                    coverUrl, 
                    time: new Date().toISOString() 
                };
            });

            // 等待当前批次的所有翻译请求完成
            const results = await Promise.all(promises);
            translatedArticles.push(...results);
            
            // 批次之间延迟 800ms，防止瞬间请求过于密集被谷歌拦截
            if (i + batchSize < foreignLangs.length) {
                await new Promise(r => setTimeout(r, 800));
            }
        }
        
        // 4. 将翻译好的文章与原有文章合并，一次性写入
        articles.push(...translatedArticles);
        writeDB('articles', articles);
        
        res.json({ success: true });
    } catch (e) {
        console.error('翻译失败:', e.message || e);
        res.status(500).json({ error: '翻译服务部分失败或超时，请重试或减少勾选的语言数量。' });
    }
});

app.put('/api/admin/article/:id', auth, (req, res) => {
    const { lang, title, summary, content, coverUrl } = req.body;
    const articles = readDB('articles');
    const index = articles.findIndex(a => a.id === req.params.id);
    if (index !== -1) { articles[index] = { ...articles[index], lang, title, summary, content, coverUrl }; writeDB('articles', articles); res.json({ success: true }); }
    else res.status(404).json({ error: '文章不存在' });
});
app.delete('/api/admin/article/:id', auth, (req, res) => {
    let articles = readDB('articles').filter(a => a.id !== req.params.id); writeDB('articles', articles); res.json({ success: true });
});
app.post('/api/admin/partners', auth, (req, res) => {
    const { name, imageUrl } = req.body; const partners = readDB('partners');
    partners.push({ id: uuidv4(), name, imageUrl }); writeDB('partners', partners); res.json({ success: true });
});
app.put('/api/admin/partners/:id', auth, (req, res) => {
    const { name, imageUrl } = req.body; const partners = readDB('partners');
    const index = partners.findIndex(p => p.id === req.params.id);
    if (index !== -1) { partners[index] = { ...partners[index], name, imageUrl }; writeDB('partners', partners); res.json({ success: true }); }
    else res.status(404).json({ error: '不存在' });
});
app.delete('/api/admin/partners/:id', auth, (req, res) => {
    let partners = readDB('partners').filter(p => p.id !== req.params.id); writeDB('partners', partners); res.json({ success: true });
});
app.put('/api/admin/languages/:code', auth, (req, res) => {
    const { name, flag, active, dict } = req.body; const languages = readDB('languages');
    const index = languages.findIndex(l => l.code === req.params.code);
    if (index !== -1) { languages[index] = { ...languages[index], name, flag, active, dict }; writeDB('languages', languages); res.json({ success: true }); }
    else res.status(404).json({ error: '语言不存在' });
});
app.put('/api/admin/users/:id', auth, (req, res) => {
    const { balance } = req.body; const users = readDB('users');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index !== -1) { users[index].balance = Number(balance); writeDB('users', users); res.json({ success: true }); }
    else res.status(404).json({ error: '用户不存在' });
});
app.post('/api/admin/survey/questions', auth, (req, res) => {
    const surveyData = readDB('surveys'); surveyData.questions = req.body.questions; writeDB('surveys', surveyData); res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
