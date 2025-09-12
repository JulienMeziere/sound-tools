import { Logger } from '../logger';
import { BaseParameterStore } from './BaseParameterStore';

/**
 * Popup parameter store that manages UI state and sends parameter updates
 * to the content script via Chrome messaging
 */
export class PopupParameterStore extends BaseParameterStore {
  private readonly uiUpdateListeners: Set<() => void> = new Set();

  constructor() {
    super();
    this.setupMessageListener();
  }

  // Initialize the store with default values and load from storage
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Set default values
    this.loadDefaultValues();

    // Load saved values from Chrome storage
    await this.loadFromStorage();

    // Sync with content script
    await this.syncWithContentScript();

    this.isInitialized = true;
    Logger.info('PopupParameterStore initialized');
  }

  // Set parameter value and send to content script
  public async setParameter(
    effectName: string,
    parameterName: string,
    value: number
  ): Promise<boolean> {
    if (!this.isValidParameter(effectName, parameterName, value)) {
      Logger.warn(
        `Invalid parameter value: ${effectName}.${parameterName} = ${value}`
      );
      return false;
    }

    const effectParams = this.parameters.get(effectName);
    if (!effectParams) {
      Logger.warn(`Effect '${effectName}' not found in parameter store`);
      return false;
    }

    // Update local state
    effectParams.set(parameterName, value);

    // Send to content script
    const success = await this.sendParameterToContentScript(
      effectName,
      parameterName,
      value
    );

    if (success) {
      // Notify UI listeners immediately for responsive UI
      this.notifyUIListeners();

      // Save to storage (async, don't wait)
      void this.saveToStorage();
    } else {
      // Revert local state if content script update failed
      const storedValue = this.getParameter(effectName, parameterName);
      effectParams.set(parameterName, storedValue);
    }

    return success;
  }

  // Send parameter update to content script
  private async sendParameterToContentScript(
    effectName: string,
    parameterName: string,
    value: number
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        Logger.warn('Chrome tabs API not available');
        resolve(false);
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const [activeTab] = tabs;
        if (!activeTab?.id) {
          Logger.warn('No active tab found');
          resolve(false);
          return;
        }

        chrome.tabs.sendMessage(
          activeTab.id,
          {
            action: 'setParameter',
            effectName,
            parameterName,
            value,
          },
          (response) => {
            if (chrome.runtime.lastError) {
              Logger.warn(
                'Error sending parameter to content script:',
                chrome.runtime.lastError.message
              );
              resolve(false);
              return;
            }

            resolve(response?.success === true);
          }
        );
      });
    });
  }

  // Sync parameters with content script on initialization
  private async syncWithContentScript(): Promise<void> {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.tabs) {
        resolve();
        return;
      }

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const [activeTab] = tabs;
        if (!activeTab?.id) {
          resolve();
          return;
        }

        chrome.tabs.sendMessage(
          activeTab.id,
          { action: 'getAllParameters' },
          (response) => {
            if (chrome.runtime.lastError) {
              Logger.warn(
                'Error syncing with content script:',
                chrome.runtime.lastError.message
              );
              resolve();
              return;
            }

            if (response?.parameters) {
              // Update local state with content script values
              Object.entries(response.parameters).forEach(
                ([effectName, effectParams]) => {
                  if (
                    this.parameters.has(effectName) &&
                    typeof effectParams === 'object'
                  ) {
                    const localParams = this.parameters.get(effectName);
                    if (!localParams) return;
                    Object.entries(
                      effectParams as Record<string, number>
                    ).forEach(([paramName, value]) => {
                      if (
                        typeof value === 'number' &&
                        this.isValidParameter(effectName, paramName, value)
                      ) {
                        localParams.set(paramName, value);
                      }
                    });
                  }
                }
              );

              // Notify UI to update with synced values
              this.notifyUIListeners();
            }

            resolve();
          }
        );
      });
    });
  }

  // Add listener for UI updates (used by React components)
  public addUIUpdateListener(listener: () => void): void {
    this.uiUpdateListeners.add(listener);
  }

  // Remove UI update listener
  public removeUIUpdateListener(listener: () => void): void {
    this.uiUpdateListeners.delete(listener);
  }

  // Notify all UI update listeners
  private notifyUIListeners(): void {
    this.uiUpdateListeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        Logger.error('Error in UI update listener:', error);
      }
    });
  }

  // Set up message listener for parameter updates from content script
  private setupMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.onMessage.addListener(
        (
          message: { type?: string; data?: unknown },
          sender: chrome.runtime.MessageSender
        ) => {
          // Only process messages from content scripts
          if (sender.tab && message.type === 'parameterUpdate') {
            const update = message.data as {
              effectName?: string;
              parameterName?: string;
              value?: number;
            };

            if (
              typeof update.effectName === 'string' &&
              typeof update.parameterName === 'string' &&
              typeof update.value === 'number'
            ) {
              // Update local parameter store
              const effectParams = this.parameters.get(update.effectName);
              if (
                effectParams &&
                this.isValidParameter(
                  update.effectName,
                  update.parameterName,
                  update.value
                )
              ) {
                effectParams.set(update.parameterName, update.value);

                // Save to storage and notify UI
                void this.saveToStorage();
                this.notifyUIListeners();
              }
            }
          }
          return false; // Don't keep the message channel open
        }
      );
    }
  }

  // Cleanup method
  public cleanup(): void {
    this.uiUpdateListeners.clear();
  }
}

// Export singleton instance for use in popup
export const popupParameterStore = new PopupParameterStore();
