/* detail.js — E'lon sahifasi (Topildi.uz) */
document.addEventListener('DOMContentLoaded', function () {

  /* ------------------------------------------------
     XABAR (TOAST)
  ------------------------------------------------ */
  var toastEl = document.getElementById('dtToast');
  var toastTimer = null;

  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }

  /* ------------------------------------------------
     ALOQA MA'LUMOTINI KO'RSATISH
  ------------------------------------------------ */
  var contactToggle = document.getElementById('contactToggle');
  var contactInfo = document.getElementById('contactInfo');

  if (contactToggle && contactInfo) {
    var toggleLabel = contactToggle.querySelector('.dt-toggle-label');
    contactToggle.addEventListener('click', function () {
      contactInfo.hidden = !contactInfo.hidden;
      contactToggle.setAttribute('aria-expanded', String(!contactInfo.hidden));
      if (toggleLabel) toggleLabel.textContent = contactInfo.hidden ? "Bog'lanish" : 'Yashirish';
    });
  }

  /* ------------------------------------------------
     HAVOLANI NUSXALASH
  ------------------------------------------------ */
  var copyBtn = document.getElementById('copyLink');

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      var url = copyBtn.dataset.url || window.location.href;

      function done() { toast('Havola nusxalandi'); }

      function fallback() {
        var field = document.createElement('textarea');
        field.value = url;
        field.setAttribute('readonly', '');
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        try {
          document.execCommand('copy');
          done();
        } catch (err) {
          toast("Nusxalab bo'lmadi");
        }
        document.body.removeChild(field);
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(done, fallback);
      } else {
        fallback();
      }
    });
  }

  /* ------------------------------------------------
     IZOH MAYDONI: auto-resize, bo'sh bo'lsa tugma o'chiq
  ------------------------------------------------ */
  var commentForm = document.getElementById('commentForm');
  var textarea = document.getElementById('commentText');
  var submitBtn = document.getElementById('commentSubmit');

  function syncComment() {
    if (!textarea) return;
    if (submitBtn) submitBtn.disabled = !textarea.value.trim();
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }

  if (textarea) {
    textarea.addEventListener('input', syncComment);
    textarea.addEventListener('keydown', function (event) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && submitBtn && !submitBtn.disabled) {
        event.preventDefault();
        if (commentForm.requestSubmit) commentForm.requestSubmit();
        else commentForm.submit();
      }
    });
    syncComment();
    /* orqaga qaytilganda (bfcache) holat to'g'ri bo'lsin */
    window.addEventListener('pageshow', syncComment);
  }

  if (commentForm && submitBtn) {
    commentForm.addEventListener('submit', function () {
      submitBtn.disabled = true;
    });
  }

  /* ------------------------------------------------
     IZOHNI O'CHIRISH: ikki bosqichli tasdiq
     (birinchi bosish "O'chirilsinmi?" ko'rsatadi, ikkinchisi o'chiradi)
  ------------------------------------------------ */
  document.querySelectorAll('.delete-form').forEach(function (form) {
    var btn = form.querySelector('.dt-del-btn');
    var timer = null;

    function reset() {
      form.dataset.armed = '';
      if (btn) {
        btn.classList.remove('is-armed');
        btn.setAttribute('aria-label', "Izohni o'chirish");
      }
    }

    form.addEventListener('submit', function (event) {
      if (form.dataset.armed === '1') return;
      event.preventDefault();
      form.dataset.armed = '1';
      if (btn) {
        btn.classList.add('is-armed');
        btn.setAttribute('aria-label', "O'chirishni tasdiqlash");
      }
      clearTimeout(timer);
      timer = setTimeout(reset, 4000);
    });
  });

  /* ------------------------------------------------
     SHIKOYAT OYNASI
  ------------------------------------------------ */
  var modal = document.getElementById('reportModal');
  var reportBtn = document.getElementById('reportBtn');
  var closeModalBtn = document.getElementById('closeModalBtn');
  var cancelModalBtn = document.getElementById('cancelModalBtn');
  var reportForm = document.getElementById('reportForm');
  var reportText = document.getElementById('reportText');
  var reportCount = document.getElementById('reportCount');
  var reportError = document.getElementById('reportError');
  var lastFocus = null;

  function openModal() {
    if (!modal) return;
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var first = modal.querySelector('input[type="radio"]');
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (reportError) reportError.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (modal && reportBtn) {
    reportBtn.addEventListener('click', openModal);
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (cancelModalBtn) cancelModalBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    /* Tab tugmasi oyna ichida aylanib turadi */
    modal.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var items = Array.prototype.filter.call(
        modal.querySelectorAll('button, input, textarea, a[href]'),
        function (el) { return !el.disabled && el.offsetParent !== null; }
      );
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  if (reportText && reportCount) {
    var max = reportText.getAttribute('maxlength') || '500';
    var updateCount = function () {
      reportCount.textContent = reportText.value.length + ' / ' + max;
    };
    reportText.addEventListener('input', updateCount);
    updateCount();
  }

  if (reportForm) {
    reportForm.addEventListener('submit', function (event) {
      var selected = reportForm.querySelector('input[name="reason"]:checked');
      if (!selected) {
        event.preventDefault();
        if (reportError) reportError.hidden = false;
        return;
      }
      var submitButton = reportForm.querySelector('.btn-submit-report');
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Yuborilmoqda...';
      }
    });

    reportForm.addEventListener('change', function () {
      if (reportError) reportError.hidden = true;
    });
  }

  /* ------------------------------------------------
     MINI XARITA (#dtMap)
  ------------------------------------------------ */
  var mapEl = document.getElementById('dtMap');

  if (mapEl && typeof L !== 'undefined') {
    var lat = parseFloat(mapEl.dataset.lat);
    var lng = parseFloat(mapEl.dataset.lng);

    if (!isNaN(lat) && !isNaN(lng)) {
      /* location_accuracy: street / district / city */
      var LEVELS = {
        street:   { zoom: 15, radius: 0,    note: '' },
        district: { zoom: 12, radius: 2500, note: "Aniq manzil ko'rsatilmagan, e'lon tuman bo'yicha belgilangan." },
        city:     { zoom: 10, radius: 9000, note: "Aniq manzil ko'rsatilmagan, e'lon shahar yoki viloyat bo'yicha belgilangan." }
      };
      var level = LEVELS[mapEl.dataset.accuracy] || LEVELS.street;
      var type = mapEl.dataset.type === 'found' ? 'found' : 'lost';
      var color = type === 'found' ? '#52b788' : '#c9a84c';

      var map = L.map(mapEl, {
        center: [lat, lng],
        zoom: level.zoom,
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile,
        tap: false
      });

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 16,
        attribution: 'Tiles &copy; Esri'
      }).addTo(map);

      L.marker([lat, lng], {
        keyboard: false,
        icon: L.divIcon({ className: 'dt-pin ' + type, iconSize: [16, 16], iconAnchor: [8, 8] })
      }).addTo(map);

      if (level.radius) {
        L.circle([lat, lng], {
          radius: level.radius,
          color: color,
          weight: 1,
          opacity: 0.7,
          fillColor: color,
          fillOpacity: 0.1
        }).addTo(map);
      }

      var note = document.getElementById('dtMapNote');
      if (note && level.note) {
        note.textContent = level.note;
        note.hidden = false;
      }
    }
  }
});