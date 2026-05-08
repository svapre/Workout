/**
 * Global UI Modals
 *
 * Provides centralized confirmation and alert dialogs.
 */

function createOverlay() {
  const modalOverlay = document.createElement("div");
  modalOverlay.id = "global-modal-overlay";
  modalOverlay.className = "modal-overlay";
  modalOverlay.style.cssText =
    "position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 10000; padding: 20px;";
  return modalOverlay;
}

function removeExistingOverlay() {
  const existing = document.getElementById("global-modal-overlay");
  if (existing) {
    existing.remove();
  }
}

function closeModal(modalOverlay) {
  modalOverlay.classList.add("modal-overlay--closing");
  document.body.style.overflow = "";
  setTimeout(() => modalOverlay.remove(), 200);
}

function attachDismissBehaviors(modalOverlay, container) {
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      closeModal(modalOverlay);
    }
  });

  document.body.style.overflow = "hidden";
  container.appendChild(modalOverlay);
}

export function confirmAction(
  container,
  { title, message, confirmText = "Confirm", cancelText = "Cancel", onConfirm },
) {
  removeExistingOverlay();

  const modalOverlay = createOverlay();
  modalOverlay.innerHTML = `
    <div class="modal-content panel stack" style="max-width: 440px; width: 100%; padding: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
      <h2 class="panel__title" style="margin-bottom: 12px; font-size: 1.6rem; color: var(--text);">${title}</h2>
      <p style="color: var(--soft); margin-bottom: 32px; line-height: 1.6; font-size: 1.05rem;">${message}</p>
      <div class="page-actions__group" style="justify-content: flex-end;">
        <button class="button button--ghost" data-action="modal-cancel" type="button">${cancelText}</button>
        <button class="button button--danger" data-action="modal-confirm" type="button" style="font-weight: 800;">${confirmText}</button>
      </div>
    </div>
  `;

  modalOverlay.querySelector('[data-action="modal-cancel"]').addEventListener("click", () => {
    closeModal(modalOverlay);
  });

  modalOverlay.querySelector('[data-action="modal-confirm"]').addEventListener("click", () => {
    if (onConfirm) {
      onConfirm();
    }
    closeModal(modalOverlay);
  });

  attachDismissBehaviors(modalOverlay, container);
}

/**
 * Save / discard / stay for blueprint or routine drafts.
 */
export function confirmUnsavedChanges(
  container,
  {
    title = "Unsaved changes",
    message,
    saveText = "Save",
    discardText = "Discard",
    stayText = "Stay",
    onSave,
    onDiscard,
  },
) {
  removeExistingOverlay();

  const modalOverlay = createOverlay();
  modalOverlay.innerHTML = `
    <div class="modal-content panel stack" style="max-width: 480px; width: 100%; padding: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
      <h2 class="panel__title" style="margin-bottom: 12px; font-size: 1.6rem; color: var(--text);">${title}</h2>
      <p style="color: var(--soft); margin-bottom: 32px; line-height: 1.6; font-size: 1.05rem;">${message}</p>
      <div class="page-actions__group" style="justify-content: flex-end;">
        <button class="button button--ghost" data-action="modal-stay" type="button">${stayText}</button>
        <button class="button button--ghost button--danger" data-action="modal-discard" type="button" style="font-weight: 700;">${discardText}</button>
        <button class="button button--primary" data-action="modal-save" type="button" style="font-weight: 800;">${saveText}</button>
      </div>
    </div>
  `;

  modalOverlay.querySelector('[data-action="modal-stay"]').addEventListener("click", () => {
    closeModal(modalOverlay);
  });
  modalOverlay.querySelector('[data-action="modal-discard"]').addEventListener("click", () => {
    if (onDiscard) {
      onDiscard();
    }
    closeModal(modalOverlay);
  });
  modalOverlay.querySelector('[data-action="modal-save"]').addEventListener("click", () => {
    if (onSave) {
      onSave();
    }
    closeModal(modalOverlay);
  });

  attachDismissBehaviors(modalOverlay, container);
}

/**
 * Abandon in-progress workout. The user must finish from the player if they want to keep the session.
 */
export function confirmAbandonWorkout(
  container,
  {
    title = "Workout in progress",
    message = "Leaving now will discard this session. You can stay and finish, or abandon progress.",
    abandonText = "Abandon workout",
    stayText = "Stay",
    onAbandon,
  },
) {
  removeExistingOverlay();

  const modalOverlay = createOverlay();
  modalOverlay.innerHTML = `
    <div class="modal-content panel stack" style="max-width: 440px; width: 100%; padding: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
      <h2 class="panel__title" style="margin-bottom: 12px; font-size: 1.6rem; color: var(--text);">${title}</h2>
      <p style="color: var(--soft); margin-bottom: 32px; line-height: 1.6; font-size: 1.05rem;">${message}</p>
      <div class="page-actions__group" style="justify-content: flex-end;">
        <button class="button button--ghost" data-action="modal-stay" type="button">${stayText}</button>
        <button class="button button--danger" data-action="modal-abandon" type="button" style="font-weight: 800;">${abandonText}</button>
      </div>
    </div>
  `;

  modalOverlay.querySelector('[data-action="modal-stay"]').addEventListener("click", () => {
    closeModal(modalOverlay);
  });
  modalOverlay.querySelector('[data-action="modal-abandon"]').addEventListener("click", () => {
    if (onAbandon) {
      onAbandon();
    }
    closeModal(modalOverlay);
  });

  attachDismissBehaviors(modalOverlay, container);
}

export function promptAction(
  container,
  { title, message, defaultValue = "", confirmText = "Confirm", cancelText = "Cancel", onConfirm },
) {
  removeExistingOverlay();

  const modalOverlay = createOverlay();
  modalOverlay.innerHTML = `
    <div class="modal-content panel stack" style="max-width: 440px; width: 100%; padding: 32px; box-shadow: 0 40px 100px rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);">
      <h2 class="panel__title" style="margin-bottom: 12px; font-size: 1.6rem; color: var(--text);">${title}</h2>
      <p style="color: var(--soft); margin-bottom: 24px; line-height: 1.6; font-size: 1.05rem;">${message}</p>
      <input type="text" id="modal-prompt-input" value="${defaultValue}" style="width: 100%; padding: 16px; background: rgba(0,0,0,0.4); border: 1px solid rgba(143,168,210,0.3); border-radius: 8px; color: #fff; font-size: 1.1rem; margin-bottom: 32px; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='var(--brand)'" onblur="this.style.borderColor='rgba(143,168,210,0.3)'">
      <div class="page-actions__group" style="justify-content: flex-end;">
        <button class="button button--ghost" data-action="modal-cancel" type="button">${cancelText}</button>
        <button class="button button--primary" data-action="modal-confirm" type="button" style="font-weight: 800;">${confirmText}</button>
      </div>
    </div>
  `;

  const input = modalOverlay.querySelector("#modal-prompt-input");

  modalOverlay.querySelector('[data-action="modal-cancel"]').addEventListener("click", () => {
    closeModal(modalOverlay);
  });

  modalOverlay.querySelector('[data-action="modal-confirm"]').addEventListener("click", () => {
    if (onConfirm) {
      onConfirm(input.value);
    }
    closeModal(modalOverlay);
  });

  input.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      if (onConfirm) {
        onConfirm(input.value);
      }
      closeModal(modalOverlay);
    }
  });

  attachDismissBehaviors(modalOverlay, container);
  setTimeout(() => input.focus(), 50);
}

export function showModal(container, options) {
  confirmAction(container, options);
}
