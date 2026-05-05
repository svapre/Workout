export function showModal(container, { title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel }) {
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay';
  modalOverlay.innerHTML = `
    <div class="modal-content panel stack">
      <h2 class="panel__title" style="margin-bottom: 12px;">${title}</h2>
      <p style="color: var(--soft); margin-bottom: 24px; line-height: 1.5;">${message}</p>
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="button button--ghost" data-action="modal-cancel" type="button">${cancelText}</button>
        <button class="button button--danger" data-action="modal-confirm" type="button">${confirmText}</button>
      </div>
    </div>
  `;

  const close = () => {
    modalOverlay.classList.add('modal-overlay--closing');
    setTimeout(() => modalOverlay.remove(), 200);
  };

  modalOverlay.querySelector('[data-action="modal-cancel"]').addEventListener('click', () => {
    if (onCancel) onCancel();
    close();
  });

  modalOverlay.querySelector('[data-action="modal-confirm"]').addEventListener('click', () => {
    if (onConfirm) onConfirm();
    close();
  });

  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      if (onCancel) onCancel();
      close();
    }
  });

  container.appendChild(modalOverlay);
}
