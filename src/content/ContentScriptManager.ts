import { AudioProcessor } from '../audio/AudioProcessor'
import { Logger } from '../logger'
import { MidiController, MidiControllerEvents } from '../midi/MidiController'
import { NotificationManager } from '../notifications/NotificationManager'

export class ContentScriptManager implements MidiControllerEvents {
  private readonly audioProcessor: AudioProcessor
  private readonly midiController: MidiController
  private readonly notificationManager: NotificationManager

  constructor() {
    Logger.info('Content script loaded')

    this.audioProcessor = new AudioProcessor()
    this.midiController = new MidiController(this)
    this.notificationManager = new NotificationManager()

    this.init()
  }

  private init(): void {
    this.setupMessageListener()
    this.setupDynamicContentObserver()
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
      switch (request.action) {
        case 'getMidiStatus': {
          const status = this.midiController.getConnectionStatus()
          sendResponse(status)
          break
        }

        case 'getEffectStatus':
          sendResponse({
            enabledEffects: Array.from(this.audioProcessor.getEnabledEffects()),
          })
          break

        case 'connectMidi':
          void this.connectMidi()
          sendResponse({ success: true })
          break

        case 'enableEffect':
          this.enableEffect(request.effect)
          sendResponse({ success: true })
          break

        case 'disableEffect':
          this.disableEffect(request.effect)
          sendResponse({ success: true })
          break

        case 'applyEffect':
          this.enableEffect(request.effect)
          sendResponse({ success: true })
          break
      }
      return true
    })
  }

  private setupDynamicContentObserver(): void {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element
            const mediaElements = element.querySelectorAll('video, audio')
            if (mediaElements.length > 0) {
              this.audioProcessor.handleNewMediaElements()
            }
          }
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  private async connectMidi(): Promise<void> {
    try {
      await this.midiController.connect()
      this.notificationManager.showSuccess('MIDI Controller Connected!')
    } catch (error) {
      this.notificationManager.showError(
        `Failed to connect MIDI controller: ${String(error)}`
      )
    }
  }

  private enableEffect(effectName: string): void {
    Logger.info(`Enabling effect: ${effectName}`)
    this.audioProcessor.enableEffect(effectName)
    this.notificationManager.showSuccess(
      `${effectName.charAt(0).toUpperCase() + effectName.slice(1)} enabled`
    )
  }

  private disableEffect(effectName: string): void {
    Logger.info(`Disabling effect: ${effectName}`)
    this.audioProcessor.disableEffect(effectName)
    this.notificationManager.showInfo(
      `${effectName.charAt(0).toUpperCase() + effectName.slice(1)} disabled`
    )
  }

  // MidiControllerEvents implementation
  onEffectToggle(effectName: string): void {
    const enabledEffects = this.audioProcessor.getEnabledEffects()
    if (enabledEffects.has(effectName)) {
      this.disableEffect(effectName)
    } else {
      this.enableEffect(effectName)
    }
  }

  onConnectionChange(isConnected: boolean, devices: string[]): void {
    Logger.info(`MIDI connection changed: ${isConnected}`, devices)
  }
}
