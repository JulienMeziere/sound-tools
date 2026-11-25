export type NotificationType = 'success' | 'error' | 'info';

const AUTO_HIDE_MS = 3000;

/** Shows a small toast at the top of the page. */
export const notify = (message: string, type: NotificationType): void => {
  const toast = document.createElement('div');
  toast.className = `sound-tools-notification sound-tools-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), AUTO_HIDE_MS);
};
