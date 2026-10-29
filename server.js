const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

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
    offers: path.join(DB_DIR, 'offers.json') // 新增优惠数据
};

// 初始化数据文件
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'surveys') initialData = { questions: [], submissions: [] };
        if (key === 'offers') initialData = [
            { id: 1, category: 'game', title: 'Raid: Shadow Legends', reward: '384,926', color: '#1e293b' },
            { id: 2, category: 'game', title: 'The Best Bet USA', reward: '58,017', color: '#166534' },
            { id: 3, category: 'game', title: 'Social Casino Spree.com', reward: '45,584', color: '#991b1b' },
            { id: 4, category: 'game', title: 'Frost & Flame: King of Avalon', reward: '672,832', color: '#1e3a8a' },
            { id: 5, category: 'game', title: 'World Of Warships', reward: '10,692', color: '#0369a1' },
            { id: 6, category: 'game', title: 'The Grand Mafia', reward: '573,351', color: '#3f3f46' },
            { id: 7, category: 'game', title: 'RealPrize Casino', reward: '49,737', color: '#7e22ce' },
            { id: 8, category: 'app', title: 'Lonestar Casino', reward: '49,737', color: '#9a3412' },
            { id: 9, category: 'app', title: 'Ignite Classic Slots', reward: '45,593', color: '#831843' },
            { id: 10, category: 'game', title: 'Mafia City', reward: '447,615', color: '#18181b' },
            { id: 11, category: 'game', title: 'Duck Survival', reward: '88,876', color: '#4d7c0f' },
            { id: 12, category: 'app', title: 'Idle Weapon Shop', reward: '125,023', color: '#2563eb' },
            { id: 13, category: 'signup', title: 'Cash Legends™: Win Real Money', reward: '643,933', color: '#047857' },
            { id: 14, category: 'signup', title: 'Legend of Mushroom', reward: '109,898', color: '#9a3412' },
            { id: 15, category: 'app', title: 'Yarnation: Unravel Flow', reward: '45,102', color: '#a21caf' },
            { id: 16, category: 'game', title: 'High 5 Casino', reward: '37,305', color: '#1e3a8a' },
            { id: 17, category: 'signup', title: 'Betterment Invest & Save Money', reward: '25,846', color: '#0f766e' },
            { id: 18, category: 'app', title: 'Can You Spot It - 5 Differences', reward: '86,865', color: '#be185d' }
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

app.get('/api/marquee', (req, res) => {
    const users = readDB('users').slice(-10).reverse();
    let list = users.map(u => ({ name: u.email.split('@')[0], amount: (Math.random() * 500).toFixed(0) }));
    const fakeNames = ['Lutali', 'Chimmy', 'Peter', 'Hoang Ha', 'Anon', 'Whe...', 'Safa'];
    while (list.length < 15) {
        list.push({ name: fakeNames[Math.floor(Math.random()*fakeNames.length)], amount: (Math.random() * 2000).toFixed(0) });
    }
    res.json(list);
});

// 获取优惠列表
app.get('/api/offers', (req, res) => res.json(readDB('offers')));

app.post('/api/register', (req, res) => {
    const { email, password, payPassword } = req.body;
    const users = readDB('users');
    if (users.find(u => u.email === email)) return res.status(400).json({ error: '邮箱已注册' });
    
    const newUser = { id: uuidv4(), email, password, payPassword: payPassword || '', balance: 0, totalEarned: 0, time: new Date().toISOString() };
    users.push(newUser);
    writeDB('users', users);
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
    let list = users.map(u => ({
        name: u.email.split('@')[0],
        amount: period === 'daily' ? (u.balance || 0) : (u.totalEarned || 0),
        avatar: u.email[0].toUpperCase(),
        isReal: true
    }));
    const fakeNames = ['Johnny Midan', 'Bebazz YT', 'Awatix', 'ItzGyNoRmOuS', 'Puppylover', 'Quang Nguyễn Minh', 'Khuong nguyen', 'Safa', 'Peter Hoffmann', 'Lutali', 'ChimmyChanga', 'Ove'];
    while (list.length < 100) {
        list.push({ name: fakeNames[Math.floor(Math.random() * fakeNames.length)] + Math.floor(Math.random() * 99), amount: Math.floor(Math.random() * 50000) + 1000, avatar: 'U', isReal: false });
    }
    list.sort((a, b) => b.amount - a.amount);
    res.json(list.slice(0, 100));
});

app.post('/api/user/tasks/complete', (req, res) => {
    const { email, reward } = req.body;
    const users = readDB('users');
    const user = users.find(u => u.email === email);
    if (user) {
        user.balance = (user.balance || 0) + reward;
        user.totalEarned = (user.totalEarned || 0) + reward;
        writeDB('users', users);
        res.json({ success: true, balance: user.balance, totalEarned: user.totalEarned });
    } else res.status(404).json({ error: '用户不存在' });
});

app.get('/api/survey/questions', (req, res) => res.json(readDB('surveys').questions));
app.post('/api/survey', (req, res) => {
    const surveyData = readDB('surveys');
    surveyData.submissions.push({ id: uuidv4(), answers: req.body.answers, time: new Date().toISOString() });
    writeDB('surveys', surveyData);
    res.json({ success: true });
});

app.get('/api/articles/latest', (req, res) => {
    const { lang = 'zh' } = req.query;
    const articles = readDB('articles').filter(a => a.lang === lang).sort((a,b) => new Date(b.time) - new Date(a.time));
    res.json(articles[0] || null);
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
    res.json({ users: readDB('users'), articles: readDB('articles'), surveys: readDB('surveys'), offers: readDB('offers') });
});

app.post('/api/admin/offers', auth, (req, res) => {
    const { category, title, reward, color } = req.body;
    const offers = readDB('offers');
    offers.push({ id: uuidv4(), category, title, reward, color });
    writeDB('offers', offers);
    res.json({ success: true });
});

app.delete('/api/admin/offers/:id', auth, (req, res) => {
    let offers = readDB('offers').filter(o => o.id !== req.params.id);
    writeDB('offers', offers);
    res.json({ success: true });
});

app.post('/api/admin/article', auth, (req, res) => {
    const { lang, title, summary, content, coverUrl } = req.body;
    const articles = readDB('articles');
    articles.push({ id: uuidv4(), lang, title, summary, content, coverUrl, time: new Date().toISOString() });
    writeDB('articles', articles);
    res.json({ success: true });
});

app.delete('/api/admin/article/:id', auth, (req, res) => {
    let articles = readDB('articles').filter(a => a.id !== req.params.id);
    writeDB('articles', articles);
    res.json({ success: true });
});

app.post('/api/admin/survey/questions', auth, (req, res) => {
    const surveyData = readDB('surveys');
    surveyData.questions = req.body.questions;
    writeDB('surveys', surveyData);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
