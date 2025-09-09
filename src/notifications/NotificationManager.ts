export type NotificationType = 'success' | 'error' | 'info';

export class NotificationManager {
  private static readonly AUTO_HIDE_DELAY = 3000;

  show(message: string, type: NotificationType): void {
    const notification = document.createElement('div');
    notification.className = `sound-tools-notification sound-tools-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode !== null) {
        notification.remove();
      }
    }, NotificationManager.AUTO_HIDE_DELAY);
  }

  showSuccess(message: string): void {
    this.show(message, 'success');
  }

  showError(message: string): void {
    this.show(message, 'error');
  }

  showInfo(message: string): void {
    this.show(message, 'info');
  }
}
