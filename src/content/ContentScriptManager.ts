import { AudioProcessor } from '../audio/AudioProcessor';
import { Logger } from '../logger';
import {
  MidiController,
  type MidiControllerEvents,
  type MidiDevice,
} from '../midi/MidiController';
import { NotificationManager } from '../notifications/NotificationManager';

export class ContentScriptManager implements MidiControllerEvents {
  private readonly audioProcessor: AudioProcessor;
  private midiController: MidiController | null = null;
  private readonly notificationManager: NotificationManager;

  constructor() {
    Logger.info('Content script loaded');

    this.audioProcessor = new AudioProcessor();
    this.notificationManager = new NotificationManager();
    // Note: MIDI controller is NOT initialized here - only when user requests it

    this.init();
  }

  private init(): void {
    this.setupMessageListener();
    this.setupDynamicContentObserver();
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      switch (request.action) {
        case 'getMidiStatus': {
          if (!this.midiController) {
            sendResponse({
              hasPermission: false,
              availableDevices: [],
              isConnected: false,
              deviceName: null,
            });
          } else {
            const status = this.midiController.getConnectionStatus();
            sendResponse(status);
          }
          break;
        }

        case 'requestMidiPermission':
          void this.initializeMidiAndRequestPermission();
          sendResponse({ success: true });
          break;

        case 'connectToMidiDevice':
          if (this.midiController) {
            this.connectToMidiDevice(request.deviceId);
          }
          sendResponse({ success: true });
          break;

        case 'disconnectMidi':
          if (this.midiController) {
            this.disconnectMidi();
          }
          sendResponse({ success: true });
          break;

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
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
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

  private async initializeMidiAndRequestPermission(): Promise<void> {
    try {
      Logger.info('Initializing MIDI controller in content script...');

      // Initialize MIDI controller lazily - only when user requests it
      if (!this.midiController) {
        this.midiController = new MidiController(this);
      }

      // Request permission and check the result
      const permissionGranted =
        await this.midiController.requestMidiPermission();

      if (permissionGranted) {
        this.notificationManager.showSuccess('MIDI Permission Granted!');
      } else {
        this.notificationManager.showError('MIDI Permission Denied');
      }
    } catch (error) {
      this.notificationManager.showError(
        `Failed to get MIDI permission: ${String(error)}`
      );
    }
  }

  private connectToMidiDevice(deviceId: string): void {
    try {
      if (!this.midiController) {
        throw new Error('MIDI controller not initialized');
      }
      this.midiController.connectToDevice(deviceId);
      this.notificationManager.showSuccess('MIDI Device Connected!');
    } catch (error) {
      this.notificationManager.showError(
        `Failed to connect MIDI device: ${String(error)}`
      );
    }
  }

  private disconnectMidi(): void {
    if (this.midiController) {
      this.midiController.disconnect();
      this.notificationManager.showInfo('MIDI Device Disconnected');
    }
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

  // MidiControllerEvents implementation
  onEffectToggle(effectName: string): void {
    const enabledEffects = this.audioProcessor.getEnabledEffects();
    if (enabledEffects.has(effectName)) {
      this.disableEffect(effectName);
    } else {
      this.enableEffect(effectName);
    }
  }

  onConnectionChange(isConnected: boolean, deviceName: string): void {
    Logger.info(
      `MIDI connection changed: ${isConnected}, device: ${deviceName}`
    );
  }

  onPermissionChange(granted: boolean): void {
    Logger.info(`MIDI permission changed: ${granted}`);
  }

  onDevicesScanned(devices: MidiDevice[]): void {
    Logger.info('MIDI devices scanned:', devices);
  }
}
