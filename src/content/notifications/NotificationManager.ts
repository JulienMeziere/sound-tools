export type NotificationType = 'success' | 'error' | 'info';

export class NotificationManager {
  private static readonly AUTO_HIDE_DELAY = 3000;
  private readonly pendingTimeouts: Set<number> = new Set();

  show(message: string, type: NotificationType): void {
    const notification = document.createElement('div');
    notification.className = `sound-tools-notification sound-tools-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    const timeoutId = window.setTimeout(() => {
      if (notification.parentNode !== null) {
        notification.remove();
      }
      this.pendingTimeouts.delete(timeoutId);
    }, NotificationManager.AUTO_HIDE_DELAY);

    this.pendingTimeouts.add(timeoutId);
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

  // Cleanup method to clear pending notifications and timeouts
  cleanup(): void {
    // Clear all pending timeouts
    this.pendingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.pendingTimeouts.clear();

    // Remove all existing notifications from DOM
    const notifications = document.querySelectorAll(
      '.sound-tools-notification'
    );
    notifications.forEach((notification) => {
      notification.remove();
    });
  }
}
