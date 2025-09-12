import { Logger } from '../logger';
import {
  MidiController,
  type MidiControllerEvents,
  type MidiDevice,
} from '../midi/MidiController';
import { NotificationManager } from './notifications/NotificationManager';
import { MidiActivity, MidiMapping } from '../midi/MidiController';
import { AudioProcessor } from './audio/AudioProcessor';
import { MidiStorageManager } from '../storage/MidiStorageManager';

export class ContentScriptManager implements MidiControllerEvents {
  private readonly audioProcessor: AudioProcessor;
  private midiController: MidiController | null = null;
  private readonly notificationManager: NotificationManager;
  private mutationObserver: MutationObserver | null = null;
  private autoRestoreAttempted = false;
  private autoRestoreOnUserGesture = false;

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
    this.setupUserGestureListener();

    // Attempt to auto-restore MIDI state on page load
    // Wait for page to be ready before attempting restore
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        void this.attemptAutoRestore();
      });
    } else {
      // Page is already loaded
      void this.attemptAutoRestore();
    }
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
              lastActivity: null,
              isLearning: false,
              isLinked: false,
              hasRecentActivity: false,
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
            void this.connectToMidiDevice(request.deviceId);
          }
          sendResponse({ success: true });
          break;

        case 'disconnectMidi':
          if (this.midiController) {
            this.disconnectMidi();
          }
          sendResponse({ success: true });
          break;

        case 'setMidiLearning':
          if (this.midiController) {
            this.midiController.setLearning(request.enabled);
            // Send real-time update to popup
            this.broadcastMidiStatusUpdate();
          }
          sendResponse({ success: true });
          break;

        case 'requestMidiLink':
          if (this.midiController) {
            this.midiController.requestMidiLink(request.targetId);
            // Send real-time update to popup after requesting link
            this.broadcastMidiStatusUpdate();
            // Also broadcast mappings update
            this.broadcastMidiMappingsUpdate();
          }
          sendResponse({ success: true });
          break;

        case 'removeSpecificMidiLink':
          if (this.midiController) {
            const { midiType, midiChannel, midiValue } = request;
            const success = this.midiController.removeSpecificMapping(
              midiType,
              midiChannel,
              midiValue
            );
            // Send real-time update to popup after removing link
            this.broadcastMidiStatusUpdate();
            // Also broadcast mappings update
            this.broadcastMidiMappingsUpdate();
            sendResponse({ success });
          } else {
            sendResponse({ success: false });
          }
          break;

        case 'getMidiMappings':
          if (this.midiController) {
            const mappings = this.midiController.getMidiMappings();
            sendResponse({ mappings });
          } else {
            sendResponse({ mappings: [] });
          }
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
      }
      return true;
    });
  }

  private setupDynamicContentObserver(): void {
    this.mutationObserver = new MutationObserver((mutations) => {
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

    this.mutationObserver.observe(document.body, {
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
      const permissionGranted = await this.midiController.requestMidiPermission(
        window.location.href
      );

      if (permissionGranted) {
        this.notificationManager.showSuccess('MIDI Permission Granted!');

        // Auto-restore after manual permission grant
        void this.midiController.autoRestoreAfterPermissionGrant(
          window.location.href
        );
      } else {
        this.notificationManager.showError('MIDI Permission Denied');
      }
    } catch (error) {
      this.notificationManager.showError(
        `Failed to get MIDI permission: ${String(error)}`
      );
    }
  }

  private async connectToMidiDevice(deviceId: string): Promise<void> {
    try {
      if (!this.midiController) {
        throw new Error('MIDI controller not initialized');
      }
      await this.midiController.connectToDevice(deviceId);
      this.notificationManager.showSuccess('MIDI Device Connected!');
    } catch (error) {
      this.notificationManager.showError(
        `Failed to connect MIDI device: ${String(error)}`
      );
    }
  }

  private disconnectMidi(): void {
    if (this.midiController) {
      this.midiController.disconnect(true, false); // Clear last active on explicit disconnect
      this.notificationManager.showInfo('MIDI Device Disconnected');
    }
  }

  private enableEffect(effectName: string): void {
    Logger.info(`Attempting to enable effect: ${effectName}`);
    const stateChanged = this.audioProcessor.enableEffect(effectName);

    if (stateChanged) {
      this.notificationManager.showSuccess(
        `${effectName.charAt(0).toUpperCase() + effectName.slice(1)} enabled`
      );
      // Broadcast effect status change to popup
      this.broadcastEffectStatusUpdate();
    }
  }

  private disableEffect(effectName: string): void {
    Logger.info(`Attempting to disable effect: ${effectName}`);
    const stateChanged = this.audioProcessor.disableEffect(effectName);

    if (stateChanged) {
      this.notificationManager.showInfo(
        `${effectName.charAt(0).toUpperCase() + effectName.slice(1)} disabled`
      );
      // Broadcast effect status change to popup
      this.broadcastEffectStatusUpdate();
    }
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
    // Send real-time update to popup
    this.broadcastMidiStatusUpdate();
  }

  onPermissionChange(granted: boolean): void {
    Logger.info(`MIDI permission changed: ${granted}`);
  }

  onDevicesScanned(devices: MidiDevice[]): void {
    Logger.info('MIDI devices scanned:', devices);
  }

  onMidiActivity(_activity: MidiActivity): void {
    // Activity is already logged in MidiController, no need to log here
    // Send real-time update to popup
    this.broadcastMidiStatusUpdate();
  }

  onMidiMappingTriggered(
    mapping: import('../midi/MidiController').MidiMapping,
    value: number
  ): void {
    Logger.info('MIDI mapping triggered:', mapping, 'value:', value);

    // Execute the mapping
    if (mapping.type === 'effect-toggle') {
      if (mapping.effect) {
        if (value === 1) {
          this.enableEffect(mapping.effect);
        } else {
          this.disableEffect(mapping.effect);
        }
      }
    } else if (mapping.type === 'effect-parameter') {
      if (mapping.effect && mapping.parameter) {
        this.audioProcessor.updateEffectParameter(
          mapping.effect,
          mapping.parameter,
          value
        );
        // Broadcast parameter change to popup
        this.broadcastParameterUpdate(mapping.effect, mapping.parameter, value);
      }
    }
  }

  onMidiMappingCreated(_mapping: MidiMapping): void {
    // Disable learning mode after creating a link
    this.midiController?.setLearning(false);

    // Broadcast status update when a mapping is created (linked state may have changed)
    this.broadcastMidiStatusUpdate();
  }

  private broadcastMidiStatusUpdate(): void {
    if (!this.midiController) return;

    const status = this.midiController.getConnectionStatus();

    // Send update to all extension contexts (popups, etc.)
    chrome.runtime
      .sendMessage({
        type: 'midiStatusUpdate',
        data: status,
      })
      .catch(() => {
        // Ignore errors if no popup is open
      });
  }

  private broadcastMidiMappingsUpdate(): void {
    if (!this.midiController) return;

    const mappings = this.midiController.getMidiMappings();

    // Send update to all extension contexts (popups, etc.)
    chrome.runtime
      .sendMessage({
        type: 'midiMappingsUpdate',
        data: { mappings },
      })
      .catch(() => {
        // Ignore errors if no popup is open
      });
  }

  private broadcastEffectStatusUpdate(): void {
    const enabledEffects = Array.from(this.audioProcessor.getEnabledEffects());

    // Send update to all extension contexts (popups, etc.)
    chrome.runtime
      .sendMessage({
        type: 'effectStatusUpdate',
        data: { enabledEffects },
      })
      .catch(() => {
        // Ignore errors if no popup is open
      });
  }

  private broadcastParameterUpdate(
    effectName: string,
    parameterName: string,
    value: number
  ): void {
    // Send parameter update to all extension contexts (popups, etc.)
    chrome.runtime
      .sendMessage({
        type: 'parameterUpdate',
        data: { effectName, parameterName, value },
      })
      .catch(() => {
        // Ignore errors if no popup is open
      });
  }

  // Cleanup method to properly dispose of resources
  public cleanup(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.midiController) {
      this.midiController.disconnect(false, false); // Don't clear anything on cleanup
      this.midiController = null;
    }

    // Cleanup audio resources
    this.audioProcessor.cleanup();

    // Cleanup notification resources
    this.notificationManager.cleanup();
  }

  // Setup user gesture listener for fallback auto-restore
  private setupUserGestureListener(): void {
    const handleUserGesture = () => {
      if (this.autoRestoreOnUserGesture && !this.autoRestoreAttempted) {
        Logger.info('User gesture detected, attempting auto-restore');
        void this.attemptAutoRestore();

        // Remove listeners after first attempt
        document.removeEventListener('click', handleUserGesture);
        document.removeEventListener('keydown', handleUserGesture);
        document.removeEventListener('touchstart', handleUserGesture);
      }
    };

    document.addEventListener('click', handleUserGesture, { once: true });
    document.addEventListener('keydown', handleUserGesture, { once: true });
    document.addEventListener('touchstart', handleUserGesture, { once: true });
  }

  // Attempt to auto-restore MIDI state on page load
  private async attemptAutoRestore(): Promise<void> {
    if (this.autoRestoreAttempted) {
      return;
    }

    this.autoRestoreAttempted = true;

    try {
      Logger.info(
        'Attempting auto-restore on page load for URL:',
        window.location.href
      );
      Logger.info('Document ready state:', document.readyState);
      Logger.info('Is secure context:', window.isSecureContext);

      // Initialize MIDI controller for restore attempt
      if (!this.midiController) {
        this.midiController = new MidiController(this);
      }

      // Add a small delay to ensure page is fully ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Try to restore MIDI state
      const restored = await this.midiController.restoreMidiState(
        window.location.href
      );

      if (restored) {
        Logger.info('MIDI state auto-restored successfully');
        this.notificationManager.showSuccess('MIDI Controller Restored!');
        this.autoRestoreOnUserGesture = false; // Success, no need for fallback
      } else {
        Logger.info('No MIDI state to restore or restore failed');
        // Check if we should try again on user gesture
        const hasPermission = await MidiStorageManager.getMidiPermission(
          window.location.href
        );
        if (hasPermission === true) {
          Logger.info('Will attempt auto-restore on next user gesture');
          this.autoRestoreOnUserGesture = true;
          this.autoRestoreAttempted = false; // Allow retry on user gesture
        }
      }
    } catch (error) {
      Logger.error('Failed to auto-restore MIDI state:', error);
      // Check if we should try again on user gesture
      try {
        const hasPermission = await MidiStorageManager.getMidiPermission(
          window.location.href
        );
        if (hasPermission === true) {
          Logger.info(
            'Will attempt auto-restore on next user gesture due to error'
          );
          this.autoRestoreOnUserGesture = true;
          this.autoRestoreAttempted = false; // Allow retry on user gesture
        }
      } catch (permissionError) {
        Logger.error(
          'Failed to check permission for fallback:',
          permissionError
        );
      }
    }
  }
}
