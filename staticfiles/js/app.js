/* =========================================
   app.js — Bosh sahifa (Topildi.uz)
========================================= */

/* =========================================
   HEADER SCROLL EFFECT
========================================= */
window.addEventListener('scroll', () => {
    const header = document.getElementById('hdr');
    if (!header) return;
    header.classList.toggle('stuck', window.scrollY > 60);
});

/* =========================================
   TOAST NOTIFICATIONS
========================================= */
window.toast = function (message, cls = 'tg') {
    const container = document.getElementById('toasts');
    if (!container) {
        console.log(message);
        return;
    }
    const toast = document.createElement('div');
    toast.className = 'tn ' + cls;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => {
        toast.style.transition = 'opacity .3s';
        toast.style.opacity = '0';
        window.setTimeout(() => toast.remove(), 300);
    }, 3800);
};

/* =========================================
   UTILITY
========================================= */
window.scroll2 = function (id) {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
};

/* =========================================
   MODAL CONTROLS (haqiqiy Django formasi)
========================================= */
window.openModal = function () {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    const nameInput = document.getElementById('homeItemName');
    if (nameInput && !nameInput.value) nameInput.focus();
};

window.closeModal = function () {
    const modal = document.getElementById('modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
};

window.setType = function (type) {
    const isFound = type === 'f' || type === 'found';
    const typeInput = document.getElementById('homeItemType');
    const lostBtn = document.getElementById('tb-l');
    const foundBtn = document.getElementById('tb-f');
    const locationField = document.getElementById('locationField');
    const locationInput = document.getElementById('listingLocation');

    if (typeInput) typeInput.value = isFound ? 'found' : 'lost';

    if (locationField && locationInput) {
        locationField.hidden = !isFound;
        locationInput.required = isFound;
        if (!isFound) locationInput.value = '';
    }

    if (lostBtn) lostBtn.className = isFound ? 'type-btn' : 'type-btn sl';
    if (foundBtn) foundBtn.className = isFound ? 'type-btn sf' : 'type-btn';
};

/* =========================================
   SCROLL REVEAL ANIMATION
========================================= */
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            window.setTimeout(() => entry.target.classList.add('in'), index * 60);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

// Agar IntersectionObserver ishlamasa yoki prefers-reduced-motion bo'lsa,
// bo'limlar ko'rinmas holda qolmasligi uchun zaxira.
if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach((element) => element.classList.add('in'));
}
window.setTimeout(() => {
    document.querySelectorAll('.reveal:not(.in)').forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top < window.innerHeight) element.classList.add('in');
    });
}, 1500);

/* =========================================
   COUNTER ANIMATION
========================================= */
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.cnt').forEach((element) => counterObserver.observe(element));

function animateCounter(element) {
    const target = parseInt(element.dataset.t, 10) || 0;
    const suffix = element.dataset.s || '';
    const duration = 1800;
    const startTime = performance.now();

    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        element.textContent = Math.floor(eased * target).toLocaleString() + suffix;
        if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

/* =========================================
   MAP (Leaflet)
========================================= */
let map = null;

function escapeMapHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]);
}

function initMap() {
    const canvas = document.getElementById('map-canvas');
    if (!canvas || typeof L === 'undefined') return;

    if (map) {
        map.invalidateSize();
        return;
    }

    map = L.map(canvas).setView([41.311081, 69.240562], 11);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 20,
    }).addTo(map);

    loadItemsToMap();
}

async function loadItemsToMap() {
    try {
        const response = await fetch('/api/items/');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const items = await response.json();
        const bounds = [];
        let markerCount = 0;

        items.forEach((item) => {
            if (item.item_type !== 'found' || !item.latitude || !item.longitude) return;

            const marker = L.circleMarker([item.latitude, item.longitude], {
                radius: 9,
                color: '#ffffff',
                weight: 2,
                fillColor: '#20b26b',
                fillOpacity: 1,
            }).addTo(map);

            marker.bindTooltip(escapeMapHtml(item.name), { direction: 'top', offset: [0, -8] });
            marker.bindPopup(
                `<strong>${escapeMapHtml(item.name)}</strong><br>` +
                `${escapeMapHtml(item.location)}<br>` +
                `<a href="/item/${item.id}/">Batafsil</a>`
            );
            marker.on('click', () => {
                window.location.href = `/item/${item.id}/`;
            });

            bounds.push([item.latitude, item.longitude]);
            markerCount += 1;
        });

        // Barcha topilgan buyumlar ko'rinadigan qilib xaritani moslashtirish.
        if (markerCount === 1) {
            map.setView(bounds[0], 13);
        } else if (markerCount > 1) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
        }
    } catch (error) {
        console.error("E'lonlarni yuklashda xatolik:", error);
    }
}

/* =========================================
   HELPERS
========================================= */
function getCsrfToken() {
    const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
    return match ? decodeURIComponent(match[1]) : '';
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
        background: ${type === 'success' ? '#4CAF50' : '#F44336'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    toast.textContent = message;
    container.appendChild(toast);

    window.setTimeout(() => toast.remove(), 3200);
}

/* =========================================
   PROFILE MODAL
========================================= */
let profileModal = null;

async function openProfileModal() {
    if (!profileModal) createProfileModal();
    profileModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    await loadUserProfile();
}

function createProfileModal() {
    document.body.insertAdjacentHTML('beforeend', `
        <div class="profile-modal-overlay" id="profileModal">
            <div class="profile-modal">
                <button class="profile-close" id="profileCloseBtn" type="button" aria-label="Yopish">✕</button>
                <div id="profileContent">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                </div>
            </div>
        </div>
    `);
    profileModal = document.getElementById('profileModal');

    document.getElementById('profileCloseBtn').onclick = closeProfileModal;
    profileModal.onclick = function (event) {
        if (event.target === profileModal) closeProfileModal();
    };
}
window.openProfileModal = openProfileModal;

async function loadUserProfile() {
    const contentDiv = document.getElementById('profileContent');
    if (!contentDiv) return;

    try {
        const response = await fetch('/profile/');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        contentDiv.innerHTML = generateProfileHTML(data);

        contentDiv.querySelectorAll('.close-item-btn').forEach((btn) => {
            btn.onclick = () => requestCloseItem(btn.dataset.id, btn.dataset.name);
        });
    } catch (error) {
        console.error('Profile load error:', error);
        contentDiv.innerHTML = `
            <div style="text-align:center;padding:40px;color:#E74C3C">
                <p>❌ Ma'lumotlarni yuklab bo'lmadi.</p>
                <button type="button" class="profile-retry" style="margin-top:10px;padding:8px 16px;background:#F5A623;border:none;border-radius:8px;cursor:pointer">Qayta urinish</button>
            </div>
        `;
        const retry = contentDiv.querySelector('.profile-retry');
        if (retry) retry.onclick = loadUserProfile;
    }
}

function generateProfileHTML(data) {
    const statusClasses = {
        active: 'status-active',
        found: 'status-found',
        success: 'status-success',
    };

    const itemsHTML = data.items.map((item) => `
        <div class="user-item-card">
            <div class="user-item-img">
                ${item.image
            ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}">`
            : (item.item_type === 'lost' ? "🔴" : "🟢")}
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${escapeHtml(item.name)}</div>
                <div class="user-item-meta">
                    <span>${escapeHtml(item.item_type_display)}</span>
                    <span>📍 ${escapeHtml(item.location)}</span>
                    <span>📅 ${escapeHtml(item.date)}</span>
                </div>
                <div>
                    <span class="user-item-status ${statusClasses[item.status] || 'status-active'}">${escapeHtml(item.status_display)}</span>
                </div>
            </div>
            ${item.status === 'active' ? `
                <button type="button" class="close-item-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}">
                    🔒 E'lonni yopish
                </button>
            ` : `<span style="font-size:12px;color:#2ECC71">✅ Yopilgan</span>`}
        </div>
    `).join('');

    const activeCount = data.items.filter((item) => item.status === 'active').length;
    const closedCount = data.items.length - activeCount;

    return `
        <div class="profile-header">
            <div class="profile-avatar">${escapeHtml((data.username || '?').charAt(0).toUpperCase())}</div>
            <div class="profile-name">${escapeHtml(data.first_name || data.username)}</div>
            <div class="profile-email">${escapeHtml(data.email || 'Email kiritilmagan')}</div>
        </div>
        <div class="profile-stats">
            <div class="stat-card"><div class="stat-number">${data.items_count}</div><div class="stat-label">E'lonlar</div></div>
            <div class="stat-card"><div class="stat-number">${activeCount}</div><div class="stat-label">Aktiv</div></div>
            <div class="stat-card"><div class="stat-number">${closedCount}</div><div class="stat-label">Yopilgan</div></div>
        </div>
        <div class="profile-info">
            <div class="info-row"><div class="info-label">Username</div><div class="info-value">${escapeHtml(data.username)}</div></div>
            <div class="info-row"><div class="info-label">Ro'yxatdan o'tgan</div><div class="info-value">${escapeHtml(data.date_joined)}</div></div>
        </div>
        <button type="button" class="profile-support-open" data-open-support>✉ Admin bilan bog'lanish</button>
        <div class="profile-items">
            <div class="items-title">📦 Mening e'lonlarim (${data.items_count})</div>
            ${itemsHTML || `<p style="text-align:center;color:rgba(255,255,255,0.5);padding:20px">Hali e'lon berilmagan</p>`}
        </div>
    `;
}

async function requestCloseItem(itemId, itemName) {
    if (!window.confirm(`"${itemName}" e'lonini yopishni so'raysizmi?\n\nAdmin so'rovingizni ko'rib chiqib, e'lonni yopadi.`)) {
        return;
    }

    try {
        const response = await fetch(`/item/${itemId}/close-request/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        });

        if (response.redirected) {
            // Server formaga redirect qildi — xabarni ko'rsatish uchun sahifani yangilaymiz.
            window.location.href = response.url;
            return;
        }

        if (response.ok) {
            showToast('So\'rov adminga yuborildi.');
            closeProfileModal();
        } else {
            showToast('So\'rovni yuborib bo\'lmadi.', 'error');
        }
    } catch (error) {
        console.error('Close request error:', error);
        showToast('Xatolik yuz berdi. Qayta urinib ko\'ring.', 'error');
    }
}

function closeProfileModal() {
    if (profileModal) {
        profileModal.style.display = 'none';
        document.body.style.overflow = '';
    }
}
window.closeProfileModal = closeProfileModal;

/* =========================================
   INIT
========================================= */
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('modal');
    const modalClose = document.getElementById('modal-x');

    if (modalClose) modalClose.addEventListener('click', window.closeModal);
    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) window.closeModal();
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            window.closeModal();
            closeProfileModal();
        }
    });

    initMap();
});
