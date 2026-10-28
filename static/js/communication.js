(() => {
    const notificationsOpen = document.getElementById('notifications-open');
    if (!notificationsOpen) return;

    const notificationsOverlay = document.getElementById('notifications-overlay');
    const supportOverlay = document.getElementById('support-overlay');
    const profileOverlay = document.getElementById('profile-overlay');
    const notificationCount = document.getElementById('notification-count');
    const notificationList = document.getElementById('notification-list');
    const notificationMarkRead = document.getElementById('notifications-mark-read');
    const supportMessages = document.getElementById('support-messages');
    const supportForm = document.getElementById('support-form');
    const supportInput = document.getElementById('support-input');
    const supportSend = document.getElementById('support-send');
    const supportFeedback = document.getElementById('support-feedback');
    let supportPoll = null;
    let notificationFilter = 'new_listing';
    let cachedNotifications = [];

    const PROFILE_API = '/api/profile/';
    const closeRequestUrl = id => `/api/items/${id}/close-request/`;

    document.querySelectorAll('[data-profile-toggle]').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const dropdown = toggle.parentElement.querySelector('[data-profile-dropdown]');
            dropdown.hidden = !dropdown.hidden;
            toggle.setAttribute('aria-expanded', String(!dropdown.hidden));
        });
    });

    document.addEventListener('click', event => {
        document.querySelectorAll('[data-profile-toggle]').forEach(toggle => {
            if (toggle.parentElement.contains(event.target)) return;
            const dropdown = toggle.parentElement.querySelector('[data-profile-dropdown]');
            dropdown.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
        });
    });

    function csrfToken() {
        const match = document.cookie.match(/(?:^|; )csrftoken=([^;]*)/);
        return match ? decodeURIComponent(match[1]) : '';
    }

    async function apiRequest(url, options = {}) {
        const headers = { ...(options.headers || {}) };
        if (options.method && options.method !== 'GET') headers['X-CSRFToken'] = csrfToken();
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    }

    function setUnreadCount(count) {
        notificationCount.textContent = count > 99 ? '99+' : String(count);
        notificationCount.hidden = count < 1;
    }

    function formatTime(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('uz-UZ', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
    }

    /* ---------------- PROFIL ---------------- */

    function renderProfile(data) {
        document.getElementById('profile-phone').textContent = data.phone || '—';
        document.getElementById('profile-stat-active').textContent = data.stats.active;
        document.getElementById('profile-stat-closed').textContent = data.stats.closed;
        document.getElementById('profile-stat-rate').textContent = data.stats.success_rate + '%';

        const list = document.getElementById('profile-items');
        list.replaceChildren();
        if (!data.items.length) {
            const empty = document.createElement('p');
            empty.className = 'communication-empty';
            empty.textContent = 'Hozircha e’lon bermagansiz.';
            list.appendChild(empty);
            return;
        }

        data.items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'profile-item';

            const info = document.createElement('a');
            info.className = 'profile-item-info';
            info.href = item.url;

            const badge = document.createElement('span');
            badge.className = `profile-badge ${item.item_type === 'found' ? 'found' : 'lost'}`;
            badge.textContent = item.item_type === 'found' ? 'Topilgan' : 'Yo‘qolgan';

            const name = document.createElement('span');
            name.className = 'profile-item-name';
            name.textContent = item.name;

            const date = document.createElement('span');
            date.className = 'profile-item-date';
            date.textContent = item.date;

            info.append(badge, name, date);
            row.appendChild(info);

            const action = document.createElement('button');
            action.type = 'button';
            action.className = 'profile-close-btn';
            if (item.state === 'closed') {
                action.textContent = 'Yopilgan';
                action.disabled = true;
                action.classList.add('is-closed');
            } else if (item.state === 'pending') {
                action.textContent = 'So‘rov yuborilgan';
                action.disabled = true;
                action.classList.add('is-pending');
            } else {
                action.textContent = 'E’lonni yopish';
                action.addEventListener('click', async () => {
                    if (!confirm('E’lonni yopish uchun adminga so‘rov yuborilsinmi?')) return;
                    action.disabled = true;
                    try {
                        await apiRequest(closeRequestUrl(item.id), { method: 'POST' });
                        action.textContent = 'So‘rov yuborilgan';
                        action.classList.add('is-pending');
                    } catch (error) {
                        action.disabled = false;
                        action.textContent = 'Xatolik, qayta urining';
                    }
                });
            }
            row.appendChild(action);
            list.appendChild(row);
        });
    }

    async function loadProfile() {
        try {
            renderProfile(await apiRequest(PROFILE_API));
        } catch (error) {
            document.getElementById('profile-items').textContent = 'Ma’lumotlarni yuklab bo‘lmadi.';
        }
    }

    window.openProfileModal = () => {
        if (!profileOverlay) return;
        profileOverlay.hidden = false;
        loadProfile();
    };

    /* ---------------- BILDIRISHNOMALAR ---------------- */

    function renderNotifications() {
        notificationList.replaceChildren();
        const notifications = cachedNotifications.filter(notification =>
            notificationFilter === 'new_listing'
                ? notification.type === 'new_listing'
                : notification.type !== 'new_listing'
        );

        if (!notifications.length) {
            const empty = document.createElement('p');
            empty.className = 'communication-empty';
            empty.textContent = notificationFilter === 'new_listing'
                ? 'Hozircha yangi e’lon yo‘q.'
                : 'Hozircha admin xabari yo‘q.';
            notificationList.appendChild(empty);
            return;
        }

        notifications.forEach(notification => {
            const card = document.createElement('article');
            card.className = `notification-card${notification.is_read ? '' : ' unread'}`;

            const title = document.createElement('div');
            title.className = 'notification-title';
            title.textContent = notification.title;
            const message = document.createElement('div');
            message.className = 'notification-message';
            message.textContent = notification.message;
            const time = document.createElement('div');
            time.className = 'notification-time';
            time.textContent = formatTime(notification.created_at);
            card.append(title, message, time);
            if (notification.type === 'new_listing' && notification.item_url) {
                const viewLink = document.createElement('a');
                viewLink.className = 'notification-view';
                viewLink.href = notification.item_url;
                viewLink.textContent = 'Ko‘rish';
                card.appendChild(viewLink);
            }
            notificationList.appendChild(card);
        });
    }

    async function loadNotifications() {
        const data = await apiRequest('/api/notifications/');
        cachedNotifications = data.notifications;
        setUnreadCount(data.unread_count);
        renderNotifications();
    }

    if (!notificationsOverlay || !supportOverlay) return;

    notificationsOpen.addEventListener('click', async () => {
        notificationsOverlay.hidden = false;
        try {
            await loadNotifications();
        } catch (error) {
            notificationList.textContent = 'Bildirishnomalarni yuklab bo‘lmadi. Qayta urinib ko‘ring.';
        }
    });

    notificationMarkRead.addEventListener('click', async () => {
        notificationMarkRead.disabled = true;
        try {
            await apiRequest('/api/notifications/read/', { method: 'POST' });
            cachedNotifications = cachedNotifications.map(notification => ({ ...notification, is_read: true }));
            setUnreadCount(0);
            renderNotifications();
        } catch (error) {
            notificationList.textContent = 'Xabarlarni o‘qilgan deb belgilab bo‘lmadi.';
        } finally {
            notificationMarkRead.disabled = false;
        }
    });

    document.querySelectorAll('[data-notification-filter]').forEach(tab => {
        tab.addEventListener('click', () => {
            notificationFilter = tab.dataset.notificationFilter;
            document.querySelectorAll('[data-notification-filter]').forEach(item => {
                const isActive = item === tab;
                item.classList.toggle('active', isActive);
                item.setAttribute('aria-selected', String(isActive));
            });
            renderNotifications();
        });
    });

    /* ---------------- ADMIN BILAN SUHBAT ---------------- */

    async function loadSupportMessages() {
        const data = await apiRequest('/api/support-chat/');
        supportMessages.replaceChildren();
        if (!data.messages.length) {
            const empty = document.createElement('p');
            empty.className = 'communication-empty';
            empty.textContent = 'Admin bilan suhbatni boshlash uchun xabar yozing.';
            supportMessages.appendChild(empty);
            return;
        }

        data.messages.forEach(message => {
            const bubble = document.createElement('article');
            bubble.className = `support-message${message.is_from_admin ? '' : ' from-user'}`;
            const author = document.createElement('div');
            author.className = 'support-message-author';
            author.textContent = message.is_from_admin ? 'Admin' : 'Siz';
            const body = document.createElement('div');
            body.className = 'support-message-body';
            body.textContent = message.body;
            const time = document.createElement('div');
            time.className = 'support-message-time';
            time.textContent = formatTime(message.created_at);
            bubble.append(author, body, time);
            supportMessages.appendChild(bubble);
        });
        supportMessages.scrollTop = supportMessages.scrollHeight;
    }

    async function openSupportChat() {
        supportOverlay.hidden = false;
        supportInput.focus();
        supportFeedback.textContent = '';
        try {
            await loadSupportMessages();
        } catch (error) {
            supportFeedback.textContent = 'Suhbatni yuklab bo‘lmadi.';
        }
        if (supportPoll) clearInterval(supportPoll);
        supportPoll = setInterval(() => {
            loadSupportMessages().catch(() => {});
        }, 5000);
    }

    function closeProfileDropdowns() {
        document.querySelectorAll('[data-profile-dropdown]').forEach(dropdown => {
            dropdown.hidden = true;
        });
        document.querySelectorAll('[data-profile-toggle]').forEach(toggle => {
            toggle.setAttribute('aria-expanded', 'false');
        });
    }

    document.addEventListener('click', event => {
        if (event.target.closest('[data-open-profile]')) {
            closeProfileDropdowns();
            if (typeof window.openProfileModal === 'function') window.openProfileModal();
        }

        if (event.target.closest('[data-open-support]')) {
            closeProfileDropdowns();
            openSupportChat();
        }
    });

    supportForm.addEventListener('submit', async event => {
        event.preventDefault();
        const message = supportInput.value.trim();
        if (!message) return;

        supportSend.disabled = true;
        supportFeedback.textContent = '';
        try {
            await apiRequest('/api/support-chat/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });
            supportInput.value = '';
            await loadSupportMessages();
        } catch (error) {
            supportFeedback.textContent = 'Xabar yuborilmadi. Qayta urinib ko‘ring.';
        } finally {
            supportSend.disabled = false;
        }
    });

    /* ---------------- YOPISH ---------------- */

    function stopSupportPoll() {
        if (supportPoll) {
            clearInterval(supportPoll);
            supportPoll = null;
        }
    }

    document.querySelectorAll('[data-close]').forEach(button => {
        button.addEventListener('click', () => {
            const overlay = document.getElementById(button.dataset.close);
            overlay.hidden = true;
            if (overlay === supportOverlay) stopSupportPoll();
        });
    });

    [notificationsOverlay, supportOverlay, profileOverlay].filter(Boolean).forEach(overlay => {
        overlay.addEventListener('click', event => {
            if (event.target === overlay) {
                overlay.hidden = true;
                if (overlay === supportOverlay) stopSupportPoll();
            }
        });
    });

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        notificationsOverlay.hidden = true;
        supportOverlay.hidden = true;
        if (profileOverlay) profileOverlay.hidden = true;
        stopSupportPoll();
    });

    loadNotifications().catch(() => setUnreadCount(0));
    window.setInterval(() => {
        loadNotifications().catch(() => {});
    }, 30000);
})();