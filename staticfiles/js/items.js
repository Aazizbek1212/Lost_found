const EMOJIS = {
  'Hujjat': '📄', 'Telefon': '📱', 'Hamyon': '👜', 'Kalit': '🔑',
  'Sumka': '🎒', 'Elektronika': '💻', 'Kiyim': '👔', 'Boshqa': '📦'
};

let currentFilter = 'all';
let currentCategoryFilter = null;
let currentType = 'lost';

// 🔎 Qidirish va filtr
function getFilteredCards() {
  const q = document.getElementById('searchInput').value.toLowerCase();
  const cards = document.querySelectorAll('#cardsGrid .card');
  
  cards.forEach(card => {
    const type = card.classList.contains('lost') ? 'lost' : (card.classList.contains('found') ? 'found' : '');
    const name = card.querySelector('h3')?.textContent.toLowerCase() || '';
    const desc = card.querySelector('.card-meta')?.textContent.toLowerCase() || '';
    const cardText = (name + ' ' + desc).toLowerCase();
    
    const matchType = currentFilter === 'all' || type === currentFilter;
    const matchCat = !currentCategoryFilter || desc.includes(currentCategoryFilter.toLowerCase());
    const matchQ = !q || cardText.includes(q);
    
    card.style.display = (matchType && matchCat && matchQ) ? '' : 'none';
  });
  
  const visibleCards = document.querySelectorAll('#cardsGrid .card:not([style*="display: none"])');
  let noResults = document.getElementById('noResults');
  if (visibleCards.length === 0) {
    if (!noResults) {
      noResults = document.createElement('div');
      noResults.id = 'noResults';
      noResults.style.cssText = 'grid-column:1/-1;text-align:center;color:var(--muted);padding:60px 0;';
      noResults.innerHTML = `
        <div style="font-size:3rem;margin-bottom:16px">🔍</div>
        <div style="font-family:Unbounded,sans-serif;font-size:1rem;font-weight:600;margin-bottom:8px">E'lon topilmadi</div>
        <div style="font-size:0.85rem">Boshqa kalit so'z yoki filtr sinab ko'ring</div>`;
      document.getElementById('cardsGrid').appendChild(noResults);
    }
    noResults.style.display = '';
  } else if (noResults) {
    noResults.style.display = 'none';
  }
}

function filterCards() { getFilteredCards(); }

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

// 📄 Detal sahifa
function showDetail(id) {
  window.location.href = '/item/' + id + '/';
}

// 🟢 Modal boshqaruvi
function openModal(type) {
  currentType = type || 'lost';
  setType(currentType);
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

function setType(type) {
  document.getElementById("itemType").value = type;
  const btnLost = document.getElementById("btnLost");
  const btnFound = document.getElementById("btnFound");

  if (type === "lost") {
    btnLost.classList.add("active-lost");
    btnFound.classList.remove("active-found");
  } else {
    btnFound.classList.add("active-found");
    btnLost.classList.remove("active-lost");
  }
}

// ✅ Toast
function showToast(msg, color) {
  const t = document.getElementById('toast');
  const m = document.getElementById('toastMsg');
  m.textContent = msg;
  t.style.borderColor = color || 'var(--green)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// 🔧 Init
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("openModalBtn");
  if (btn) btn.addEventListener("click", () => openModal('lost'));
});
