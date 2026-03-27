// Bu yerda login qismuchun js qismi:
// script.js
// ── Particles
const container = document.getElementById('particles');
for (let i = 0; i < 25; i++) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.left = Math.random() * 100 + '%';
  p.style.width = p.style.height = (Math.random() * 3 + 1) + 'px';
  p.style.animationDuration = (Math.random() * 15 + 10) + 's';
  p.style.animationDelay = (Math.random() * 10) + 's';
  container.appendChild(p);
}

// ── Toggle password
const togglePass = document.getElementById('togglePass');
const passwordInput = document.getElementById('password');
const eyeIcon = document.getElementById('eyeIcon');
let visible = false;

togglePass.addEventListener('click', () => {
  visible = !visible;
  passwordInput.type = visible ? 'text' : 'password';
  eyeIcon.innerHTML = visible
    ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
       <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
       <line x1="1" y1="1" x2="23" y2="23"/>`
    : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
});

// ── Login handler
function handleLogin() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const btn = document.getElementById('submitBtn');
  const err = document.getElementById('errorMsg');

  err.classList.remove('show');

  if (!email || !password) {
    err.textContent = '⚠️ Iltimos, barcha maydonlarni to\'ldiring.';
    err.classList.add('show');
    document.getElementById('loginForm').classList.add('shake');
    setTimeout(() => document.getElementById('loginForm').classList.remove('shake'), 400);
    return;
  }

  btn.classList.add('loading');

  setTimeout(() => {
    btn.classList.remove('loading');
    // Simulate auth check
    if (email === 'demo@topilsinbiz.uz' && password === 'demo123') {
      btn.querySelector('span').textContent = '✓ Muvaffaqiyatli!';
      btn.style.background = 'rgba(39,174,96,0.2)';
      btn.style.borderColor = '#2ecc71';
      btn.style.color = '#2ecc71';
    } else {
      err.textContent = '📍 Email yoki parol noto\'g\'ri. Qayta urinib ko\'ring.';
      err.classList.add('show');
      document.getElementById('loginForm').classList.add('shake');
      setTimeout(() => document.getElementById('loginForm').classList.remove('shake'), 400);
    }
  }, 1800);
}

// Enter key support
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});