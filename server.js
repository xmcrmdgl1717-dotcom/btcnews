const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'db');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

// 初始化目录
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// 初始化 JSON 数据库文件
const DB_FILES = {
    users: path.join(DB_DIR, 'users.json'),
    articles: path.join(DB_DIR, 'articles.json'),
    surveys: path.join(DB_DIR, 'surveys.json'), // 包含题目和用户提交
    settings: path.join(DB_DIR, 'settings.json')
};

Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = key === 'surveys' ? { questions: [], submissions: [] } : [];
        fs.writeFileSync(DB_FILES[key], JSON.stringify(initialData, null, 2));
    }
});

const readDB = (key) => JSON.parse(fs.readFileSync(DB_FILES[key]));
const writeDB = (key, data) => fs.writeFileSync(DB_FILES[key], JSON.stringify(data, null, 2));

app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOAD_DIR));

// === 图片上传配置 ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${uuidv4()}${ext}`);
    }
});
const upload = multer({ storage });

// ================= 前台 API =================

// 注册
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const users = readDB('users');
    if (users.find(u => u.email === email)) return res.status(400).json({ error: '邮箱已注册' });
    users.push({ id: uuidv4(), email, password, time: new Date().toISOString() });
    writeDB('users', users);
    res.json({ success: true });
});

// 获取跑马灯数据（取真实用户+补全假数据）
app.get('/api/marquee', (req, res) => {
    const users = readDB('users').slice(-10).reverse(); // 取最近10个
    let list = users.map(u => ({ name: u.email.split('@')[0], amount: (Math.random() * 500).toFixed(0) }));
    
    const fakeNames = ['Lutali', 'Chimmy', 'Peter', 'Hoang Ha', 'Anon', 'Whe...', 'Safa'];
    while (list.length < 15) {
        list.push({ name: fakeNames[Math.floor(Math.random()*fakeNames.length)], amount: (Math.random() * 2000).toFixed(0) });
    }
    res.json(list);
});

// 获取最新文章 (按语言)
app.get('/api/articles/latest', (req, res) => {
    const { lang = 'zh' } = req.query;
    const articles = readDB('articles').filter(a => a.lang === lang).sort((a,b) => new Date(b.time) - new Date(a.time));
    res.json(articles[0] || null);
});

// 获取指定文章
app.get('/api/articles/:id', (req, res) => {
    const articles = readDB('articles');
    res.json(articles.find(a => a.id === req.params.id) || null);
});

// 提交问卷
app.post('/api/survey', (req, res) => {
    const { answers } = req.body;
    const surveyData = readDB('surveys');
    surveyData.submissions.push({ id: uuidv4(), answers, time: new Date().toISOString() });
    writeDB('surveys', surveyData);
    res.json({ success: true });
});

// 获取问卷题目
app.get('/api/survey/questions', (req, res) => {
    res.json(readDB('surveys').questions);
});

// ================= 后台 API =================

const ADMIN_PWD = 'admin888';

// 登录验证中间件
const auth = (req, res, next) => {
    const pwd = req.headers['x-admin-pwd'] || req.query.pwd;
    if (pwd !== ADMIN_PWD) return res.status(403).json({ error: '密码错误' });
    next();
};

// 文件上传接口
app.post('/api/admin/upload', auth, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '无文件' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// 获取后台所有数据
app.get('/api/admin/data', auth, (req, res) => {
    res.json({
        users: readDB('users'),
        articles: readDB('articles'),
        surveys: readDB('surveys')
    });
});

// 发布文章
app.post('/api/admin/article', auth, (req, res) => {
    const { lang, title, summary, content, coverUrl } = req.body;
    const articles = readDB('articles');
    articles.push({ id: uuidv4(), lang, title, summary, content, coverUrl, time: new Date().toISOString() });
    writeDB('articles', articles);
    res.json({ success: true });
});

// 删除文章
app.delete('/api/admin/article/:id', auth, (req, res) => {
    let articles = readDB('articles');
    articles = articles.filter(a => a.id !== req.params.id);
    writeDB('articles', articles);
    res.json({ success: true });
});

// 更新问卷题目
app.post('/api/admin/survey/questions', auth, (req, res) => {
    const surveyData = readDB('surveys');
    surveyData.questions = req.body.questions;
    writeDB('surveys', surveyData);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server on port ${PORT}`));
