const EMOJIS = {
  'Hujjat': '📄', 'Telefon': '📱', 'Hamyon': '👜', 'Kalit': '🔑',
  'Sumka': '🎒', 'Elektronika': '💻', 'Kiyim': '👔', 'Boshqa': '📦'
};

let currentType = 'lost';
let currentFilter = 'all';
let currentCategoryFilter = null;

let ads = [
  { id:1, type:'lost', name:'Qora rangli hamyon', category:'Hamyon', location:'Chorsu bozori', desc:"Ichida pul, plastik karta va guvohnoma bor. O'g'irlik qilingan bo'lishi mumkin.", contact:'+998 90 111 22 33', date:'Bugun, 10:30' },
  { id:2, type:'found', name:'iPhone 14 Pro', category:'Telefon', location:"Yunusobod 9-ko'cha", desc:"Qora rangda, qopqoqsiz. Ekrani yaxshi, ichida SIM karta bor.", contact:'@topildi_uz', date:'Bugun, 09:15' },
  { id:3, type:'lost', name:"Pasport + ID karta", category:'Hujjat', location:'Toshkent aeroport', desc:"Qizil kitobcha, 1989 yil. Ism: Alisher. Juda muhim hujjatlar.", contact:'+998 93 555 66 77', date:'Kecha, 22:00' },
  { id:4, type:'lost', name:'Sariq ryukzak', category:'Sumka', location:"Metro Beruniy, 2-vagon", desc:"Ichida noutbuk, daftar va charger bor edi. Sariq + qora rangli.", contact:'+998 91 777 88 99', date:'Kecha, 18:45' },
  { id:5, type:'found', name:"Mashina kaliti", category:'Kalit', location:"Mirzo Ulugbek tumani", desc:"Toyota belgisi bor, qo'shimcha kalit ham birga. Sohibi topsin!", contact:'+998 97 200 30 40', date:'26-mart, 14:00' },
  { id:6, type:'lost', name:"AirPods Pro", category:'Elektronika', location:'Samarqand Darvoza', desc:"Oq rangli, qutisi yo'q. Chap quloqchada chiziq bor.", contact:'@airpods_lost', date:'26-mart, 11:30' },
];

function renderCards(list) {
  const grid = document.getElementById('cardsGrid');
  if (!list.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px 0;">
      <div style="font-size:3rem;margin-bottom:16px">🔍</div>
      <div style="font-family:'Unbounded',sans-serif;font-size:1rem;font-weight:600;margin-bottom:8px">E'lon topilmadi</div>
      <div style="font-size:0.85rem">Boshqa kalit so'z yoki filtr sinab ko'ring</div>
    </div>`;
    return;
  }
  grid.innerHTML = list.map(ad => `
    <div class="card" onclick="showDetail(${ad.id})">
      <div class="card-img" style="background:${ad.type==='lost'?'rgba(232,72,85,0.08)':'rgba(61,214,140,0.06)'}">
        <span style="font-size:3.5rem">${EMOJIS[ad.category]||'📦'}</span>
        <div class="status-dot ${ad.type==='lost'?'status-lost':'status-found'}">
          ${ad.type==='lost'?'YO\'QOLGAN':'TOPILGAN'}
        </div>
      </div>
      <div class="card-body">
        <h3>${ad.name}</h3>
        <p class="desc">${ad.desc.length>80?ad.desc.slice(0,80)+'...':ad.desc}</p>
        <div class="card-meta">
          <span class="location">📍 ${ad.location}</span>
          <span class="date">${ad.date}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function getFiltered() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  return ads.filter(a => {
    const matchType = currentFilter === 'all' || a.type === currentFilter;
    const matchCat = !currentCategoryFilter || a.category === currentCategoryFilter;
    const matchQ = !q || a.name.toLowerCase().includes(q) || a.location.toLowerCase().includes(q) || a.desc.toLowerCase().includes(q);
    return matchType && matchCat && matchQ;
  });
}

function filterCards() { renderCards(getFiltered()); }

function filterByType(type, btn) {
  currentFilter = type;
  currentCategoryFilter = null;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  filterCards();
}

function filterByCategory(cat, btn) {
  currentCategoryFilter = currentCategoryFilter === cat ? null : cat;
  currentFilter = 'all';
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  if (currentCategoryFilter) btn.classList.add('active');
  else document.querySelector('.chip').classList.add('active');
  filterCards();
}

function showDetail(id) {
  const ad = ads.find(a => a.id === id);
  if (!ad) return;
  alert(`📋 ${ad.name}\n📍 Joy: ${ad.location}\n📝 ${ad.desc}\n📞 Bog'lanish: ${ad.contact}`);
}

function openModal(type) {
  currentType = type || 'lost';
  setType(currentType);
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  ['itemName','itemLocation','itemDesc','itemContact'].forEach(id => document.getElementById(id).value = '');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function setType(type) {
  currentType = type;
  const btnL = document.getElementById('btnLost');
  const btnF = document.getElementById('btnFound');
  btnL.className = 'type-btn' + (type==='lost'?' active-lost':'');
  btnF.className = 'type-btn' + (type==='found'?' active-found':'');
}

function submitAd() {
  const name = document.getElementById('itemName').value.trim();
  const location = document.getElementById('itemLocation').value.trim();
  const category = document.getElementById('itemCategory').value;
  const desc = document.getElementById('itemDesc').value.trim() || "Ma'lumot kiritilmagan";
  const contact = document.getElementById('itemContact').value.trim() || "Ko'rsatilmagan";

  if (!name || !location) {
    showToast('⚠️ Buyum nomi va joy majburiy!', '#e84855');
    return;
  }

  const now = new Date();
  const time = `Bugun, ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;

  ads.unshift({ id: Date.now(), type: currentType, name, category, location, desc, contact, date: time });
  
  if (currentType === 'lost') {
    document.getElementById('totalLost').textContent = parseInt(document.getElementById('totalLost').textContent) + 1;
  } else {
    document.getElementById('totalFound').textContent = parseInt(document.getElementById('totalFound').textContent) + 1;
  }

  closeModal();
  filterCards();
  showToast('✅ E\'lon muvaffaqiyatli joylandi!');
}

function showToast(msg, color) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  m.textContent = msg;
  t.style.borderColor = color || 'var(--green)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// Init
renderCards(ads);