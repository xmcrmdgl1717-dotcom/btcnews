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
    tasks: path.join(DB_DIR, 'tasks.json')
};

Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'surveys') initialData = { questions: [], submissions: [] };
        if (key === 'tasks') initialData = [
            { id: 1, type: 'survey', title: 'DeFi 认知问卷', reward: 180, time: '2 分钟', desc: '8 道选择题' },
            { id: 2, type: 'offer', title: '注册并验证钱包', reward: 420, time: '5 分钟', desc: '完成钱包注册与邮箱验证' },
            { id: 3, type: 'video', title: '观看产品短片', reward: 60, time: '3 分钟', desc: '观看短片并回答 1 个问题' }
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

// ================= 前台 & 用户 API =================

app.get('/api/marquee', (req, res) => {
    const users = readDB('users').slice(-10).reverse();
    let list = users.map(u => ({ name: u.email.split('@')[0], amount: (Math.random() * 500).toFixed(0) }));
    const fakeNames = ['Lutali', 'Chimmy', 'Peter', 'Hoang Ha', 'Anon', 'Whe...', 'Safa'];
    while (list.length < 15) {
        list.push({ name: fakeNames[Math.floor(Math.random()*fakeNames.length)], amount: (Math.random() * 2000).toFixed(0) });
    }
    res.json(list);
});

app.post('/api/register', (req, res) => {
    const { email, password, payPassword } = req.body;
    const users = readDB('users');
    if (users.find(u => u.email === email)) return res.status(400).json({ error: '邮箱已注册' });
    
    const newUser = { 
        id: uuidv4(), email, password, payPassword: payPassword || '',
        balance: 0, totalEarned: 0, time: new Date().toISOString() 
    };
    users.push(newUser);
    writeDB('users', users);
    res.json({ success: true, user: newUser });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const users = readDB('users');
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        res.json({ success: true, user: { email: user.email, balance: user.balance || 0 } });
    } else {
        res.status(401).json({ error: '邮箱或密码错误' });
    }
});

// 排行榜接口 (前 100 名，含真实+假数据)
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
        list.push({
            name: fakeNames[Math.floor(Math.random() * fakeNames.length)] + Math.floor(Math.random() * 99),
            amount: Math.floor(Math.random() * 50000) + 1000,
            avatar: 'U',
            isReal: false
        });
    }

    list.sort((a, b) => b.amount - a.amount);
    res.json(list.slice(0, 100));
});

// 完成任务加余额
app.post('/api/user/tasks/complete', (req, res) => {
    const { email, taskId, reward } = req.body;
    const users = readDB('users');
    const user = users.find(u => u.email === email);
    if (user) {
        user.balance = (user.balance || 0) + reward;
        user.totalEarned = (user.totalEarned || 0) + reward;
        writeDB('users', users);
        res.json({ success: true, balance: user.balance, totalEarned: user.totalEarned });
    } else {
        res.status(404).json({ error: '用户不存在' });
    }
});

// 问卷提交与获取
app.get('/api/survey/questions', (req, res) => res.json(readDB('surveys').questions));
app.post('/api/survey', (req, res) => {
    const surveyData = readDB('surveys');
    surveyData.submissions.push({ id: uuidv4(), answers: req.body.answers, time: new Date().toISOString() });
    writeDB('surveys', surveyData);
    res.json({ success: true });
});

// 新闻获取
app.get('/api/articles/latest', (req, res) => {
    const { lang = 'zh' } = req.query;
    const articles = readDB('articles').filter(a => a.lang === lang).sort((a,b) => new Date(b.time) - new Date(a.time));
    res.json(articles[0] || null);
});
app.get('/api/articles/:id', (req, res) => {
    res.json(readDB('articles').find(a => a.id === req.params.id) || null);
});

// ================= 后台 API =================
const ADMIN_PWD = 'admin888';
const auth = (req, res, next) => {
    const pwd = req.headers['x-admin-pwd'] || req.query.pwd;
    if (pwd !== ADMIN_PWD) return res.status(403).json({ error: '密码错误' });
    next();
};

app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => {
    res.json({ url: `/uploads/${req.file.filename}` });
});

app.get('/api/admin/data', auth, (req, res) => {
    res.json({
        users: readDB('users'),
        articles: readDB('articles'),
        surveys: readDB('surveys')
    });
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
