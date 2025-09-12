import './content.css';
import { ContentScriptManager } from './ContentScriptManager';

// Initialize the modular content script manager
const contentScriptManager = new ContentScriptManager();

// Cleanup resources when the page is unloaded
window.addEventListener('beforeunload', () => {
  contentScriptManager.cleanup();
});

// Also cleanup when the extension is disabled/reloaded
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onConnect.addListener((port) => {
    port.onDisconnect.addListener(() => {
      contentScriptManager.cleanup();
    });
  });
}
