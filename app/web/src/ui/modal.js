/**
 * Global UI Modals
 * 
 * Provides centralized confirmation and alert dialogs.
 */

export function confirmAction(container, { title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
  // CRITICAL CLEANUP: Remove any existing modal first to prevent duplication
  const existing = document.getElementById('global-modal-overlay');
  if (existing) existing.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'global-modal-overlay';
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
  
  modalOverlay.innerHTML = `
    <div class="modal-content panel stack" style="max-width: 440px; width: 100%; padding: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
      <h2 class="panel__title" style="margin-bottom: 12px; font-size: 1.6rem; color: var(--text);">${title}</h2>
      <p style="color: var(--soft); margin-bottom: 32px; line-height: 1.6; font-size: 1.05rem;">${message}</p>
      <div style="display: flex; gap: 16px; justify-content: flex-end;">
        <button class="button button--ghost" data-action="modal-cancel" type="button" style="padding: 12px 24px;">${cancelText}</button>
        <button class="button button--danger" data-action="modal-confirm" type="button" style="padding: 12px 24px; font-weight: 800;">${confirmText}</button>
      </div>
    </div>
  `;

  const close = () => {
    modalOverlay.classList.add('modal-overlay--closing');
    setTimeout(() => modalOverlay.remove(), 200);
  };

  modalOverlay.querySelector('[data-action="modal-cancel"]').addEventListener('click', close);
  
  modalOverlay.querySelector('[data-action="modal-confirm"]').addEventListener('click', () => {
    if (onConfirm) onConfirm();
    close();
  });

  // Close on overlay click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) close();
  });

  container.appendChild(modalOverlay);
}

export function promptAction(container, { title, message, defaultValue = '', confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) {
  const existing = document.getElementById('global-modal-overlay');
  if (existing) existing.remove();

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'global-modal-overlay';
  modalOverlay.className = 'modal-overlay';
  modalOverlay.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;';
  
  modalOverlay.innerHTML = `
    <div class="modal-content panel stack" style="max-width: 440px; width: 100%; padding: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
      <h2 class="panel__title" style="margin-bottom: 12px; font-size: 1.6rem; color: var(--text);">${title}</h2>
      <p style="color: var(--soft); margin-bottom: 24px; line-height: 1.6; font-size: 1.05rem;">${message}</p>
      <input type="text" id="modal-prompt-input" value="${defaultValue}" style="width: 100%; padding: 16px; background: rgba(0,0,0,0.4); border: 1px solid rgba(143,168,210,0.3); border-radius: 8px; color: #fff; font-size: 1.2rem; margin-bottom: 32px; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--brand)'" onblur="this.style.borderColor='rgba(143,168,210,0.3)'">
      <div style="display: flex; gap: 16px; justify-content: flex-end;">
        <button class="button button--ghost" data-action="modal-cancel" type="button" style="padding: 12px 24px;">${cancelText}</button>
        <button class="button button--primary" data-action="modal-confirm" type="button" style="padding: 12px 24px; font-weight: 800;">${confirmText}</button>
      </div>
    </div>
  `;

  const close = () => {
    modalOverlay.classList.add('modal-overlay--closing');
    setTimeout(() => modalOverlay.remove(), 200);
  };

  const input = modalOverlay.querySelector('#modal-prompt-input');

  modalOverlay.querySelector('[data-action="modal-cancel"]').addEventListener('click', close);
  
  modalOverlay.querySelector('[data-action="modal-confirm"]').addEventListener('click', () => {
    if (onConfirm) onConfirm(input.value);
    close();
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (onConfirm) onConfirm(input.value);
      close();
    }
  });

  container.appendChild(modalOverlay);
  setTimeout(() => input.focus(), 50);
}

// Shorthand for simple confirmation
export function showModal(container, options) {
  confirmAction(container, options);
}
