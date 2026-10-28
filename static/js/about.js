/* about.js — Topildi.uz "Biz haqimizda" sahifasi
   Xarita (Leaflet), scroll reveal, sanagichlar. */
document.addEventListener('DOMContentLoaded', function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ------------------------------------------------
     SCROLL REVEAL (.ab-reveal -> .is-in)
  ------------------------------------------------ */
  var reveals = document.querySelectorAll('.ab-reveal');
  if (hasIO && !reduceMotion) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        revealObs.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });
    reveals.forEach(function (el) { revealObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ------------------------------------------------
     SANAGICHLAR ([data-count], ixtiyoriy data-suffix)
  ------------------------------------------------ */
  function parseTarget(raw) {
    var value = parseFloat(String(raw).replace(',', '.').replace(/[^\d.]/g, ''));
    return isNaN(value) ? 0 : value;
  }

  function format(n, isFloat) {
    return isFloat
      ? n.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : Math.round(n).toLocaleString('ru-RU');
  }

  function animateCount(el) {
    var target = parseTarget(el.dataset.count);
    var suffix = target > 0 ? (el.dataset.suffix || '') : '';
    var isFloat = String(el.dataset.count).replace(',', '.').indexOf('.') !== -1;

    if (reduceMotion || target === 0) {
      el.textContent = format(target, isFloat) + suffix;
      return;
    }

    var duration = 1400;
    var start = performance.now();
    function tick(now) {
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = format(target * eased, isFloat) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  var counters = document.querySelectorAll('[data-count]');
  if (hasIO) {
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        countObs.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { countObs.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* ------------------------------------------------
     JONLI XARITA (#ab-map, data-api)
  ------------------------------------------------ */
  var mapEl = document.getElementById('ab-map');
  if (!mapEl || typeof L === 'undefined') return;

  var isMobile = window.innerWidth < 720;
  var map = L.map(mapEl, {
    center: [41.3, 64.6],
    zoom: isMobile ? 5 : 6,
    zoomControl: false,
    attributionControl: true,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    tap: false
  });

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 16,
    attribution: 'Tiles &copy; Esri'
  }).addTo(map);

  map.whenReady(function () { mapEl.classList.add('is-ready'); });

  var api = mapEl.dataset.api;
  var countEl = document.getElementById('ab-map-count');
  if (!api) return;

  /* API javobi massiv yoki {items|results|data: [...]} bo'lishi mumkin */
  function toList(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
      return data.items || data.results || data.data || [];
    }
    return [];
  }

  function pinType(item) {
    if (item.status === 'success') return 'returned';
    return item.item_type === 'found' ? 'found' : 'lost';
  }

  fetch(api, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (data) {
      var placed = 0;
      toList(data).slice(0, 400).forEach(function (item, i) {
        var lat = parseFloat(item.latitude != null ? item.latitude : item.lat);
        var lng = parseFloat(item.longitude != null ? item.longitude : (item.lng != null ? item.lng : item.lon));
        if (isNaN(lat) || isNaN(lng)) return;

        var marker = L.marker([lat, lng], {
          interactive: false,
          keyboard: false,
          icon: L.divIcon({
            className: 'ab-pin ' + pinType(item),
            iconSize: [10, 10],
            iconAnchor: [5, 5]
          })
        }).addTo(map);

        if (marker._icon) marker._icon.style.setProperty('--d', (i % 12) * 0.25 + 's');
        placed++;
      });

      if (countEl) countEl.textContent = placed.toLocaleString('ru-RU');
    })
    .catch(function (err) {
      /* xarita bezak bo'lib qoladi, sahifa ishlashda davom etadi */
      if (window.console) console.warn('Xarita e\'lonlarini yuklab bo\'lmadi:', err);
    });
});