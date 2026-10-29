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
    users: path.join(DB_DIR, 'users.json'),
    articles: path.join(DB_DIR, 'articles.json'),
    surveys: path.join(DB_DIR, 'surveys.json'),
    offers: path.join(DB_DIR, 'offers.json'),
    languages: path.join(DB_DIR, 'languages.json'),
    partners: path.join(DB_DIR, 'partners.json')
};

// ================= 完整全量多语言字典 (已将 lbTitle 改为 幸运用户) =================
const dictZh = { realtime: "实时", login: "登录", logout: "退出", registerTitle: "注册账号", registerBtn: "注册", heroTitle: "WEB3智能时代 8家顶级公司联合打造空投发送333ETH奖励", heroDesc: "使用我们8家产品的用户都能参加，无需任何操作，简单领取奖励，24小时内免费空投发放。", claimBtn: "免费领取", stat1: "累计发放", stat2: "注册用户", stat3: "每日打款", stat4: "Google Play 评分", howTitle: "如何领取", howDesc: "1. 注册账号 → 2. 认真填表 → 3. 领币到账", step1Title: "注册账号", step1Desc: "使用邮箱注册，并设置登录密码与支付密码。", step2Title: "认真填表", step2Desc: "认真完成问卷，提交后即具备奖励资格。", step3Title: "领币到账", step3Desc: "随时通过加密货币热门币链进行提现，门槛低，到账时间快。", leaderboardTitle: "幸运用户", viewLeaderboard: "查看完整排行榜 →", reviewsTitle: "用户怎么说", activeUser: "活跃用户", faqTitle: "常见问题", faqDesc: "有问题？我们来帮你。如果这里没有答案，支持团队随时待命。", faqQ1: "如何领取？", faqA1: "只要您有使用我们的8家产品，免费注册登录后，认真完成每一项表格，提交后就能免费领取。", faqQ2: "有哪些领取方式？", faqA2: "支持PayPal、比特币、莱特币、银行转账，以及Amazon、虚拟Visa卡等热门礼品卡。我们会定期增加新方式。", faqQ3: "领取有手续费吗？", faqA3: "大多数方式免手续费，包括莱特币、Solana、虚拟Visa卡和全部礼品卡。银行转账等会收取少量费用以覆盖转账成本。", faqQ4: "领取需要多久？", faqA4: "我们会尽快处理，通常在数小时内完成。", partnersTitle: "陆续增加合作商家", footerTitle: "8 家顶级公司 联合打造 空投发送 333ETH 奖励", footerWarning: "风险提示：加密货币价格波动剧烈，参与任何空投或奖励活动前请自行判断风险。", footerCopy: "© 2024 W-Airdrop. 保留所有权利。", navEarn: "赚钱", navOffers: "优惠", navSurveys: "问卷", navWithdraw: "提现", navRewards: "奖励", navLeaderboard: "排行榜", safariTitle: "请使用 Safari 浏览器打开", safariDesc: "请使用 iPhone / iPad 自带的 Safari 浏览器继续访问。", copyBtn: "复制当前链接", copied: "已复制", hasAccount: "已有账号？", goLogin: "去登录", noAccount: "还没有账号？", goRegister: "立即注册", loginTitle: "登录账号", loginBtn: "登录", labelEmail: "电子邮箱", labelPass: "登录密码", labelConfirm: "确认密码", labelPayPass: "支付密码", surveyTitle: "用户习惯请您认真填写", surveyDesc: "预计耗时: 2 分钟 | 提交即具空投资格", submitSurvey: "提交问卷", readMore: "查看全文", surveyQ1: "您平时最经常使用的加密钱包是哪一款？", surveyOpt1_1: "Bitget / Bitpie 钱包", surveyOpt1_2: "Trust Wallet / Phantom钱包", surveyOpt1_3: "Solflare / Coin98 钱包", surveyOpt1_4: "Uniswap / Exodus钱包", surveyQ2: "您使用加密钱包的主要用途是什么？", surveyOpt2_1: "DApp交互与 DeFi理财", surveyOpt2_2: "代币 Swap(交换)闪兑交易", surveyOpt2_3: "NFT收藏与交易", surveyOpt2_4: "资产长期存储与转账", dashTitle: "赚钱", dashDesc: "完成优惠、问卷和游戏，立即获得金币。", offerWall: "优惠墙", taskAvailable: "可做任务", watchVideo: "看视频", startTask: "开始任务", withdrawTitle: "申请提现", withdrawMethod: "提现方式", withdrawAmount: "金额 (最低 500 金币)", withdrawAccount: "接收账号/地址", submitApply: "提交申请", searchPlaceholder: "搜索优惠", catAll: "全部", catGame: "游戏", catApp: "应用", catSignup: "注册", startEarning: "开始赚钱", lbTitle: "幸运用户", lbDesc: "与其他用户竞争，登上每日和每月排行榜赢取额外金币。", daily: "每日", monthly: "每月", rankUser: "排名 / 用户", earnings: "收益", you: "你", backHome: "返回首页", exit: "退出" };

const dictEn = { realtime: "Live", login: "Login", logout: "Logout", registerTitle: "Register", registerBtn: "Register", heroTitle: "8 Top Companies Jointly Launch 333 ETH Airdrop", heroDesc: "Users of our 8 products can participate, no action required, simply claim rewards, airdropped for free within 24 hours.", claimBtn: "Claim Free", stat1: "Distributed", stat2: "Users", stat3: "Daily Payouts", stat4: "Play Store Rating", howTitle: "How to Claim", howDesc: "1. Register → 2. Fill Form → 3. Receive Coins", step1Title: "Register", step1Desc: "Sign up with email and set passwords.", step2Title: "Fill Form", step2Desc: "Complete the survey to get qualified.", step3Title: "Receive Coins", step3Desc: "Withdraw via crypto anytime.", leaderboardTitle: "Lucky Users", viewLeaderboard: "View Leaderboard →", reviewsTitle: "What Users Say", activeUser: "Active User", faqTitle: "FAQ", faqDesc: "Need help? Check here.", faqQ1: "How to claim?", faqA1: "Register and complete forms.", faqQ2: "Claim methods?", faqA2: "PayPal, BTC, LTC, Bank, Gift Cards.", faqQ3: "Any fees?", faqA3: "Most are free.", faqQ4: "How long?", faqA4: "Usually within hours.", partnersTitle: "More Partners Coming", footerTitle: "8 Top Companies Jointly Launch 333 ETH Airdrop", footerWarning: "Risk warning: Crypto is volatile.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Earn", navOffers: "Offers", navSurveys: "Surveys", navWithdraw: "Withdraw", navRewards: "Rewards", navLeaderboard: "Leaderboard", safariTitle: "Please open in Safari", safariDesc: "Please use the native Safari browser on iPhone / iPad.", copyBtn: "Copy Link", copied: "Copied", hasAccount: "Have an account?", goLogin: "Login", noAccount: "No account?", goRegister: "Register", loginTitle: "Login", loginBtn: "Login", labelEmail: "Email", labelPass: "Password", labelConfirm: "Confirm Password", labelPayPass: "Pay Password", surveyTitle: "Please fill out the survey", surveyDesc: "Takes 2 mins", submitSurvey: "Submit", readMore: "Read More", surveyQ1: "Which crypto wallet do you use most often?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "What is the main purpose of using a crypto wallet?", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "Token Swap", surveyOpt2_3: "NFT Trading", surveyOpt2_4: "Store & Transfer", dashTitle: "Earn", dashDesc: "Complete offers, surveys and games to earn coins instantly.", offerWall: "Offer Wall", taskAvailable: "Available", watchVideo: "Watch Video", startTask: "Start Task", withdrawTitle: "Withdraw", withdrawMethod: "Method", withdrawAmount: "Amount (Min 500)", withdrawAccount: "Account/Address", submitApply: "Submit", searchPlaceholder: "Search offers", catAll: "All", catGame: "Games", catApp: "Apps", catSignup: "Sign Up", startEarning: "Start Earning", lbTitle: "Lucky Users", lbDesc: "Compete with others and win extra coins.", daily: "Daily", monthly: "Monthly", rankUser: "Rank / User", earnings: "Earnings", you: "You", backHome: "Back Home", exit: "Exit" };

const dictVi = { realtime: "Trực tiếp", login: "Đăng nhập", logout: "Đăng xuất", registerTitle: "Đăng ký", registerBtn: "Đăng ký", heroTitle: "8 công ty hàng đầu cùng ra mắt Airdrop 333 ETH", heroDesc: "Người dùng 8 sản phẩm có thể tham gia, nhận thưởng miễn phí trong 24h.", claimBtn: "Nhận miễn phí", stat1: "Đã phát", stat2: "Người dùng", stat3: "Thanh toán/Ngày", stat4: "Điểm Play Store", howTitle: "Cách nhận", howDesc: "1. Đăng ký → 2. Điền form → 3. Nhận coin", step1Title: "Đăng ký", step1Desc: "Đăng ký bằng email.", step2Title: "Điền form", step2Desc: "Hoàn thành khảo sát.", step3Title: "Nhận coin", step3Desc: "Rút tiền qua crypto.", leaderboardTitle: "Người dùng may mắn", viewLeaderboard: "Xem BXH →", reviewsTitle: "Người dùng nói gì", activeUser: "Người dùng tích cực", faqTitle: "Câu hỏi thường gặp", faqDesc: "Cần giúp đỡ?", faqQ1: "Cách nhận?", faqA1: "Đăng ký và điền form.", faqQ2: "Phương thức?", faqA2: "PayPal, BTC, LTC, Ngân hàng.", faqQ3: "Có phí không?", faqA3: "Hầu hết miễn phí.", faqQ4: "Mất bao lâu?", faqA4: "Thường trong vài giờ.", partnersTitle: "Thêm đối tác", footerTitle: "8 công ty hàng đầu cùng ra mắt Airdrop 333 ETH", footerWarning: "Cảnh báo rủi ro.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Kiếm tiền", navOffers: "Ưu đãi", navSurveys: "Khảo sát", navWithdraw: "Rút tiền", navRewards: "Phần thưởng", navLeaderboard: "Bảng xếp hạng", safariTitle: "Vui lòng mở bằng Safari", safariDesc: "Sử dụng trình duyệt Safari gốc.", copyBtn: "Sao chép liên kết", copied: "Đã sao chép", hasAccount: "Đã có tài khoản?", goLogin: "Đăng nhập", noAccount: "Chưa có tài khoản?", goRegister: "Đăng ký", loginTitle: "Đăng nhập", loginBtn: "Đăng nhập", labelEmail: "Email", labelPass: "Mật khẩu", labelConfirm: "Xác nhận mật khẩu", labelPayPass: "Mật khẩu thanh toán", surveyTitle: "Vui lòng điền khảo sát", surveyDesc: "Mất 2 phút", submitSurvey: "Gửi", readMore: "Đọc thêm", surveyQ1: "Bạn thường sử dụng ví tiền điện tử nào nhất?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "Mục đích chính của việc sử dụng ví tiền điện tử là gì?", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "Hoán đổi Token", surveyOpt2_3: "Giao dịch NFT", surveyOpt2_4: "Lưu trữ & Chuyển tiền", dashTitle: "Kiếm tiền", dashDesc: "Hoàn thành ưu đãi, khảo sát để nhận coin.", offerWall: "Tường Ưu Đãi", taskAvailable: "Có thể làm", watchVideo: "Xem video", startTask: "Bắt đầu", withdrawTitle: "Rút tiền", withdrawMethod: "Phương thức", withdrawAmount: "Số tiền (Min 500)", withdrawAccount: "Tài khoản/Địa chỉ", submitApply: "Gửi", searchPlaceholder: "Tìm kiếm ưu đãi", catAll: "Tất cả", catGame: "Trò chơi", catApp: "Ứng dụng", catSignup: "Đăng ký", startEarning: "Bắt đầu kiếm", lbTitle: "Người dùng may mắn", lbDesc: "Cạnh tranh với người khác.", daily: "Hàng ngày", monthly: "Hàng tháng", rankUser: "Hạng / Người dùng", earnings: "Thu nhập", you: "Bạn", backHome: "Về Trang Chủ", exit: "Thoát" };

const dictDe = { realtime: "Live", login: "Anmelden", logout: "Abmelden", registerTitle: "Registrieren", registerBtn: "Registrieren", heroTitle: "8 Top-Unternehmen starten gemeinsam 333 ETH Airdrop", heroDesc: "Nutzer unserer 8 Produkte können teilnehmen, einfache Belohnung, innerhalb von 24 Stunden kostenlos.", claimBtn: "Gratis erhalten", stat1: "Verteilt", stat2: "Benutzer", stat3: "Täglich", stat4: "Play Store", howTitle: "Wie man erhält", howDesc: "1. Registrieren → 2. Ausfüllen → 3. Erhalten", step1Title: "Registrieren", step1Desc: "Mit E-Mail registrieren.", step2Title: "Ausfüllen", step2Desc: "Umfrage abschließen.", step3Title: "Erhalten", step3Desc: "Jederzeit über Crypto abheben.", leaderboardTitle: "Glückspilze", viewLeaderboard: "Bestenliste ansehen →", reviewsTitle: "Was Benutzer sagen", activeUser: "Aktiver Benutzer", faqTitle: "FAQ", faqDesc: "Brauchen Sie Hilfe?", faqQ1: "Wie beantragt man?", faqA1: "Registrieren und ausfüllen.", faqQ2: "Methoden?", faqA2: "PayPal, BTC, LTC, Bank.", faqQ3: "Gebühren?", faqA3: "Meistens kostenlos.", faqQ4: "Wie lange?", faqA4: "Normalerweise innerhalb von Stunden.", partnersTitle: "Weitere Partner", footerTitle: "8 Top-Unternehmen starten gemeinsam 333 ETH Airdrop", footerWarning: "Risikowarnung: Crypto ist volatil.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Verdienen", navOffers: "Angebote", navSurveys: "Umfragen", navWithdraw: "Abheben", navRewards: "Belohnungen", navLeaderboard: "Bestenliste", safariTitle: "Bitte in Safari öffnen", safariDesc: "Bitte verwenden Sie den nativen Safari-Browser.", copyBtn: "Link kopieren", copied: "Kopiert", hasAccount: "Haben Sie ein Konto?", goLogin: "Anmelden", noAccount: "Kein Konto?", goRegister: "Registrieren", loginTitle: "Anmelden", loginBtn: "Anmelden", labelEmail: "E-Mail", labelPass: "Passwort", labelConfirm: "Passwort bestätigen", labelPayPass: "Zahlungspasswort", surveyTitle: "Bitte füllen Sie die Umfrage aus", surveyDesc: "Dauert 2 Minuten", submitSurvey: "Absenden", readMore: "Weiterlesen", surveyQ1: "Welche Krypto-Wallet nutzen Sie am häufigsten?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "Was ist der Hauptzweck der Nutzung einer Krypto-Wallet?", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "Token-Tausch", surveyOpt2_3: "NFT-Handel", surveyOpt2_4: "Speichern & Übertragen", dashTitle: "Verdienen", dashDesc: "Schließen Sie Angebote und Umfragen ab, um Münzen zu verdienen.", offerWall: "Angebote", taskAvailable: "Verfügbar", watchVideo: "Video ansehen", startTask: "Starten", withdrawTitle: "Abheben", withdrawMethod: "Methode", withdrawAmount: "Betrag (Min 500)", withdrawAccount: "Konto/Adresse", submitApply: "Senden", searchPlaceholder: "Angebote suchen", catAll: "Alle", catGame: "Spiele", catApp: "Apps", catSignup: "Anmelden", startEarning: "Verdienen starten", lbTitle: "Glückspilze", lbDesc: "Konkurrieren Sie mit anderen.", daily: "Täglich", monthly: "Monatlich", rankUser: "Rang / Benutzer", earnings: "Einnahmen", you: "Du", backHome: "Zurück", exit: "Beenden" };

const dictAr = { realtime: "مباشر", login: "تسجيل الدخول", logout: "تسجيل الخروج", registerTitle: "إنشاء حساب", registerBtn: "تسجيل", heroTitle: "8 شركات كبرى تطلق إيردروب 333 إيثريوم", heroDesc: "يمكن لمستخدمي منتجاتنا الثمانية المشاركة والحصول على المكافآت مجانًا خلال 24 ساعة.", claimBtn: "احصل مجانًا", stat1: "الموزعة", stat2: "المستخدمين", stat3: "الدفع اليومي", stat4: "متجر بلاي", howTitle: "كيفية الاستلام", howDesc: "1. تسجيل → 2. تعبئة → 3. استلام", step1Title: "تسجيل", step1Desc: "سجل بالبريد الإلكتروني.", step2Title: "تعبئة", step2Desc: "أكمل الاستبيان.", step3Title: "استلام", step3Desc: "اسحب عبر العملات الرقمية.", leaderboardTitle: "مستخدمون محظوظون", viewLeaderboard: "عرض المتصدرين →", reviewsTitle: "ماذا يقول المستخدمون", activeUser: "مستخدم نشط", faqTitle: "الأسئلة الشائعة", faqDesc: "تحتاج مساعدة؟", faqQ1: "كيف أستلم؟", faqA1: "سجل وأكمل النماذج.", faqQ2: "طرق الاستلام؟", faqA2: "PayPal, BTC, LTC, Bank.", faqQ3: "هل هناك رسوم؟", faqA3: "معظمها مجاني.", faqQ4: "كم من الوقت؟", faqA4: "عادة في غضون ساعات.", partnersTitle: "المزيد من الشركاء", footerTitle: "8 شركات كبرى تطلق إيردروب 333 إيثريوم", footerWarning: "تحذير المخاطر.", footerCopy: "© 2024 W-Airdrop.", navEarn: "اكسب", navOffers: "عروض", navSurveys: "استبيانات", navWithdraw: "سحب", navRewards: "مكافآت", navLeaderboard: "المتصدرين", safariTitle: "يرجى الفتح في Safari", safariDesc: "يرجى استخدام متصفح Safari الأصلي.", copyBtn: "نسخ الرابط", copied: "تم النسخ", hasAccount: "لديك حساب؟", goLogin: "تسجيل الدخول", noAccount: "ليس لديك حساب؟", goRegister: "تسجيل", loginTitle: "تسجيل الدخول", loginBtn: "تسجيل الدخول", labelEmail: "البريد الإلكتروني", labelPass: "كلمة المرور", labelConfirm: "تأكيد كلمة المرور", labelPayPass: "كلمة مرور الدفع", surveyTitle: "يرجى ملء الاستبيان", surveyDesc: "يستغرق دقيقتين", submitSurvey: "إرسال", readMore: "اقرأ المزيد", surveyQ1: "أي محفظة عملات رقمية تستخدمها في أغلب الأحيان؟", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "ما هو الغرض الرئيسي من استخدام محفظة العملات الرقمية؟", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "تبديل الرموز", surveyOpt2_3: "تداول NFT", surveyOpt2_4: "التخزين والتحويل", dashTitle: "اكسب", dashDesc: "أكمل العروض والاستبيانات لكسب العملات.", offerWall: "عروض", taskAvailable: "متاح", watchVideo: "شاهد الفيديو", startTask: "ابدأ", withdrawTitle: "سحب", withdrawMethod: "طريقة", withdrawAmount: "المبلغ (الحد الأدنى 500)", withdrawAccount: "الحساب/العنوان", submitApply: "إرسال", searchPlaceholder: "ابحث عن العروض", catAll: "الكل", catGame: "ألعاب", catApp: "تطبيقات", catSignup: "تسجيل", startEarning: "ابدأ الكسب", lbTitle: "مستخدمون محظوظون", lbDesc: "تنافس مع الآخرين.", daily: "يومي", monthly: "شهري", rankUser: "الترتيب / المستخدم", earnings: "الأرباح", you: "أنت", backHome: "العودة", exit: "خروج" };

const dictEs = { realtime: "En vivo", login: "Iniciar sesión", logout: "Cerrar sesión", registerTitle: "Registrarse", registerBtn: "Registrarse", heroTitle: "8 empresas líderes lanzan el Airdrop de 333 ETH", heroDesc: "Los usuarios de nuestros 8 productos pueden participar y reclamar recompensas gratis en 24 horas.", claimBtn: "Reclamar Gratis", stat1: "Distribuido", stat2: "Usuarios", stat3: "Pagos Diarios", stat4: "Google Play", howTitle: "Cómo Reclamar", howDesc: "1. Registro → 2. Formulario → 3. Recibir", step1Title: "Registro", step1Desc: "Regístrate con email.", step2Title: "Formulario", step2Desc: "Completa la encuesta.", step3Title: "Recibir", step3Desc: "Retira por crypto.", leaderboardTitle: "Usuarios con Suerte", viewLeaderboard: "Ver Clasificación →", reviewsTitle: "Lo que dicen los usuarios", activeUser: "Usuario Activo", faqTitle: "Preguntas Frecuentes", faqDesc: "¿Necesitas ayuda?", faqQ1: "¿Cómo reclamar?", faqA1: "Regístrate y completa formularios.", faqQ2: "¿Métodos de reclamo?", faqA2: "PayPal, BTC, LTC, Banco.", faqQ3: "¿Tarifas?", faqA3: "La mayoría son gratis.", faqQ4: "¿Cuánto tiempo?", faqA4: "Normalmente en horas.", partnersTitle: "Más socios", footerTitle: "8 empresas líderes lanzan el Airdrop de 333 ETH", footerWarning: "Advertencia de riesgo.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Ganar", navOffers: "Ofertas", navSurveys: "Encuestas", navWithdraw: "Retirar", navRewards: "Recompensas", navLeaderboard: "Clasificación", safariTitle: "Abrir en Safari", safariDesc: "Usa el navegador Safari nativo.", copyBtn: "Copiar enlace", copied: "Copiado", hasAccount: "¿Tienes cuenta?", goLogin: "Iniciar sesión", noAccount: "¿No tienes cuenta?", goRegister: "Registrarse", loginTitle: "Iniciar sesión", loginBtn: "Entrar", labelEmail: "Correo electrónico", labelPass: "Contraseña", labelConfirm: "Confirmar Contraseña", labelPayPass: "Contraseña de Pago", surveyTitle: "Por favor complete la encuesta", surveyDesc: "Toma 2 minutos", submitSurvey: "Enviar", readMore: "Leer más", surveyQ1: "¿Qué billetera cripto usas con más frecuencia?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "¿Cuál es el propósito principal de usar una billetera cripto?", surveyOpt2_1: "DApp y DeFi", surveyOpt2_2: "Intercambio de tokens", surveyOpt2_3: "Comercio de NFT", surveyOpt2_4: "Almacenar y transferir", dashTitle: "Ganar", dashDesc: "Completa ofertas y encuestas para ganar monedas.", offerWall: "Ofertas", taskAvailable: "Disponible", watchVideo: "Ver video", startTask: "Empezar", withdrawTitle: "Retirar", withdrawMethod: "Método", withdrawAmount: "Cantidad (Min 500)", withdrawAccount: "Cuenta/Dirección", submitApply: "Enviar", searchPlaceholder: "Buscar ofertas", catAll: "Todas", catGame: "Juegos", catApp: "Apps", catSignup: "Registro", startEarning: "Empezar a Ganar", lbTitle: "Usuarios con Suerte", lbDesc: "Compite con otros.", daily: "Diario", monthly: "Mensual", rankUser: "Rango / Usuario", earnings: "Ganancias", you: "Tú", backHome: "Volver", exit: "Salir" };

const dictPt = { realtime: "Ao vivo", login: "Entrar", logout: "Sair", registerTitle: "Registrar", registerBtn: "Registrar", heroTitle: "8 empresas líderes lançam Airdrop de 333 ETH", heroDesc: "Usuários dos nossos 8 produtos podem participar e receber recompensas grátis em 24h.", claimBtn: "Receber Grátis", stat1: "Distribuído", stat2: "Usuários", stat3: "Pagamentos", stat4: "Google Play", howTitle: "Como Receber", howDesc: "1. Registrar → 2. Preencher → 3. Receber", step1Title: "Registrar", step1Desc: "Registre-se com email.", step2Title: "Preencher", step2Desc: "Complete a pesquisa.", step3Title: "Receber", step3Desc: "Saque via crypto.", leaderboardTitle: "Usuários Sortudos", viewLeaderboard: "Ver Ranking →", reviewsTitle: "O que os usuários dizem", activeUser: "Usuário Ativo", faqTitle: "FAQ", faqDesc: "Precisa de ajuda?", faqQ1: "Como receber?", faqA1: "Registre-se e preencha.", faqQ2: "Métodos?", faqA2: "PayPal, BTC, LTC, Banco.", faqQ3: "Taxas?", faqA3: "A maioria é grátis.", faqQ4: "Quanto tempo?", faqA4: "Geralmente em horas.", partnersTitle: "Mais parceiros", footerTitle: "8 empresas líderes lançam Airdrop de 333 ETH", footerWarning: "Aviso de risco.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Ganhar", navOffers: "Ofertas", navSurveys: "Pesquisas", navWithdraw: "Sacar", navRewards: "Recompensas", navLeaderboard: "Ranking", safariTitle: "Abrir no Safari", safariDesc: "Use o navegador Safari nativo.", copyBtn: "Copiar link", copied: "Copiado", hasAccount: "Tem conta?", goLogin: "Entrar", noAccount: "Não tem conta?", goRegister: "Registrar", loginTitle: "Entrar", loginBtn: "Entrar", labelEmail: "Email", labelPass: "Senha", labelConfirm: "Confirmar Senha", labelPayPass: "Senha de Pagamento", surveyTitle: "Por favor preencha a pesquisa", surveyDesc: "Leva 2 minutos", submitSurvey: "Enviar", readMore: "Ler mais", surveyQ1: "Qual carteira cripto você usa com mais frequência?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "Qual é o principal objetivo de usar uma carteira cripto?", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "Troca de Tokens", surveyOpt2_3: "Negociação de NFT", surveyOpt2_4: "Armazenar & Transferir", dashTitle: "Ganhar", dashDesc: "Complete ofertas e pesquisas para ganhar moedas.", offerWall: "Ofertas", taskAvailable: "Disponível", watchVideo: "Ver vídeo", startTask: "Iniciar", withdrawTitle: "Sacar", withdrawMethod: "Método", withdrawAmount: "Quantia (Min 500)", withdrawAccount: "Conta/Endereço", submitApply: "Enviar", searchPlaceholder: "Buscar ofertas", catAll: "Todas", catGame: "Jogos", catApp: "Apps", catSignup: "Registro", startEarning: "Começar a Ganhar", lbTitle: "Usuários Sortudos", lbDesc: "Compita com outros.", daily: "Diário", monthly: "Mensal", rankUser: "Rank / Usuário", earnings: "Ganhos", you: "Você", backHome: "Voltar", exit: "Sair" };

const dictKo = { realtime: "실시간", login: "로그인", logout: "로그아웃", registerTitle: "회원가입", registerBtn: "가입하기", heroTitle: "8개 최고 기업 공동 333 ETH 에어드롭", heroDesc: "8개 제품 사용자 누구나 참여 가능, 24시간 내 무료 에어드롭.", claimBtn: "무료 청구", stat1: "분배됨", stat2: "사용자", stat3: "일일 지급", stat4: "플레이 스토어", howTitle: "청구 방법", howDesc: "1. 가입 → 2. 작성 → 3. 수령", step1Title: "가입", step1Desc: "이메일로 가입하세요.", step2Title: "작성", step2Desc: "설문을 완료하세요.", step3Title: "수령", step3Desc: "암호화폐로 출금하세요.", leaderboardTitle: "행운의 사용자", viewLeaderboard: "리더보드 보기 →", reviewsTitle: "사용자 후기", activeUser: "활성 사용자", faqTitle: "자주 묻는 질문", faqDesc: "도움이 필요하신가요?", faqQ1: "청구 방법?", faqA1: "가입하고 양식을 작성하세요.", faqQ2: "청구 수단?", faqA2: "PayPal, BTC, LTC, 은행.", faqQ3: "수수료가 있나요?", faqA3: "대부분 무료입니다.", faqQ4: "얼마나 걸리나요?", faqA4: "보통 몇 시간 내에.", partnersTitle: "더 많은 파트너", footerTitle: "8개 최고 기업 공동 333 ETH 에어드롭", footerWarning: "위험 경고.", footerCopy: "© 2024 W-Airdrop.", navEarn: "수익", navOffers: "혜택", navSurveys: "설문조사", navWithdraw: "출금", navRewards: "보상", navLeaderboard: "리더보드", safariTitle: "Safari로 열어주세요", safariDesc: "기본 Safari 브라우저를 사용하세요.", copyBtn: "링크 복사", copied: "복사됨", hasAccount: "계정이 있으신가요?", goLogin: "로그인", noAccount: "계정이 없으신가요?", goRegister: "가입하기", loginTitle: "로그인", loginBtn: "로그인", labelEmail: "이메일", labelPass: "비밀번호", labelConfirm: "비밀번호 확인", labelPayPass: "결제 비밀번호", surveyTitle: "설문 조사를 작성해주세요", surveyDesc: "2분 소요", submitSurvey: "제출", readMore: "더보기", surveyQ1: "가장 자주 사용하는 암호화폐 지갑은 무엇인가요?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "암호화폐 지갑을 사용하는 주된 목적은 무엇인가요?", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "토큰 스왑", surveyOpt2_3: "NFT 거래", surveyOpt2_4: "보관 및 전송", dashTitle: "수익", dashDesc: "혜택과 설문을 완료하고 코인을 받으세요.", offerWall: "혜택", taskAvailable: "가능", watchVideo: "비디오 보기", startTask: "시작", withdrawTitle: "출금", withdrawMethod: "방법", withdrawAmount: "금액 (최소 500)", withdrawAccount: "계정/주소", submitApply: "제출", searchPlaceholder: "혜택 검색", catAll: "전체", catGame: "게임", catApp: "앱", catSignup: "가입", startEarning: "수익 시작", lbTitle: "행운의 사용자", lbDesc: "다른 사용자와 경쟁하세요.", daily: "매일", monthly: "매월", rankUser: "순위 / 사용자", earnings: "수익", you: "당신", backHome: "돌아가기", exit: "나가기" };

const dictUk = { realtime: "Наживо", login: "Увійти", logout: "Вийти", registerTitle: "Реєстрація", registerBtn: "Зареєструватися", heroTitle: "8 провідних компаній запускають Airdrop на 333 ETH", heroDesc: "Користувачі 8 продуктів можуть брати участь та отримувати винагороди безкоштовно протягом 24 годин.", claimBtn: "Отримати безкоштовно", stat1: "Розподілено", stat2: "Користувачі", stat3: "Щоденні виплати", stat4: "Google Play", howTitle: "Як отримати", howDesc: "1. Реєстрація → 2. Заповнення → 3. Отримання", step1Title: "Реєстрація", step1Desc: "Зареєструйтесь за email.", step2Title: "Заповнення", step2Desc: "Пройдіть опитування.", step3Title: "Отримання", step3Desc: "Виводьте через криптовалюту.", leaderboardTitle: "Щасливі користувачі", viewLeaderboard: "Переглянути таблицю →", reviewsTitle: "Що кажуть користувачі", activeUser: "Активний користувач", faqTitle: "Часті питання", faqDesc: "Потрібна допомога?", faqQ1: "Як отримати?", faqA1: "Зареєструйтесь та заповніть форми.", faqQ2: "Способи отримання?", faqA2: "PayPal, BTC, LTC, Банк.", faqQ3: "Є комісія?", faqA3: "Більшість безкоштовні.", faqQ4: "Скільки часу?", faqA4: "Зазвичай протягом годин.", partnersTitle: "Більше партнерів", footerTitle: "8 провідних компаній запускають Airdrop на 333 ETH", footerWarning: "Попередження про ризики.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Заробіток", navOffers: "Пропозиції", navSurveys: "Опитування", navWithdraw: "Виведення", navRewards: "Нагороди", navLeaderboard: "Таблиця лідерів", safariTitle: "Відкрийте в Safari", safariDesc: "Використовуйте рідний браузер Safari.", copyBtn: "Копіювати посилання", copied: "Скопійовано", hasAccount: "Є акаунт?", goLogin: "Увійти", noAccount: "Немає акаунту?", goRegister: "Зареєструватися", loginTitle: "Увійти", loginBtn: "Увійти", labelEmail: "Електронна пошта", labelPass: "Пароль", labelConfirm: "Підтвердіть пароль", labelPayPass: "Пароль для оплати", surveyTitle: "Будь ласка, заповніть опитування", surveyDesc: "Займає 2 хвилини", submitSurvey: "Надіслати", readMore: "Читати далі", surveyQ1: "Який криптогаманець ви використовуєте найчастіше?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "Яка основна мета використання криптогаманця?", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "Обмін токенів", surveyOpt2_3: "Торгівля NFT", surveyOpt2_4: "Зберігання та переказ", dashTitle: "Заробіток", dashDesc: "Виконуйте пропозиції та опитування, щоб заробити монети.", offerWall: "Пропозиції", taskAvailable: "Доступно", watchVideo: "Дивитись відео", startTask: "Почати", withdrawTitle: "Виведення", withdrawMethod: "Метод", withdrawAmount: "Сума (Мін 500)", withdrawAccount: "Рахунок/Адреса", submitApply: "Надіслати", searchPlaceholder: "Шукати пропозиції", catAll: "Всі", catGame: "Ігри", catApp: "Додатки", catSignup: "Реєстрація", startEarning: "Почати заробляти", lbTitle: "Щасливі користувачі", lbDesc: "Змагайтеся з іншими.", daily: "Щодня", monthly: "Щомісяця", rankUser: "Ранг / Користувач", earnings: "Дохід", you: "Ви", backHome: "Назад", exit: "Вихід" };

const dictTr = { realtime: "Canlı", login: "Giriş Yap", logout: "Çıkış Yap", registerTitle: "Kayıt Ol", registerBtn: "Kayıt Ol", heroTitle: "8 Lider Şirket 333 ETH Airdrop Başlatıyor", heroDesc: "8 ürünümüzün kullanıcıları katılabilir, 24 saat içinde ücretsiz ödül alabilir.", claimBtn: "Ücretsiz Al", stat1: "Dağıtılan", stat2: "Kullanıcılar", stat3: "Günlük Ödemeler", stat4: "Google Play", howTitle: "Nasıl Alınır", howDesc: "1. Kayıt → 2. Form → 3. Alım", step1Title: "Kayıt", step1Desc: "E-posta ile kayıt olun.", step2Title: "Form", step2Desc: "Anketi tamamlayın.", step3Title: "Alım", step3Desc: "Kripto ile çekim yapın.", leaderboardTitle: "Şanslı Kullanıcılar", viewLeaderboard: "Liderlik Tablosu →", reviewsTitle: "Kullanıcılar Ne Diyor", activeUser: "Aktif Kullanıcı", faqTitle: "SSS", faqDesc: "Yardıma mı ihtiyacınız var?", faqQ1: "Nasıl alınır?", faqA1: "Kayıt olun ve formları doldurun.", faqQ2: "Yöntemler?", faqA2: "PayPal, BTC, LTC, Banka.", faqQ3: "Ücret var mı?", faqA3: "Çoğu ücretsizdir.", faqQ4: "Ne kadar sürer?", faqA4: "Genellikle saatler içinde.", partnersTitle: "Daha Fazla Ortak", footerTitle: "8 Lider Şirket 333 ETH Airdrop Başlatıyor", footerWarning: "Risk uyarısı.", footerCopy: "© 2024 W-Airdrop.", navEarn: "Kazan", navOffers: "Teklifler", navSurveys: "Anketler", navWithdraw: "Çekim", navRewards: "Ödüller", navLeaderboard: "Liderlik Tablosu", safariTitle: "Safari'de açın", safariDesc: "Yerel Safari tarayıcısını kullanın.", copyBtn: "Bağlantıyı Kopyala", copied: "Kopyalandı", hasAccount: "Hesabınız var mı?", goLogin: "Giriş Yap", noAccount: "Hesabınız yok mu?", goRegister: "Kayıt Ol", loginTitle: "Giriş Yap", loginBtn: "Giriş Yap", labelEmail: "E-posta", labelPass: "Şifre", labelConfirm: "Şifreyi Onayla", labelPayPass: "Ödeme Şifresi", surveyTitle: "Lütfen anketi doldurun", surveyDesc: "2 dakika sürer", submitSurvey: "Gönder", readMore: "Devamını Oku", surveyQ1: "En sık hangi kripto cüzdanını kullanıyorsunuz?", surveyOpt1_1: "Bitget / Bitpie", surveyOpt1_2: "Trust Wallet / Phantom", surveyOpt1_3: "Solflare / Coin98", surveyOpt1_4: "Uniswap / Exodus", surveyQ2: "Kripto cüzdanı kullanmanın temel amacı nedir?", surveyOpt2_1: "DApp & DeFi", surveyOpt2_2: "Token Takası", surveyOpt2_3: "NFT Ticareti", surveyOpt2_4: "Saklama ve Transfer", dashTitle: "Kazan", dashDesc: "Para kazanmak için teklifleri ve anketleri tamamlayın.", offerWall: "Teklifler", taskAvailable: "Mevcut", watchVideo: "Video İzle", startTask: "Başla", withdrawTitle: "Çekim", withdrawMethod: "Yöntem", withdrawAmount: "Miktar (Min 500)", withdrawAccount: "Hesap/Adres", submitApply: "Gönder", searchPlaceholder: "Teklif ara", catAll: "Tümü", catGame: "Oyunlar", catApp: "Uygulamalar", catSignup: "Kayıt", startEarning: "Kazanmaya Başla", lbTitle: "Şanslı Kullanıcılar", lbDesc: "Diğerleriyle rekabet et.", daily: "Günlük", monthly: "Aylık", rankUser: "Sıra / Kullanıcı", earnings: "Kazanç", you: "Sen", backHome: "Geri Dön", exit: "Çıkış" };

Object.keys(DB_FILES).forEach(key => {
    if (!fs.existsSync(DB_FILES[key])) {
        let initialData = [];
        if (key === 'surveys') initialData = { questions: [], submissions: [] };
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

// 后台 API
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

app.post('/api/admin/article/translate', auth, async (req, res) => {
    const { title, summary, content, coverUrl, targetLangs } = req.body;
    const articles = readDB('articles');
    const groupId = uuidv4();
    
    if (targetLangs.includes('zh')) {
        articles.push({ id: uuidv4(), groupId, lang: 'zh', title, summary, content, coverUrl, time: new Date().toISOString() });
    }
    
    const foreignLangs = targetLangs.filter(lang => lang !== 'zh');
    if (foreignLangs.length === 0) {
        writeDB('articles', articles);
        return res.json({ success: true });
    }

    try {
        const translatedArticles = [];
        const batchSize = 3;
        for (let i = 0; i < foreignLangs.length; i += batchSize) {
            const batch = foreignLangs.slice(i, i + batchSize);
            const promises = batch.map(async (lang) => {
                const googleLang = lang.split('-')[0];
                const [tTitle, tSummary, tContent] = await Promise.all([
                    translate(title, { to: googleLang, requestOptions: { retry: 3, delay: 500, timeout: 15000 } }),
                    translate(summary, { to: googleLang, requestOptions: { retry: 3, delay: 500, timeout: 15000 } }),
                    translate(content, { to: googleLang, requestOptions: { retry: 3, delay: 500, timeout: 15000 } })
                ]);
                return { id: uuidv4(), groupId, lang, title: tTitle.text, summary: tSummary.text, content: tContent.text, coverUrl, time: new Date().toISOString() };
            });
            const results = await Promise.all(promises);
            translatedArticles.push(...results);
            if (i + batchSize < foreignLangs.length) await new Promise(r => setTimeout(r, 800));
        }
        articles.push(...translatedArticles);
        writeDB('articles', articles);
        res.json({ success: true });
    } catch (e) {
        console.error('翻译失败:', e.message || e);
        res.status(500).json({ error: '翻译服务部分失败或超时，请重试。' });
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
