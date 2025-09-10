import { AudioProcessor } from '../audio/AudioProcessor';
import { Logger } from '../logger';
import { NotificationManager } from '../notifications/NotificationManager';

export class ContentScriptManager {
  private readonly audioProcessor: AudioProcessor;
  private readonly notificationManager: NotificationManager;

  constructor() {
    Logger.info('Content script loaded');

    this.audioProcessor = new AudioProcessor();
    this.notificationManager = new NotificationManager();

    this.init();
  }

  private init(): void {
    this.setupMessageListener();
    this.setupDynamicContentObserver();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      switch (request.action) {
        case 'getEffectStatus':
          sendResponse({
            enabledEffects: Array.from(this.audioProcessor.getEnabledEffects()),
          });
          break;

        case 'enableEffect':
          this.enableEffect(request.effect);
          sendResponse({ success: true });
          break;

        case 'disableEffect':
          this.disableEffect(request.effect);
          sendResponse({ success: true });
          break;

        case 'updateEffectParameter':
          this.audioProcessor.updateEffectParameter(
            request.effect,
            request.parameter,
            request.value
          );
          sendResponse({ success: true });
          break;
      }
      return true;
    });
  }

  private setupDynamicContentObserver(): void {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            const mediaElements = element.querySelectorAll('video, audio');
            if (mediaElements.length > 0) {
              this.audioProcessor.handleNewMediaElements();
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private enableEffect(effectName: string): void {
    Logger.info(`Enabling effect: ${effectName}`);
    this.audioProcessor.enableEffect(effectName);
    this.notificationManager.showSuccess(
      `${effectName.charAt(0).toUpperCase() + effectName.slice(1)} enabled`
    );
  }

  private disableEffect(effectName: string): void {
    Logger.info(`Disabling effect: ${effectName}`);
    this.audioProcessor.disableEffect(effectName);
    this.notificationManager.showInfo(
      `${effectName.charAt(0).toUpperCase() + effectName.slice(1)} disabled`
    );
  }
}
