/* items.js — E'lonlar sahifasi (Topildi.uz) */
(function () {
  'use strict';

  let currentType = 'lost';

  /* =========================================
     MODAL
  ========================================= */
  function getOverlay() {
    return document.getElementById('modalOverlay');
  }

  window.openModal = function (type) {
    const overlay = getOverlay();
    if (!overlay) return;
    currentType = type === 'found' ? 'found' : 'lost';
    window.setType(currentType);
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function () {
    const overlay = getOverlay();
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  window.closeModalOutside = function (event) {
    const overlay = getOverlay();
    if (overlay && event.target === overlay) window.closeModal();
  };

  window.setType = function (type) {
    currentType = type === 'found' ? 'found' : 'lost';
    const isFound = currentType === 'found';

    const typeInput = document.getElementById('itemType');
    const btnLost = document.getElementById('btnLost');
    const btnFound = document.getElementById('btnFound');
    const locationFields = document.getElementById('locationFields');
    const addressLabel = document.getElementById('addressLabel');
    const locationStatus = document.getElementById('locationStatus');

    if (typeInput) typeInput.value = currentType;
    if (btnLost) btnLost.classList.toggle('active-lost', !isFound);
    if (btnFound) btnFound.classList.toggle('active-found', isFound);

    if (locationFields) {
      locationFields.hidden = !isFound;
      if (!isFound) {
        locationFields.querySelectorAll('input').forEach((input) => {
          if (input.type !== 'hidden') input.value = '';
        });
        const citySelect = locationFields.querySelector('select');
        if (citySelect) citySelect.value = '';
        const latitude = locationFields.querySelector('[name="latitude"]');
        const longitude = locationFields.querySelector('[name="longitude"]');
        if (latitude) latitude.value = '';
        if (longitude) longitude.value = '';
        if (locationStatus) locationStatus.textContent = '';
      }
    }

    if (addressLabel) {
      addressLabel.textContent = isFound
        ? "Ko'cha va uy manzili (ixtiyoriy)"
        : "Ko'cha va uy manzili";
    }
  };

  /* =========================================
     TOAST
  ========================================= */
  function showToast(message, color) {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = message;
    toast.style.borderColor = color || 'var(--green)';
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 3200);
  }

  /* =========================================
     JOYLASHUVNI ANIQLASH (GPS)
  ========================================= */
  function initLocationDetection() {
    const button = document.getElementById('detectLocationBtn');
    if (!button) return;

    button.addEventListener('click', () => {
      const locationStatus = document.getElementById('locationStatus');
      const latitudeInput = document.querySelector('[name="latitude"]');
      const longitudeInput = document.querySelector('[name="longitude"]');
      const citySelect = document.querySelector('#locationFields [name="city"]');
      const districtInput = document.getElementById('districtInput');
      const addressInput = document.getElementById('addressInput');

      if (!navigator.geolocation) {
        if (locationStatus) locationStatus.textContent = 'Brauzeringiz joylashuvni aniqlashni qo‘llamaydi.';
        return;
      }

      button.disabled = true;
      if (locationStatus) locationStatus.textContent = 'Joylashuv aniqlanmoqda...';

      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        if (latitudeInput) latitudeInput.value = latitude;
        if (longitudeInput) longitudeInput.value = longitude;

        try {
          const response = await fetch(`/api/geocode/reverse/?lat=${latitude}&lon=${longitude}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const place = await response.json();

          if (place.city && citySelect) {
            const normalizedCity = place.city.trim().toLocaleLowerCase();
            const matchingOption = Array.from(citySelect.options).find(
              (option) => option.textContent.trim().toLocaleLowerCase() === normalizedCity
            );
            if (matchingOption) citySelect.value = matchingOption.value;
          }

          if (place.district && districtInput) districtInput.value = place.district;
          const streetAddress = [place.road, place.house_number].filter(Boolean).join(', ');
          if (streetAddress && addressInput) addressInput.value = streetAddress;

          const foundPlace = [place.road, place.district, place.city].filter(Boolean).join(', ');
          if (locationStatus) {
            locationStatus.textContent = foundPlace
              ? `Joylashuv aniqlandi: ${foundPlace}`
              : 'GPS koordinatalari olindi va e’lon bilan saqlanadi.';
          }
        } catch (error) {
          if (locationStatus) {
            locationStatus.textContent = 'GPS koordinatalari olindi; manzil nomi topilmadi, koordinata saqlanadi.';
          }
        } finally {
          button.disabled = false;
        }
      }, (error) => {
        const errorMessages = {
          1: 'Joylashuv ruxsatini bering va qayta urinib ko‘ring.',
          2: 'Qurilma joylashuvni aniqlay olmadi.',
          3: 'Joylashuvni aniqlash vaqti tugadi. Qayta urinib ko‘ring.',
        };
        if (locationStatus) locationStatus.textContent = errorMessages[error.code] || 'Joylashuv aniqlanmadi.';
        button.disabled = false;
      }, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 60000,
      });
    });
  }

  /* =========================================
     INIT
  ========================================= */
  document.addEventListener('DOMContentLoaded', () => {
    const openButton = document.getElementById('openModalBtn');
    if (openButton) openButton.addEventListener('click', () => window.openModal('lost'));

    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
      itemForm.addEventListener('submit', (event) => {
        const typeInput = document.getElementById('itemType');
        if (!typeInput || typeInput.value !== 'found') return;

        const citySelect = itemForm.querySelector('[name="city"]');
        const districtInput = document.getElementById('districtInput');
        const addressInput = document.getElementById('addressInput');
        const latitudeInput = itemForm.querySelector('[name="latitude"]');

        const city = citySelect ? citySelect.value : '';
        const district = districtInput ? districtInput.value.trim() : '';
        const address = addressInput ? addressInput.value.trim() : '';
        const hasCoordinates = latitudeInput && latitudeInput.value !== '';

        if (!city && !district && !address && !hasCoordinates) {
          event.preventDefault();
          showToast('Topilgan buyum uchun viloyat, tuman yoki manzil kiriting.', 'var(--accent2)');
        }
      });
    }

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') window.closeModal();
    });

    initLocationDetection();
  });
})();
