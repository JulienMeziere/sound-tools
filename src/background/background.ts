import { Logger } from '../logger'

chrome.runtime.onInstalled.addListener(() => {
  Logger.info('Sound Tools extension installed')
})

chrome.action.onClicked.addListener(tab => {
  if (typeof tab.id === 'number') {
    void chrome.tabs.sendMessage(tab.id, { action: 'toggle' })
  }
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url !== undefined) {
    void chrome.tabs.sendMessage(tabId, { action: 'pageLoaded' }).catch(() => {
      // Ignore errors for pages that don't have content script
    })
  }
})
