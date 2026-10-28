/* login.js — Kirish sahifasi */

/* ── Particles ── */
const particlesContainer = document.getElementById('particles');
if (particlesContainer) {
  for (let i = 0; i < 25; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = Math.random() * 100 + '%';
    particle.style.width = particle.style.height = (Math.random() * 3 + 1) + 'px';
    particle.style.animationDuration = (Math.random() * 15 + 10) + 's';
    particle.style.animationDelay = (Math.random() * 10) + 's';
    particlesContainer.appendChild(particle);
  }
}

/* ── Parolni ko'rsatish/yashirish ── */
const togglePass = document.getElementById('togglePass');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');
let passwordVisible = false;

if (togglePass && passwordInput && eyeIcon) {
  togglePass.addEventListener('click', () => {
    passwordVisible = !passwordVisible;
    passwordInput.type = passwordVisible ? 'text' : 'password';
    eyeIcon.innerHTML = passwordVisible
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
         <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
         <line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}

/* ── Form submit: brauzer validatsiyasi + yuklanish holati ──
   Formani Django qabul qiladi (action="{% url 'login' %}"), JS faqat
   foydalanuvchiga darhol javob beradi. Soxta "demo" tekshiruvi olib tashlandi. */
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    const username = document.getElementById('username');
    const password = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');

    if (!username.value.trim() || !password.value) {
      event.preventDefault();
      loginForm.classList.add('shake');
      window.setTimeout(() => loginForm.classList.remove('shake'), 400);
      if (!username.value.trim()) username.focus();
      else password.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;
      const label = submitBtn.querySelector('span');
      if (label) label.textContent = 'Kirilmoqda...';
    }
  });

  // Xato bo'lsa yuklanish holatini tiklash uchun
  window.addEventListener('pageshow', () => {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      const label = submitBtn.querySelector('span');
      if (label) label.textContent = 'Kirish  →';
    }
  });
}
