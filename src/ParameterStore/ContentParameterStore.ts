import { Logger } from '../logger';
import {
  BaseParameterStore,
  type ParameterChangeEvent,
} from './BaseParameterStore';

/**
 * Content script parameter store that manages parameters locally
 * and listens for parameter updates from the popup via Chrome messaging
 */
export class ContentParameterStore extends BaseParameterStore {
  private readonly parameterChangeListeners: Set<
    (event: ParameterChangeEvent) => void
  > = new Set();

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

    this.isInitialized = true;
    Logger.info('ContentParameterStore initialized');
  }

  // Set parameter value (called internally when receiving messages from popup)
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

    const previousValue = effectParams.get(parameterName) ?? 0;
    effectParams.set(parameterName, value);

    // Notify local listeners (AudioProcessor)
    const event: ParameterChangeEvent = {
      effectName,
      parameterName,
      value,
      previousValue,
    };
    this.notifyListeners(event);

    // Save to storage (async, don't wait)
    await this.saveToStorage();

    return true;
  }

  // Set up message listener for parameter updates from popup
  private setupMessageListener(): void {
    if (
      typeof chrome !== 'undefined' &&
      chrome.runtime &&
      chrome.runtime.onMessage
    ) {
      chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
        if (request.action === 'setParameter') {
          void this.setParameter(
            request.effectName,
            request.parameterName,
            request.value
          ).then((success) => {
            sendResponse({ success });
          });
          return true; // Indicates async response
        }

        if (request.action === 'getParameter') {
          const value = this.getParameter(
            request.effectName,
            request.parameterName
          );
          sendResponse({ value });
          return true;
        }

        if (request.action === 'getAllParameters') {
          const parameters = this.getAllParametersAsObject();
          sendResponse({ parameters });
          return true;
        }

        return false;
      });
    }
  }

  // Add listener for parameter changes (used by AudioProcessor)
  public addParameterChangeListener(
    listener: (event: ParameterChangeEvent) => void
  ): void {
    this.parameterChangeListeners.add(listener);
  }

  // Remove parameter change listener
  public removeParameterChangeListener(
    listener: (event: ParameterChangeEvent) => void
  ): void {
    this.parameterChangeListeners.delete(listener);
  }

  // Notify all parameter change listeners
  private notifyListeners(event: ParameterChangeEvent): void {
    this.parameterChangeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        Logger.error('Error in parameter change listener:', error);
      }
    });
  }

  // Cleanup method
  public cleanup(): void {
    this.parameterChangeListeners.clear();
  }
}

// Export singleton instance for use in content script
export const contentParameterStore = new ContentParameterStore();
