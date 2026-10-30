const coinSvg = `<svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#FBBF24"/><circle cx="12" cy="12" r="8" fill="#FCD34D"/><path d="M12 6V18M15 9C15 7.89543 13.6569 7 12 7C10.3431 7 9 7.89543 9 9C9 10.1046 10.3431 11 12 11C13.6569 11 15 11.8954 15 13C15 14.1046 13.6569 15 12 15C10.3431 15 9 14.1046 9 13" stroke="#B45309" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const currentUser = JSON.parse(localStorage.getItem('wad_user'));
let currentDict = {};
let allOffers = [];
let currentCategory = 'all';
let searchKeyword = '';

if (!currentUser) window.location.href = '/';

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('navEmail').innerText = currentUser.email;
    document.getElementById('navBalance').innerHTML = `${coinSvg} ${currentUser.balance || 0}`;
    initLang().then(fetchOffers);
    
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchKeyword = e.target.value;
        renderGrid();
    });
});

async function initLang() {
    try {
        const res = await fetch('/api/languages');
        const langs = await res.json();
        if(langs.length > 0) {
            const savedLang = localStorage.getItem('wad_lang') || langs[0].code;
            currentDict = (langs.find(l => l.code === savedLang) || langs[0]).dict;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (currentDict[key]) el.innerText = currentDict[key];
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (currentDict[key]) el.placeholder = currentDict[key];
            });
        }
    } catch(e) {}
}

async function fetchOffers() {
    const res = await fetch('/api/offers');
    allOffers = await res.json();
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('offerGrid');
    let filtered = allOffers;
    if (currentCategory !== 'all') filtered = filtered.filter(o => o.category === currentCategory);
    if (searchKeyword) filtered = filtered.filter(o => o.title.toLowerCase().includes(searchKeyword.toLowerCase()));

    if (filtered.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center text-gray-400 py-10">No offers found</div>';
        return;
    }
    grid.innerHTML = filtered.map(o => `
        <div class="offer-card bg-white flex flex-col" onclick="goToTask()">
            <div style="background-color: ${o.color}" class="h-32 w-full flex items-end p-4 relative overflow-hidden">
                <h3 class="text-white font-bold text-lg leading-tight z-10">${o.title}</h3>
            </div>
            <div class="p-3 flex justify-between items-center bg-white border-t border-gray-100">
                <span class="flex items-center gap-1 text-sm font-bold text-gray-700">
                    ${coinSvg} ${o.reward}
                </span>
                <span class="text-blue-500 text-xs font-bold hover:underline" data-i18n="startEarning">${currentDict.startEarning || '开始赚钱'}</span>
            </div>
        </div>
    `).join('');
}

function filterOffers(category, btn) {
    currentCategory = category;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGrid();
}

function goToTask() { window.location.href = '/?register=true'; }
function logout() { localStorage.removeItem('wad_user'); window.location.href = '/'; }
