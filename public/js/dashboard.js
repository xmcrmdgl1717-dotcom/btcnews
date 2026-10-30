const coinSvg = `<svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#FBBF24"/><circle cx="12" cy="12" r="8" fill="#FCD34D"/><path d="M12 6V18M15 9C15 7.89543 13.6569 7 12 7C10.3431 7 9 7.89543 9 9C9 10.1046 10.3431 11 12 11C13.6569 11 15 11.8954 15 13C15 14.1046 13.6569 15 12 15C10.3431 15 9 14.1046 9 13" stroke="#B45309" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

let currentUser = JSON.parse(localStorage.getItem('wad_user'));
let currentDict = {}; 

if (!currentUser) window.location.href = '/';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('navEmail').innerText = currentUser.email;
    document.getElementById('navBalance').innerHTML = `${coinSvg} ${currentUser.balance || 0}`;
    
    initLang();
    renderOffers();
});

async function initLang() {
    try {
        const res = await fetch('/api/languages');
        const langs = await res.json();
        if(langs.length > 0) {
            const savedLang = localStorage.getItem('wad_lang') || langs[0].code;
            currentDict = (langs.find(l => l.code === savedLang) || langs[0]).dict;
            applyLanguage();
        }
    } catch(e) {}
}

function applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (currentDict[key]) el.innerText = currentDict[key];
    });
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

const offers = [
    { id: 1, name: 'Torox', reward: 85, color: 'text-purple-600 bg-purple-50' },
    { id: 2, name: 'BitLabs', reward: 20, color: 'text-blue-600 bg-blue-50' },
    { id: 3, name: 'AdGate Media', reward: 15, color: 'text-cyan-600 bg-cyan-50' },
    { id: 4, name: 'OfferToro', reward: 25, color: 'text-orange-600 bg-orange-50' },
    { id: 5, name: 'Prime Surveys', reward: 50, color: 'text-gray-600 bg-gray-100' },
    { id: 6, name: 'CPX Research', reward: 80, color: 'text-gray-600 bg-gray-100' }
];

function renderOffers() {
    document.getElementById('offerWall').innerHTML = offers.map(o => `
        <div class="offer-card bg-white border border-gray-100 rounded-xl p-4 flex items-center justify-between cursor-pointer" onclick="window.location.href='offers.html'">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-sm font-bold text-gray-400 border border-gray-100">${o.name[0]}</div>
                <div><h4 class="font-bold text-sm text-gray-900">${o.name}</h4><p class="text-xs text-gray-500 mt-0.5" data-i18n="taskAvailable">可做任务</p></div>
            </div>
            <span class="${o.color} px-2 py-1 rounded text-xs font-bold flex items-center gap-1">${coinSvg} +${o.reward}</span>
        </div>
    `).join('');
}

async function doTask(reward, name) {
    const res = await fetch('/api/user/tasks/complete', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email: currentUser.email, reward: reward })
    });
    const data = await res.json();
    if(data.success) {
        document.getElementById('navBalance').innerHTML = `${coinSvg} ${data.balance}`;
        currentUser.balance = data.balance;
        localStorage.setItem('wad_user', JSON.stringify(currentUser));
        alert(`Success! +${reward} coins.`);
    }
}

function openWithdraw() { openModal('withdrawModal'); }
async function submitWithdraw() {
    const amount = Number(document.getElementById('wAmount').value);
    if(amount < 500) return alert('Min 500');
    if(amount > currentUser.balance) return alert('Insufficient balance');
    alert('Submitted successfully!'); closeModal('withdrawModal');
}

function openSurvey() { loadSurveyQuestions(); openModal('surveyModal'); }

async function loadSurveyQuestions() {
    const dict = currentDict;
    const questions = [
        { title: dict.surveyQ1 || 'Question 1', options: [dict.surveyOpt1_1 || 'A', dict.surveyOpt1_2 || 'B'] },
        { title: dict.surveyQ2 || 'Question 2', options: [dict.surveyOpt2_1 || 'C', dict.surveyOpt2_2 || 'D'] }
    ];
    let html = '';
    questions.forEach((q, i) => {
        html += `<div><p class="text-sm mb-2">${i+1}. ${q.title}</p>`;
        q.options.forEach(opt => { html += `<label class="flex items-center gap-2 text-sm text-gray-300 mb-1 cursor-pointer"><input type="radio" name="q${i}" value="${opt}" class="accent-blue-500"> ${opt}</label>`; });
        html += `</div>`;
    });
    document.getElementById('surveyQuestions').innerHTML = html;
}
async function submitSurvey() { closeModal('surveyModal'); doTask(180, 'Survey'); }
function logout() { localStorage.removeItem('wad_user'); window.location.href = '/'; }
