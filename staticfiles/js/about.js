
    // Scroll reveal
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

    reveals.forEach(el => observer.observe(el));
    // Counter animation
    function animateCount(el, target, suffix = '') {
      let current = 0;
      const step = target / 60;
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = Math.floor(current).toLocaleString() + suffix;
      }, 20);
    }
    const statObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const nums = entry.target.querySelectorAll('.impact-stat-num');
          const values = [2100, 340, 14];
          const suffixes = ['', '', ''];
          nums.forEach((n, i) => {
            if (i < values.length) animateCount(n, values[i], suffixes[i]);
          });
          statObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    const impactStats = document.querySelector('.impact-stats');
    if (impactStats) statObserver.observe(impactStats);
