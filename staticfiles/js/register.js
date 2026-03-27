// Bu yerda Register uchun js qismi

// =========================================
// Arkana Registration Page - JavaScript
// =========================================

const app = {
    // Current step (1, 2, or 3)
    currentStep: 1,
    
    // Text content for different steps
    stepLabels: ['Shaxsiy ma\'lumot', 'Xavfsizlik', 'Sozlamalar'],
    stepTitles: ['Hisob yaratish', 'Xavfsizlik', 'Qiziqishlar'],
    stepSubs: [
        'Boshlash uchun ma\'lumotlaringizni kiriting',
        'Kuchli parol tanlang va profilingizni to\'ldiring',
        'Tajribangizni shaxsiylashtiramiz'
    ],
    
    // Available interests
    interests: [
        '🎨 San\'at', '📚 Kitob', '🎵 Musiqa', '🏃 Sport', '🍳 Oshpazlik',
        '✈️ Sayohat', '💻 Texnologiya', '🎮 O\'yin', '📸 Fotografiya',
        '🌿 Tabiat', '🎭 Teatr', '🧘 Yoga', '🔬 Fan', '🎬 Kino'
    ],

    // =========================================
    // INITIALIZATION
    // =========================================
    init: function() {
        this.buildInterests();
        this.setupPhoneInput();
        this.setupTextarea();
        this.updateUI();
    },

    // Build interests grid
    buildInterests: function() {
        const grid = document.getElementById('interests-grid');
        if (!grid) return;

        this.interests.forEach(interest => {
            const btn = document.createElement('button');
            btn.className = 'interest-chip';
            btn.type = 'button';
            btn.textContent = interest;
            btn.onclick = () => btn.classList.toggle('selected');
            grid.appendChild(btn);
        });
    },

    // Setup phone input formatting
    setupPhoneInput: function() {
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function() {
                let val = this.value.replace(/\D/g, '');
                if (val.startsWith('998')) val = '+' + val;
                this.value = val;
            });
        }
    },

    // Setup textarea styling
    setupTextarea: function() {
        const textarea = document.getElementById('bio');
        if (textarea) {
            textarea.style.width = '100%';
            textarea.style.padding = '12px 14px';
            textarea.style.border = '1.5px solid var(--border)';
            textarea.style.fontFamily = "'DM Sans', sans-serif";
            textarea.style.fontSize = '14px';
            textarea.style.color = 'var(--ink)';
            textarea.style.background = 'var(--white)';
            textarea.style.outline = 'none';
            textarea.style.resize = 'vertical';
            textarea.style.transition = 'border-color .3s';
            textarea.onfocus = () => textarea.style.borderColor = 'var(--gold)';
            textarea.onblur = () => textarea.style.borderColor = 'var(--border)';
        }
    },

    // =========================================
    // STEP NAVIGATION
    // =========================================
    goToStep: function(n) {
        if (n > this.currentStep) return;
        this.currentStep = n;
        this.updateUI();
    },

    updateUI: function() {
        // Update step visibility
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        const el = document.getElementById('step' + this.currentStep);
        if (el) el.classList.add('active');

        // Update step indicators
        [1, 2, 3].forEach(i => {
            const s = document.getElementById('s' + i);
            s.classList.remove('active', 'done');
            if (i < this.currentStep) s.classList.add('done');
            else if (i === this.currentStep) s.classList.add('active');
        });

        // Update text content
        document.getElementById('step-label-text').textContent = this.stepLabels[this.currentStep - 1];
        document.getElementById('form-title').textContent = this.stepTitles[this.currentStep - 1];
        document.getElementById('form-subtitle').textContent = this.stepSubs[this.currentStep - 1];

        // Update background number
        const bgNum = document.querySelector('.bg-number');
        if (bgNum) bgNum.textContent = this.currentStep;
    },

    // =========================================
    // ERROR HANDLING
    // =========================================
    showErr: function(id, msg) {
        const el = document.getElementById(id);
        if (!el) return;
        if (msg) el.textContent = msg;
        el.classList.add('visible');
        
        const field = el.closest('.field');
        if (field) {
            const inp = field.querySelector('input, select');
            if (inp) inp.classList.add('error');
        }
    },

    clearErr: function(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('visible');
        
        const field = el.closest('.field');
        if (field) {
            const inp = field.querySelector('input, select');
            if (inp) inp.classList.remove('error');
        }
    },

    // =========================================
    // STEP VALIDATION & NAVIGATION
    // =========================================
    nextStep: function(step) {
        if (step > 0) {
            let ok = true;

            // Validate Step 1
            if (this.currentStep === 1) {
                const fname = document.getElementById('fname').value.trim();
                const lname = document.getElementById('lname').value.trim();
                const email = document.getElementById('email').value.trim();
                const phone = document.getElementById('phone').value.trim();
                const gender = document.querySelector('input[name="gender"]:checked');

                if (!fname) { this.showErr('fname-err'); ok = false; } else this.clearErr('fname-err');
                if (!lname) { this.showErr('lname-err'); ok = false; } else this.clearErr('lname-err');
                if (!email || !email.includes('@')) { this.showErr('email-err'); ok = false; } else this.clearErr('email-err');
                if (!phone) { this.showErr('phone-err'); ok = false; } else this.clearErr('phone-err');
                if (!gender) { this.showErr('gender-err'); ok = false; } else this.clearErr('gender-err');
            }

            // Validate Step 2
            if (this.currentStep === 2) {
                const pass = document.getElementById('pass').value;
                const pass2 = document.getElementById('pass2').value;
                const dob = document.getElementById('dob').value;

                if (pass.length < 8) { this.showErr('pass-err'); ok = false; } else this.clearErr('pass-err');
                if (pass !== pass2) { this.showErr('pass2-err'); ok = false; } else this.clearErr('pass2-err');
                if (!dob) { this.showErr('dob-err'); ok = false; } else this.clearErr('dob-err');
            }

            if (!ok) return;
            
            if (this.currentStep < 3) { 
                this.currentStep++; 
                this.updateUI(); 
            }
        } else {
            // Go back
            if (this.currentStep > 1) { 
                this.currentStep--; 
                this.updateUI(); 
            }
        }
    },

    // =========================================
    // FORM SUBMISSION
    // =========================================
    submitForm: function() {
        const username = document.getElementById('username').value.trim();
        const terms = document.getElementById('terms').checked;
        const selected = document.querySelectorAll('.interest-chip.selected').length;
        let ok = true;

        if (!username) { this.showErr('username-err'); ok = false; } else this.clearErr('username-err');
        if (selected === 0) { this.showErr('interest-err'); ok = false; } else this.clearErr('interest-err');
        if (!terms) { 
            ok = false; 
            // Highlight terms checkbox
            document.querySelector('.check-field').style.animation = 'shake 0.3s ease';
            setTimeout(() => {
                document.querySelector('.check-field').style.animation = '';
            }, 300);
        }

        if (!ok) return;

        // Show success screen
        document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
        document.getElementById('step-label-text').textContent = 'Bajarildi';
        document.getElementById('form-title').textContent = '';
        document.getElementById('form-subtitle').textContent = '';
        document.querySelector('.step-indicator').style.opacity = '0';
        document.getElementById('signin-link').style.display = 'none';
        document.getElementById('success').classList.add('active');
        
        [1, 2, 3].forEach(i => {
            const step = document.getElementById('s' + i);
            if (step.classList.contains('active')) {
                step.classList.replace('active', 'done');
            } else {
                step.classList.add('done');
            }
        });
    },

    // =========================================
    // RESTART FORM
    // =========================================
    restart: function() {
        this.currentStep = 1;
        document.getElementById('success').classList.remove('active');
        document.querySelector('.step-indicator').style.opacity = '1';
        document.getElementById('signin-link').style.display = '';
        
        // Clear all inputs
        document.querySelectorAll('input[type=text], input[type=email], input[type=password], input[type=tel], input[type=date], textarea').forEach(i => i.value = '');
        document.querySelectorAll('input[type=radio], input[type=checkbox]').forEach(i => i.checked = false);
        document.querySelectorAll('.interest-chip').forEach(c => c.classList.remove('selected'));
        
        this.updateUI();
    },

    // =========================================
    // PASSWORD STRENGTH CHECKER
    // =========================================
    checkStrength: function(val) {
        let score = 0;
        if (val.length >= 8) score++;
        if (/[A-Z]/.test(val)) score++;
        if (/[0-9]/.test(val)) score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        const colors = ['#c0392b', '#e67e22', '#f1c40f', '#27ae60'];
        const labels = ['Juda zaif', 'Zaif', 'O\'rtacha', 'Kuchli 💪'];

        // Update segments
        [1, 2, 3, 4].forEach((_, i) => {
            const s = document.getElementById('seg' + (i + 1));
            if (s) {
                s.style.background = i < score ? colors[score - 1] : 'var(--border)';
            }
        });

        // Update text
        const txt = document.getElementById('strength-text');
        if (txt) {
            txt.textContent = val ? (labels[score - 1] || labels[0]) : 'Parol kuchini tekshirmoqda...';
            txt.style.color = val ? colors[score - 1] : 'var(--muted)';
        }
    },

    // =========================================
    // TOGGLE PASSWORD VISIBILITY
    // =========================================
    togglePass: function(id, icon) {
        const inp = document.getElementById(id);
        if (!inp) return;
        
        if (inp.type === 'password') { 
            inp.type = 'text'; 
            icon.textContent = '🙈'; 
        } else { 
            inp.type = 'password'; 
            icon.textContent = '👁'; 
        }
    },

    // =========================================
    // AVATAR UPLOAD (for future use)
    // =========================================
    loadAvatar: function(input) {
        const file = input.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = e => {
            const img = document.getElementById('avatarImg');
            if (img) {
                img.src = e.target.result;
                img.style.display = 'block';
            }
            const icon = document.getElementById('avatarIcon');
            if (icon) icon.style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
};

// =========================================
// AUTO-INITIALIZE ON PAGE LOAD
// =========================================
document.addEventListener('DOMContentLoaded', function() {
    app.init();
});

// =========================================
// EXPOSE APP TO WINDOW FOR ONCLICK HANDLERS
// =========================================
window.app = app;                    
