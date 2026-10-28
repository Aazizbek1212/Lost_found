/* =========================================
   Chat AI — bosh sahifadagi AI yordamchi
========================================= */
document.addEventListener('DOMContentLoaded', function () {
    const chatModal = document.getElementById('chat-modal');
    const openChatBtn = document.getElementById('open-chat-btn');
    const chatClose = document.getElementById('chat-close');
    const chatSend = document.getElementById('chat-send');
    const chatInput = document.getElementById('chat-input');
    const chatMessages = document.getElementById('chat-messages');
    const typingEl = document.getElementById('typing');

    if (!chatModal) return;

    function getTime() {
        return new Date().toLocaleTimeString('uz', { hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }

    function addChatMsg(text, role, time) {
        if (!chatMessages) return;
        const div = document.createElement('div');
        div.className = 'msg ' + (role === 'user' ? 'user' : 'bot');
        // innerHTML emas — XSS oldini olish uchun matnni escape qilamiz.
        div.innerHTML = `${escapeHtml(text).replace(/\n/g, '<br>')}<div class="time">${escapeHtml(time || getTime())}</div>`;
        if (typingEl && typingEl.parentElement === chatMessages) {
            chatMessages.insertBefore(div, typingEl);
        } else {
            chatMessages.appendChild(div);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    }

    function openChat() {
        chatModal.style.display = 'flex';
        chatModal.classList.add('open');
        document.body.style.overflow = 'hidden';
        if (chatInput) chatInput.focus();
    }

    function closeChat() {
        chatModal.style.display = 'none';
        chatModal.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (openChatBtn) {
        openChatBtn.addEventListener('click', function (event) {
            event.preventDefault();
            openChat();
        });
    }

    if (chatClose) chatClose.addEventListener('click', closeChat);

    chatModal.addEventListener('click', function (event) {
        if (event.target === chatModal) closeChat();
    });

    let sending = false;

    async function sendMessage() {
        if (!chatInput) return;
        const text = chatInput.value.trim();
        if (!text || sending) return;

        sending = true;
        addChatMsg(text, 'user');
        chatInput.value = '';
        if (typingEl) typingEl.style.display = 'block';
        if (chatSend) chatSend.disabled = true;

        try {
            const response = await fetch('/chat-ai/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify({ message: text }),
            });
            const data = await response.json().catch(() => ({}));
            addChatMsg(data.reply || "Javob olinmadi. Qayta urinib ko'ring.", 'bot');
        } catch (error) {
            console.error('Chat error:', error);
            addChatMsg("Server bilan bog'lanishda xatolik!", 'bot');
        } finally {
            if (typingEl) typingEl.style.display = 'none';
            if (chatSend) chatSend.disabled = false;
            sending = false;
        }
    }

    if (chatSend) chatSend.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keydown', function (event) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
        });
    }

    async function loadChatHistory() {
        if (!chatMessages) return;
        try {
            const response = await fetch('/chat-history/');
            if (!response.ok) return;
            const data = await response.json();
            if (!data.messages || !data.messages.length) return;

            Array.from(chatMessages.querySelectorAll('.msg')).forEach((node) => node.remove());
            data.messages.forEach((message) => addChatMsg(message.text, message.role, message.time));
        } catch (error) {
            console.error('Chat history error:', error);
        }
    }

    loadChatHistory();
});
