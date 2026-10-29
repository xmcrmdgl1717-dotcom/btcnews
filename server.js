const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'database.json');

app.use(express.json());
app.use(express.static('public'));

// 初始化数据文件
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], surveys: [], news: [] }, null, 2));
}

// 读取数据
const readDB = () => JSON.parse(fs.readFileSync(DB_FILE));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

// === API 路由 ===

// 1. 注册/登录
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: '缺少参数' });

    const db = readDB();
    const exists = db.users.find(u => u.email === email);
    if (exists) return res.status(400).json({ error: '该邮箱已注册' });

    db.users.push({ email, password, time: new Date().toISOString() });
    writeDB(db);
    res.json({ success: true, message: '注册成功' });
});

// 2. 提交问卷
app.post('/api/survey', (req, res) => {
    const { email, answers } = req.body;
    const db = readDB();
    db.surveys.push({ email: email || '匿名', answers, time: new Date().toISOString() });
    writeDB(db);
    res.json({ success: true });
});

// 3. 获取最新新闻 (前端首页用)
app.get('/api/news/latest', (req, res) => {
    const db = readDB();
    // 返回最新的一条新闻
    const latestNews = db.news.sort((a, b) => new Date(b.time) - new Date(a.time))[0];
    res.json(latestNews || null);
});

// 4. 获取指定新闻 (文章页用)
app.get('/api/news/:id', (req, res) => {
    const db = readDB();
    const news = db.news.find(n => n.id === req.params.id);
    res.json(news || null);
});

// 5. 后台：发布新闻
app.post('/api/admin/news', (req, res) => {
    const { title, summary, content, password } = req.body;
    if (password !== 'admin888') return res.status(403).json({ error: '密码错误' });

    const db = readDB();
    db.news.push({
        id: Date.now().toString(),
        title,
        summary,
        content,
        time: new Date().toISOString()
    });
    writeDB(db);
    res.json({ success: true });
});

// 6. 后台：获取所有注册信息
app.get('/api/admin/data', (req, res) => {
    const { password } = req.query;
    if (password !== 'admin888') return res.status(403).json({ error: '密码错误' });

    const db = readDB();
    res.json({ users: db.users, surveys: db.surveys, news: db.news });
});

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});