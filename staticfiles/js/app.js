// =========================================
// CURSOR EFFECT
// =========================================
const cur = document.getElementById('cur');
const cur2 = document.getElementById('cur2');
let mx = 0, my = 0, fx = 0, fy = 0;

if (cur && cur2) {
    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        cur.style.left = mx + 'px';
        cur.style.top = my + 'px';
    });

    function loop() {
        fx += (mx - fx) * 0.13;
        fy += (my - fy) * 0.13;
        cur2.style.left = fx + 'px';
        cur2.style.top = fy + 'px';
        requestAnimationFrame(loop);
    }
    loop();

    document.querySelectorAll('a, button, .card, .mitem, .chip, .mpin, .fcard, .step').forEach(el => {
        el.addEventListener('mouseenter', () => document.body.classList.add('hov'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('hov'));
    });
}

// =========================================
// HEADER SCROLL EFFECT
// =========================================
window.addEventListener('scroll', () => {
    const header = document.getElementById('hdr');
    if (window.scrollY > 60) {
        header.classList.add('stuck');
    } else {
        header.classList.remove('stuck');
    }
});

// =========================================
// UTILITY FUNCTIONS
// =========================================
window.scroll2 = function(id) {
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
};


// =========================================
// EMPTY CATEGORY TOGGLE
// =========================================
window.toggleEmptyMsg = function(block) {
    const msg = block.querySelector('.empty-msg');
    if (msg) {
        msg.style.display = (msg.style.display === 'none' || msg.style.display === '') 
            ? 'block' 
            : 'none';
    }
};

// =========================================
// TOAST NOTIFICATIONS
// =========================================
window.toast = function(msg, cls = 'tg') {
    const toast = document.createElement('div');
    toast.className = 'tn ' + cls;
    toast.textContent = msg;
    
    const container = document.getElementById('toasts');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.transition = 'opacity .3s';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3800);
};

// =========================================
// MODAL CONTROLS
// =========================================
let currentType = 'l'; // 'l' for lost, 'f' for found

window.openModal = function() {
    document.getElementById('modal').classList.add('open');
    document.body.style.overflow = 'hidden';
};

function closeModal() {
    document.getElementById('modal').classList.remove('open');
    document.body.style.overflow = '';
}

document.getElementById('modal-x').onclick = closeModal;
document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === e.currentTarget) {
        closeModal();
    }
});

window.setType = function(type) {
    currentType = type;
    
    const lostBtn = document.getElementById('tb-l');
    const foundBtn = document.getElementById('tb-f');
    
    if (type === 'l') {
        lostBtn.className = 'type-btn sl';
        foundBtn.className = 'type-btn';
    } else {
        lostBtn.className = 'type-btn';
        foundBtn.className = 'type-btn sf';
    }
    
    // Show/hide reward field
    const rewardRow = document.getElementById('rew-row');
    if (rewardRow) {
        rewardRow.style.display = type === 'l' ? '' : 'none';
    }
};

window.submitForm = function() {
    closeModal();
    setTimeout(() => {
        toast('✅ E\'loningiz muvaffaqiyatli joylashtirildi!', 'tf');
    }, 300);
};

// =========================================
// SCROLL REVEAL ANIMATION
// =========================================
const revealObserver = new IntersectionObserver(entries => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('in');
            }, index * 60);
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(el => {
    revealObserver.observe(el);
});

// =========================================
// COUNTER ANIMATION
// =========================================
const counterObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.cnt').forEach(el => {
    counterObserver.observe(el);
});

function animateCounter(element) {
    const target = parseInt(element.dataset.t);
    const suffix = element.dataset.s || '';
    const duration = 1800;
    const startTime = performance.now();
    
    function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4); // Quart out easing
        const current = Math.floor(eased * target);
        element.textContent = current.toLocaleString() + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(tick);
        }
    }
    
    requestAnimationFrame(tick);
}
// =========================================
// CHAT MODAL - TO'LIQ TO'G'RILANGAN VERSIYA
// =========================================
document.addEventListener('DOMContentLoaded', function () {
    const chatModal = document.getElementById('chat-modal');
    const openChatBtn = document.getElementById('open-chat-btn');
    const chatClose = document.getElementById('chat-close');
    const chatSend = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const typingEl = document.getElementById('typing');

    // Elementlarni tekshirish
    if (!chatModal) return;

    // Chatni ochish
    if (openChatBtn && chatModal) {
        const newBtn = openChatBtn.cloneNode(true);
        openChatBtn.parentNode.replaceChild(newBtn, openChatBtn);

        newBtn.addEventListener('click', function (e) {
            e.preventDefault();
            chatModal.style.display = 'flex';
            chatModal.classList.add('open');
            document.body.style.overflow = 'hidden';
            chatInput.focus();
        });
    }

    // Chatni yopish
    if (chatClose && chatModal) {
        chatClose.addEventListener('click', function () {
            chatModal.style.display = 'none';
            chatModal.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

    // Modal tashqarisiga bosganda yopish
    if (chatModal) {
        chatModal.addEventListener('click', function (e) {
            if (e.target === chatModal) {
                chatModal.style.display = 'none';
                chatModal.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    // Vaqt funksiyasi
    function getTime() {
        return new Date().toLocaleTimeString('uz', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Xabar qo‘shish
    function addChatMsg(text, role) {
        if (!chatMessages || !typingEl) return;

        const div = document.createElement('div');
        div.className = 'msg ' + (role === 'user' ? 'user' : 'bot');

        div.innerHTML =
            text.replace(/\n/g, '<br>') +
            '<div class="time">' + getTime() + '</div>';

        chatMessages.insertBefore(div, typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // CSRF token (Django uchun)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                }
            }
        }
        return cookieValue;
    }

});
    // =========================
    // 🔥 ASOSIY SEND FUNKSIYA
    // =========================
    document.addEventListener('DOMContentLoaded', function () {
    const chatModal    = document.getElementById('chat-modal');
    const openChatBtn  = document.getElementById('open-chat-btn');
    const chatClose    = document.getElementById('chat-close');
    const chatSend     = document.getElementById('chat-send');
    const chatInput    = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const typingEl     = document.getElementById('typing');

    // Chatni ochish
    if (openChatBtn && chatModal) {
        openChatBtn.addEventListener('click', function (e) {
            e.preventDefault();
            chatModal.style.display = 'flex';
            chatModal.classList.add('open');
            document.body.style.overflow = 'hidden';
            chatInput.focus();
        });
    }

    // Chatni yopish
    if (chatClose && chatModal) {
        chatClose.addEventListener('click', function () {
            chatModal.style.display = 'none';
            chatModal.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

    // Modal tashqarisiga bosganda yopish
    if (chatModal) {
        chatModal.addEventListener('click', function (e) {
            if (e.target === chatModal) {
                chatModal.style.display = 'none';
                chatModal.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    // Vaqt funksiyasi
    function getTime() {
        return new Date().toLocaleTimeString('uz', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Xabar qo‘shish
    function addChatMsg(text, role) {
        const div = document.createElement('div');
        div.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
        div.innerHTML = text.replace(/\n/g, '<br>') +
                        '<div class="time">' + getTime() + '</div>';
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // CSRF token olish (Django uchun)
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                cookie = cookie.trim();
                if (cookie.startsWith(name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                }
            }
        }
        return cookieValue;
    }

    // Asosiy yuborish funksiyasi
    async function sendMessage() {
        const msg = chatInput.value.trim();
        if (!msg) return;

        addChatMsg(msg, "user");
        chatInput.value = "";
        if (typingEl) typingEl.style.display = "block";

        try {
            const res = await fetch("/chat-ai/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": getCookie("csrftoken")
                },
                body: JSON.stringify({ message: msg })
            });
            const data = await res.json();
            if (typingEl) typingEl.style.display = "none";
            addChatMsg(data.reply, "bot");
        } catch (error) {
            console.error("❌ Xatolik:", error);
            if (typingEl) typingEl.style.display = "none";
            addChatMsg("Server bilan bog‘lanishda xatolik!", "bot");
        }
    }

    // Tugma bosilganda yuborish
    if (chatSend) {
        chatSend.addEventListener("click", sendMessage);
    }

    // Enter bosilganda yuborish
    if (chatInput) {
        chatInput.addEventListener("keydown", function (e) {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // Chat tarixini yuklash
    function loadChatHistory() {
        const chatMessages = document.getElementById("chat-messages");
        if (!chatMessages) return;
        fetch("/chat-history/")
            .then(response => response.json())
            .then(data => {
                chatMessages.innerHTML = "";
                data.messages.forEach(msg => {
                    const div = document.createElement("div");
                    div.className = msg.role === "user" ? "msg user" : "msg bot";
                    div.innerHTML = `
                        ${msg.text}
                        <div class="time">${msg.time}</div>
                    `;
                    chatMessages.appendChild(div);
                });
            })
            .catch(err => {});
    }
    loadChatHistory();

    // Statistika yuklash
    fetch("/stats/")
        .then(response => response.json())
        .then(data => {
            document.getElementById("total-items").innerText = data.total_items;
            const catBox = document.getElementById("stats-category");
            data.by_category.forEach(c => {
                const div = document.createElement("div");
                div.innerText = `${c.category}: ${c.count}`;
                catBox.appendChild(div);
            });
            const locBox = document.getElementById("stats-location");
            data.by_location.forEach(l => {
                const div = document.createElement("div");
                div.innerText = `${l.location}: ${l.count}`;
                locBox.appendChild(div);
            });
        });

    fetch("/dashboard-stats/")
        .then(response => response.json())
        .then(data => {
            document.getElementById("total-items").innerText = data.total_items;
            document.getElementById("found-items").innerText = data.found_items;
            document.getElementById("success-rate").innerText = data.success_rate + "%";
        });
    
});


// =========================================
// GOOGLE MAP INTEGRATSIYA
// =========================================
document.addEventListener("DOMContentLoaded", function () {
    const mapCanvas = document.getElementById("map-canvas");
    if (!mapCanvas) return;

    function initMap() {
        const center = { lat: 41.3111, lng: 69.2797 }; // Toshkent markazi
        const map = new google.maps.Map(mapCanvas, {
            zoom: 12,
            center: center,
        });

        // Backenddan e’lonlarni olish
        fetch("/items-map/")
            .then(res => res.json())
            .then(items => {
                items.forEach(item => {
                    const marker = new google.maps.Marker({
                        position: { lat: item.latitude, lng: item.longitude },
                        map: map,
                        title: item.name,
                        icon: item.item_type === "lost"
                            ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                            : "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    });

                    const infoWindow = new google.maps.InfoWindow({
                        content: `<b>${item.name}</b><br>${item.category} · ${item.location}<br>Status: ${item.status}`
                    });

                    marker.addListener("click", () => {
                        infoWindow.open(map, marker);
                    });
                });
            });
    }

    // Google Maps API chaqirish
    window.initMap = initMap;
});


// Profil modal elementlari
let profileModal = null;
let profileData = null;

// Profil modalni ochish
async function openProfileModal() {
    // Modal yaratish (agar mavjud bo'lmasa)
    if (!profileModal) {
        createProfileModal();
    }
    
    profileModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Ma'lumotlarni yuklash
    await loadUserProfile();
}

// Profil modalni yaratish
function createProfileModal() {
    const modalHTML = `
        <div class="profile-modal-overlay" id="profileModal">
            <div class="profile-modal">
                <button class="profile-close" id="profileCloseBtn">✕</button>
                <div id="profileContent">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                        <p>Yuklanmoqda...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    profileModal = document.getElementById('profileModal');
    
    // Yopish tugmasi
    document.getElementById('profileCloseBtn').onclick = closeProfileModal;
    
    // Background bosilganda yopish
    profileModal.onclick = function(e) {
        if (e.target === profileModal) closeProfileModal();
    };
}

// Profil ma'lumotlarini yuklash
async function loadUserProfile() {
    const contentDiv = document.getElementById('profileContent');
    if (!contentDiv) return;
    
    try {
        const response = await fetch('/profile/');
        
        // Response statusni tekshirish
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Profil HTML ni yaratish
        contentDiv.innerHTML = generateProfileHTML(data);
        
        // E'lonlarni yopish tugmalariga event listener qo'shish
        document.querySelectorAll('.close-item-btn').forEach(btn => {
            btn.onclick = () => closeUserItem(btn.dataset.id, btn.dataset.name);
        });
        
    } catch (error) {
        console.error('Profile load error:', error);
        contentDiv.innerHTML = `
            <div style="text-align:center;padding:40px;color:#E74C3C">
                <p>❌ Xatolik: ${error.message}</p>
                <button onclick="loadUserProfile()" style="margin-top:10px;padding:8px 16px;background:#F5A623;border:none;border-radius:8px;cursor:pointer">Qayta urinish</button>
            </div>
        `;
    }
}

// Profil HTML ni yaratish
function generateProfileHTML(data) {
    // Status class va text
    const getStatusClass = (status) => {
        const classes = {
            'active': 'status-active',
            'found': 'status-found', 
            'success': 'status-success',
            'reported': 'status-reported'
        };
        return classes[status] || 'status-active';
    };
    
    const getStatusText = (status) => {
        const texts = {
            'active': 'Aktiv',
            'found': 'Topilgan',
            'success': 'Muvaffaqiyatli',
            'reported': 'Report qilingan'
        };
        return texts[status] || status;
    };
    
    // E'lonlar ro'yxati
    const itemsHTML = data.items.map(item => `
        <div class="user-item-card">
            <div class="user-item-img">
                ${item.image ? `<img src="${item.image}" alt="${item.name}">` : (item.item_type === 'lost' ? '🔴' : '🟢')}
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${escapeHtml(item.name)}</div>
                <div class="user-item-meta">
                    <span>${item.item_type_display}</span>
                    <span>📍 ${escapeHtml(item.location)}</span>
                    <span>📅 ${item.date}</span>
                </div>
                <div>
                    <span class="user-item-status ${getStatusClass(item.status)}">${getStatusText(item.status)}</span>
                </div>
            </div>
            ${item.status === 'active' ? `
                <button class="close-item-btn" data-id="${item.id}" data-name="${escapeHtml(item.name)}">
                    🔒 E'lonni yopish
                </button>
            ` : `
                <span style="font-size:12px;color:#2ECC71">✅ Yopilgan</span>
            `}
        </div>
    `).join('');
    
    return `
        <div class="profile-header">
            <div class="profile-avatar">${data.username.charAt(0).toUpperCase()}</div>
            <div class="profile-name">${escapeHtml(data.first_name || data.username)}</div>
            <div class="profile-email">${escapeHtml(data.email || 'Email kiritilmagan')}</div>
        </div>
        <div class="profile-stats">
            <div class="stat-card">
                <div class="stat-number">${data.items_count}</div>
                <div class="stat-label">E'lonlar</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.items.filter(i => i.status === 'active').length}</div>
                <div class="stat-label">Aktiv</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.items.filter(i => i.status !== 'active').length}</div>
                <div class="stat-label">Yopilgan</div>
            </div>
        </div>
        <div class="profile-info">
            <div class="info-row">
                <div class="info-label">Username</div>
                <div class="info-value">${escapeHtml(data.username)}</div>
            </div>
            <div class="info-row">
                <div class="info-label">Ro'yxatdan o'tgan</div>
                <div class="info-value">${data.date_joined}</div>
            </div>
        </div>
        <div class="profile-items">
            <div class="items-title">📦 Mening e'lonlarim (${data.items_count})</div>
            ${itemsHTML || '<p style="text-align:center;color:rgba(255,255,255,0.5);padding:20px">Hali e\'lon berilmagan</p>'}
        </div>
    `;
}

// XSS himoyasi uchun
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
// E'lonni yopish
async function closeUserItem(itemId, itemName) {
    if (!confirm(`"${itemName}" e'lonini yopishni tasdiqlaysizmi?`)) return;
    
    try {
        const response = await fetch(`/item/${itemId}/close/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            await loadUserProfile(); // Profilni qayta yuklash
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        showToast('Xatolik yuz berdi', 'error');
    }
}

// Profil modalni yopish
async function openProfileModal() {
    let modal = document.getElementById('profileModal');
    
    if (!modal) {
        createProfileModal();
        modal = document.getElementById('profileModal');
    }
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    await loadUserProfile();
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}
// Escape tugmasi bilan yopish
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && profileModal && profileModal.style.display === 'flex') {
        closeProfileModal();
    }
});