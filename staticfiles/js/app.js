// =========================================
// CURSOR EFFECT
// =========================================
const cur = document.getElementById('cur');
const cur2 = document.getElementById('cur2');
let mx = 0, my = 0, fx = 0, fy = 0;

// Track mouse movement
document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    cur.style.left = mx + 'px';
    cur.style.top = my + 'px';
});

// Smooth cursor animation
function loop() {
    fx += (mx - fx) * 0.13;
    fy += (my - fy) * 0.13;
    cur2.style.left = fx + 'px';
    cur2.style.top = fy + 'px';
    requestAnimationFrame(loop);
}
loop();

// Add hover effect on interactive elements
document.querySelectorAll('a, button, .card, .mitem, .chip, .mpin, .fcard, .step').forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('hov'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('hov'));
});

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
// CHIPS FILTER
// =========================================
document.getElementById('chips').addEventListener('click', e => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    
    // Update active state
    document.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
    chip.classList.add('on');
    
    const filter = chip.dataset.f;
    
    // Filter cards
    document.querySelectorAll('.card').forEach((card, index) => {
        const show = filter === 'all' || 
                    card.dataset.status === filter || 
                    card.dataset.cat === filter;
        
        card.style.transition = `opacity .35s ${index * 0.04}s, transform .35s ${index * 0.04}s`;
        card.style.opacity = show ? '1' : '0.12';
        card.style.transform = show ? '' : 'scale(0.95)';
        card.style.pointerEvents = show ? '' : 'none';
    });
});

// =========================================
// SEARCH FUNCTIONALITY
// =========================================
window.doSearch = function() {
    const query = document.getElementById('s-inp').value.trim();
    if (!query) {
        toast('Qidiruv so\'zini kiriting!', 'tr');
        return;
    }
    toast(`🔍 "${query}" bo'yicha qidirilmoqda...`, 'tg');
    filterByText(query.toLowerCase());
};

document.getElementById('s-inp').addEventListener('input', function(e) {
    if (!e.target.value) {
        // Reset all cards
        document.querySelectorAll('.card').forEach(c => {
            c.style.opacity = '1';
            c.style.transform = '';
            c.style.pointerEvents = '';
        });
        return;
    }
    filterByText(e.target.value.toLowerCase());
});

document.getElementById('s-inp').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        doSearch();
    }
});

function filterByText(query) {
    document.querySelectorAll('.card').forEach(c => {
        const text = (c.textContent || '').toLowerCase();
        const matches = text.includes(query);
        c.style.opacity = matches ? '1' : '0.1';
        c.style.transform = matches ? '' : 'scale(0.94)';
        c.style.pointerEvents = matches ? '' : 'none';
    });
}

// =========================================
// 3D CARD TILT EFFECT
// =========================================
document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        
        this.style.transform = `translateY(-10px) rotateX(${-y * 5}deg) rotateY(${x * 5}deg)`;
        this.style.transition = 'transform .08s ease';
    });
    
    card.addEventListener('mouseleave', function() {
        this.style.transform = '';
        this.style.transition = 'all .5s cubic-bezier(.23,1,.32,1)';
    });
});

// =========================================
// LIVE FEED
// =========================================
const FEED_ITEMS = [
    { type: 'l', icon: '🔑', text: '<strong>Alisher T.</strong> kalitlarini yo\'qotdi', location: 'Chilonzor', time: '2 daqiqa oldin' },
    { type: 'f', icon: '👛', text: '<strong>Malika S.</strong> hamyon topdi', location: 'Yunusobod', time: '5 daqiqa oldin' },
    { type: 'l', icon: '📱', text: '<strong>Bobur K.</strong> iPhone yo\'qotdi', location: 'Mirobod', time: '12 daqiqa oldin' },
    { type: 'f', icon: '🐕', text: '<strong>Nilufar R.</strong> it topdi', location: 'Sergeli', time: '18 daqiqa oldin' },
    { type: 'f', icon: '🎒', text: '<strong>Jamshid A.</strong> ryukzak topdi', location: 'Bektemir', time: '25 daqiqa oldin' },
    { type: 'l', icon: '💍', text: '<strong>Zulfiya M.</strong> uzuk yo\'qotdi', location: 'Shayxontohur', time: '31 daqiqa oldin' }
];

const feedContainer = document.getElementById('feed-items');

function createFeedItem(data, delay = 0) {
    const item = document.createElement('div');
    item.className = 'fi';
    item.style.animationDelay = delay + 's';
    
    const isLost = data.type === 'l';
    const statusClass = isLost ? 'l' : 'f';
    const statusColor = isLost ? 'var(--red)' : 'var(--green)';
    const statusBg = isLost ? 'rgba(217,95,95,.1)' : 'rgba(77,171,130,.1)';
    const statusBorder = isLost ? 'rgba(217,95,95,.3)' : 'rgba(77,171,130,.3)';
    const statusText = isLost ? 'Yo\'qolgan' : 'Topilgan';
    
    item.innerHTML = `
        <div class="fi-ico ${statusClass}">${data.icon}</div>
        <div class="fi-txt">
            <div>${data.text} — ${data.location}</div>
            <div class="fi-time">${data.time}</div>
        </div>
        <span class="fi-lbl" style="background:${statusBg};color:${statusColor};border:1px solid ${statusBorder}">${statusText}</span>
    `;
    
    return item;
}

// Initial feed items
FEED_ITEMS.slice(0, 5).forEach((item, i) => {
    feedContainer.appendChild(createFeedItem(item, i * 0.1));
});

// Add new items periodically
setInterval(() => {
    const randomItem = { ...FEED_ITEMS[Math.floor(Math.random() * FEED_ITEMS.length)] };
    randomItem.time = 'Hozir';
    
    const newItem = createFeedItem(randomItem);
    feedContainer.insertBefore(newItem, feedContainer.firstChild);
    
    // Remove old items if more than 6
    const allItems = feedContainer.querySelectorAll('.fi');
    if (allItems.length > 6) {
        feedContainer.removeChild(allItems[allItems.length - 1]);
    }
    
    // Show toast notification
    toast(`${randomItem.icon} Yangi ${randomItem.type === 'l' ? 'yo\'qolgan' : 'topilgan'} e\'lon!`, 
          randomItem.type === 'l' ? 'tr' : 'tf');
}, 9000);

// =========================================
// WELCOME MESSAGE
// =========================================
setTimeout(() => {
    toast('👋 Topildi.uz\'ga xush kelibsiz!', 'tg');
}, 1600);

// =========================================
// INITIALIZATION
// =========================================
console.log('Topildi.uz ishladi!');



