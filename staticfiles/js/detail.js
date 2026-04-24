/* detail.js — Topildi.uz v2.1 */

document.addEventListener('DOMContentLoaded', function() {
  /* ------------------------------------------------
     COMMENT TEXTAREA: auto-resize + enable submit
  ------------------------------------------------ */
  const textarea = document.getElementById('commentText');
  const submitBtn = document.getElementById('commentSubmit');

  if (textarea && submitBtn) {
    textarea.addEventListener('input', function() {
      // auto-resize
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 150) + 'px';
      // enable/disable submit
      submitBtn.disabled = this.value.trim().length === 0;
    });
  }

  /* ------------------------------------------------
     ADD COMMENT WITH AJAX (optional enhancement)
  ------------------------------------------------ */
  // const commentForm = document.getElementById('commentForm');
  // if (commentForm) {
  //   commentForm.addEventListener('submit', function(e) {
  //     e.preventDefault();
      
  //     const formData = new FormData(this);
  //     const submitBtn = this.querySelector('.comment-submit');
  //     const originalText = submitBtn.innerHTML;
      
  //     submitBtn.disabled = true;
  //     submitBtn.innerHTML = 'Yuborilmoqda...';
      
  //     fetch(this.action, {
  //       method: 'POST',
  //       body: formData,
  //       headers: { 'X-Requested-With': 'XMLHttpRequest' }
  //     })
  //     .then(res => res.json())
  //     .then(data => {
  //       if (data.success) {
  //         // Add new comment to list
  //         const commentsList = document.getElementById('commentsList');
  //         const noComments = document.getElementById('noComments');
          
  //         if (noComments) noComments.remove();
          
  //         const newComment = createCommentElement(data.comment);
  //         commentsList.insertAdjacentHTML('afterbegin', newComment);
          
  //         // Update comment count
  //         const commentCount = document.getElementById('commentCount');
  //         if (commentCount) {
  //           const currentCount = parseInt(commentCount.textContent) || 0;
  //           commentCount.textContent = currentCount + 1;
  //         }
          
  //         // Clear textarea
  //         textarea.value = '';
  //         textarea.style.height = 'auto';
  //         submitBtn.disabled = true;
          
  //         showToast('Izoh qo\'shildi!');
  //       } else {
  //         showToast(data.error || 'Xatolik yuz berdi');
  //       }
  //     })
  //     .catch(() => {
  //       showToast('Xatolik yuz berdi. Qaytadan urining.');
  //     })
  //     .finally(() => {
  //       submitBtn.disabled = false;
  //       submitBtn.innerHTML = originalText;
  //     });
  //   });
  // }
  
  function createCommentElement(comment) {
    return `
      <div class="comment-item" id="comment-${comment.id}">
        <div class="comment-avatar-sm">${comment.username.charAt(0).toUpperCase()}</div>
        <div class="comment-body">
          <div class="comment-header">
            <span class="comment-author">${escapeHtml(comment.username)}</span>
            <span class="comment-time">hozir</span>
            ${comment.can_delete ? `
            <form method="POST" action="/comment/${comment.id}/delete/" class="delete-form" data-comment-id="${comment.id}">
              <input type="hidden" name="csrfmiddlewaretoken" value="${getCsrfToken()}">
              <button type="submit" class="delete-btn" title="O'chirish">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14H6L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4h6v2"/>
                </svg>
              </button>
            </form>
            ` : ''}
          </div>
          <p class="comment-text">${escapeHtml(comment.text)}</p>
        </div>
      </div>
    `;
  }

  /* ------------------------------------------------
     REPORT MODAL FUNCTIONS
  ------------------------------------------------ */
const modal = document.getElementById('reportModal');
const reportBtn = document.getElementById('reportBtn');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const reportForm = document.getElementById('reportForm');

// Modalni ochish
if (reportBtn) {
  reportBtn.onclick = function() {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  };
}

// Modalni yopish funksiyasi
function closeModal() {
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

// Yopish tugmalari
if (closeModalBtn) closeModalBtn.onclick = closeModal;
if (cancelModalBtn) cancelModalBtn.onclick = closeModal;

// Background bosilganda yopish
modal.onclick = function(e) {
  if (e.target === modal) closeModal();
};

// Form validation
if (reportForm) {
  reportForm.onsubmit = function(e) {
    const selected = document.querySelector('input[name="reason"]:checked');
    if (!selected) {
      alert('Iltimos, sababni tanlang!');
      e.preventDefault();
      return false;
    }
    return true;
  };
}

// Escape tugmasi
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && modal.style.display === 'flex') {
    closeModal();
  }
});

// Comment delete confirmation
document.querySelectorAll('.delete-form').forEach(form => {
  form.onsubmit = function(e) {
    if (!confirm("Izohni o'chirishni tasdiqlaysizmi?")) {
      e.preventDefault();
    }
  };
});
  /* ------------------------------------------------
     TOAST NOTIFICATION
  ------------------------------------------------ */
  window.showToast = function(msg) {
    const toast = document.getElementById('successToast');
    const toastMsg = document.getElementById('toastMsg');
    if (toast && toastMsg) {
      toastMsg.textContent = msg;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3200);
    }
  };

  /* ------------------------------------------------
     DELETE COMMENT CONFIRMATION
  ------------------------------------------------ */
  document.querySelectorAll('.delete-form').forEach(form => {
    form.addEventListener('submit', function(e) {
      if (!confirm("Izohni o'chirishni tasdiqlaysizmi?")) {
        e.preventDefault();
      } else {
        // Optional: AJAX delete
        e.preventDefault();
        const formData = new FormData(this);
        
        fetch(this.action, {
          method: 'POST',
          body: formData,
          headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            const commentId = this.getAttribute('data-comment-id');
            const commentElement = document.getElementById(`comment-${commentId}`);
            if (commentElement) {
              commentElement.remove();
              showToast('Izoh o\'chirildi');
              
              // Update comment count
              const commentCount = document.getElementById('commentCount');
              if (commentCount) {
                const currentCount = parseInt(commentCount.textContent) || 0;
                commentCount.textContent = Math.max(0, currentCount - 1);
              }
              
              // Show no comments message if empty
              const commentsList = document.getElementById('commentsList');
              if (commentsList && commentsList.children.length === 0) {
                commentsList.innerHTML = `
                  <div class="no-comments" id="noComments">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                    </svg>
                    <p>Hali izoh yo'q. Birinchi bo'lib izoh qoldiring!</p>
                  </div>
                `;
              }
            }
          } else {
            showToast(data.error || 'Xatolik yuz berdi');
          }
        })
        .catch(() => {
          showToast('Xatolik yuz berdi');
        });
      }
    });
  });

  /* Helper functions */
  function getCsrfToken() {
    return document.querySelector('[name=csrfmiddlewaretoken]').value;
  }
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
});