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
// CHAT MODAL - TO'LIQ QAYTA YOZILGAN VERSIYA
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    const chatModal = document.getElementById('chat-modal');
    const openChatBtn = document.getElementById('open-chat-btn');
    const chatClose = document.getElementById('chat-close');
    const chatSend = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const typingEl = document.getElementById('typing');
    const chatHistory = [];

    // Elementlarni tekshirish
    if (!chatModal) console.error('❌ chat-modal topilmadi!');
    if (!openChatBtn) console.error('❌ open-chat-btn topilmadi!');
    if (!chatClose) console.error('❌ chat-close topilmadi!');

    // Chatni ochish
    if (openChatBtn && chatModal) {
        // Eski eventlarni tozalash
        const newBtn = openChatBtn.cloneNode(true);
        openChatBtn.parentNode.replaceChild(newBtn, openChatBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('✅ Chat ochilmoqda...');
            chatModal.style.display = 'flex';
            chatModal.classList.add('open');
            document.body.style.overflow = 'hidden';
            if (chatInput) chatInput.focus();
        });
    }

    // Chatni yopish
    if (chatClose && chatModal) {
        chatClose.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('✅ Chat yopilmoqda...');
            chatModal.style.display = 'none';
            chatModal.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

    // Modal tashqarisiga bosganda yopish
    if (chatModal) {
        chatModal.addEventListener('click', function(e) {
            if (e.target === chatModal) {
                chatModal.style.display = 'none';
                chatModal.classList.remove('open');
                document.body.style.overflow = '';
            }
        });
    }

    // Vaqt olish
    function getTime() {
        return new Date().toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
    }

    // Xabar qo'shish
    function addChatMsg(text, role) {
        if (!chatMessages || !typingEl) return;
        const div = document.createElement('div');
        div.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
        div.innerHTML = text.replace(/\n/g, '<br>') + '<div class="time">' + getTime() + '</div>';
        chatMessages.insertBefore(div, typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // CSRF token olish
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    // Xabar yuborish
    async function sendChatMsg() {
        if (!chatInput || !chatMessages) return;
        
        const text = chatInput.value.trim();
        if (!text) return;
        
        chatInput.value = '';
        addChatMsg(text, 'user');
        chatHistory.push({ role: 'user', content: text });
        
        if (typingEl) typingEl.style.display = 'flex';

        try {
            const response = await fetch('/ask-ai/', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({ text: text, history: chatHistory })
            });
            
            const data = await response.json();
            const reply = data.reply || "Xatolik yuz berdi. Qayta urinib ko'ring.";
            chatHistory.push({ role: 'assistant', content: reply });
            if (typingEl) typingEl.style.display = 'none';
            addChatMsg(reply, 'bot');
        } catch (e) {
            console.error('Chat error:', e);
            if (typingEl) typingEl.style.display = 'none';
            addChatMsg('❌ Tarmoq xatosi. Iltimos, qayta urinib ko\'ring.', 'bot');
        }
        
        if (chatInput) chatInput.focus();
    }

    // Event listenerlar
    if (chatSend) {
        chatSend.addEventListener('click', sendChatMsg);
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendChatMsg();
            }
        });
    }

    console.log('✅ Chat modul yuklandi');
});