/* messages.js — Django xabarlari ekran o'rtasida chiqib, o'zi yo'qoladi */
(function () {
  var DURATION = 4000; // millisekund (4 soniya). 3 soniya uchun 3000, 5 uchun 5000

  function setup(el) {
    if (el.dataset.toastReady) return;
    el.dataset.toastReady = '1';
    el.style.setProperty('--toast-duration', DURATION + 'ms');

    var closed = false;
    function hide() {
      if (closed) return;
      closed = true;
      el.classList.add('is-hiding');
      setTimeout(function () {
        var box = el.parentElement;
        el.remove();
        if (box && !box.children.length) box.remove();
      }, 450);
    }

    setTimeout(hide, DURATION);
    el.addEventListener('click', hide);
  }

  function scan() {
    document.querySelectorAll('.messages > *').forEach(setup);
  }

  scan();
  // Keyin JS orqali qo'shilgan xabarlar uchun ham ishlaydi
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
})();