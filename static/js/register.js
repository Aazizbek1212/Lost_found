/* register.js — Ro'yxatdan o'tish sahifasi */

/* =========================================
   PAROL KUCHI
========================================= */
function checkStrength(value) {
  let score = 0;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value)) score++;
  if (/[0-9]/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;

  const colors = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60'];
  const labels = ['Juda zaif', 'Zaif', "O'rtacha", 'Kuchli 💪'];

  for (let i = 1; i <= 4; i++) {
    const segment = document.getElementById('seg' + i);
    if (segment) {
      segment.style.background = i <= score ? colors[Math.max(score - 1, 0)] : 'var(--border)';
    }
  }

  const text = document.getElementById('strength-text');
  if (text) {
    text.textContent = value ? (labels[Math.max(score - 1, 0)]) : 'Parol kuchini tekshirmoqda...';
    text.style.color = value ? colors[Math.max(score - 1, 0)] : 'var(--muted)';
  }
}

/* =========================================
   PAROLNI KO'RSATISH/YASHIRISH
========================================= */
function togglePass(id, button) {
  const input = document.getElementById(id);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    if (button) button.textContent = '🙈';
  } else {
    input.type = 'password';
    if (button) button.textContent = '👁';
  }
}

/* =========================================
   PAROLLAR MOSLIGI
========================================= */
function checkPasswordMatch() {
  const pass = document.getElementById('pass');
  const pass2 = document.getElementById('pass2');
  const errorEl = document.getElementById('pass2-err');
  if (!pass || !pass2 || !errorEl) return;

  if (pass.value && pass2.value && pass.value !== pass2.value) {
    errorEl.classList.add('visible');
  } else {
    errorEl.classList.remove('visible');
  }
}

/* =========================================
   FORMA VALIDATSIYASI
========================================= */
document.addEventListener('DOMContentLoaded', function () {
  const form = document.getElementById('registrationForm');
  if (!form) return;

  const username = document.getElementById('username');
  const pass = document.getElementById('pass');
  const pass2 = document.getElementById('pass2');

  form.addEventListener('submit', function (event) {
    let ok = true;

    const usernameError = document.getElementById('username-err');
    if (!username.value.trim()) {
      if (usernameError) usernameError.classList.add('visible');
      ok = false;
    } else if (usernameError) {
      usernameError.classList.remove('visible');
    }

    const passError = document.getElementById('pass-err');
    if (pass.value.length < 8) {
      if (passError) passError.classList.add('visible');
      ok = false;
    } else if (passError) {
      passError.classList.remove('visible');
    }

    const pass2Error = document.getElementById('pass2-err');
    if (pass.value !== pass2.value) {
      if (pass2Error) pass2Error.classList.add('visible');
      ok = false;
    } else if (pass2Error) {
      pass2Error.classList.remove('visible');
    }

    if (!ok) {
      event.preventDefault();
      const firstInvalid = form.querySelector('.field-error.visible');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const submitButton = form.querySelector('.btn-next span');
    if (submitButton) submitButton.textContent = 'Yaratilmoqda...';
  });
});
