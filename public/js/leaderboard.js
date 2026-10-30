const coinSvg = `<svg class="w-4 h-4 inline-block align-middle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#FBBF24"/><circle cx="12" cy="12" r="8" fill="#FCD34D"/><path d="M12 6V18M15 9C15 7.89543 13.6569 7 12 7C10.3431 7 9 7.89543 9 9C9 10.1046 10.3431 11 12 11C13.6569 11 15 11.8954 15 13C15 14.1046 13.6569 15 12 15C10.3431 15 9 14.1046 9 13" stroke="#B45309" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
let currentDict = {};

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
        }
    } catch(e) {}
}

async function loadLeaderboard(period) {
    document.getElementById('btn-daily').classList.remove('active');
    document.getElementById('btn-monthly').classList.remove('active');
    document.getElementById(`btn-${period}`).classList.add('active');
    const listContainer = document.getElementById('leaderboardList');
    listContainer.innerHTML = '<div class="p-8 text-center text-gray-400">Loading...</div>';

    try {
        const res = await fetch(`/api/leaderboard?period=${period}`);
        const data = await res.json();
        if (data.length === 0) return listContainer.innerHTML = '<div class="p-8 text-center text-gray-400">No data</div>';

        let html = '';
        data.forEach((user, index) => {
            let rankClass = 'text-gray-400 font-bold';
            let avatarClass = 'bg-gray-100 text-gray-500';
            if (index === 0) { rankClass = 'text-amber-500 font-extrabold text-lg'; avatarClass = 'bg-amber-100 text-amber-700'; }
            else if (index === 1) { rankClass = 'text-slate-400 font-extrabold text-lg'; avatarClass = 'bg-slate-200 text-slate-600'; }
            else if (index === 2) { rankClass = 'text-orange-400 font-extrabold text-lg'; avatarClass = 'bg-orange-100 text-orange-700'; }

            html += `<div class="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors ${user.isReal ? 'bg-blue-50/30' : ''}">
                    <div class="flex items-center gap-4">
                        <span class="w-6 text-center ${rankClass}">#${index + 1}</span>
                        <div class="w-10 h-10 rounded-full ${avatarClass} flex items-center justify-center font-bold text-sm">${user.avatar}</div>
                        <div><span class="font-medium text-sm text-gray-900">${user.name}</span>
                        ${user.isReal ? `<span class="ml-2 text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded" data-i18n="you">${currentDict.you || '你'}</span>` : ''}</div>
                    </div>
                    <span class="font-bold text-yellow-500 text-sm flex items-center gap-1">${coinSvg} ${user.amount.toLocaleString()}</span>
                </div>`;
        });
        listContainer.innerHTML = html;
    } catch(e) { listContainer.innerHTML = '<div class="p-8 text-center text-red-400">Failed to load</div>'; }
}

document.addEventListener('DOMContentLoaded', () => {
    initLang().then(() => loadLeaderboard('daily'));
});
