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