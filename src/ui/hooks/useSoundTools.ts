import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

import { Logger } from '../../logger';

interface UseSoundToolsReturn {
  enabledEffects: Set<string>;
  toggleEffect: (effect: string) => void;
  updateEffectParameter: (
    effect: string,
    parameter: string,
    value: number
  ) => void;
}

// Constants moved outside component
const RETRY_DELAY = 1000;
const EFFECT_STATUS_ACTION = 'getEffectStatus';
const ENABLE_EFFECT_ACTION = 'enableEffect';
const DISABLE_EFFECT_ACTION = 'disableEffect';
const UPDATE_EFFECT_PARAMETER_ACTION = 'updateEffectParameter';

// Helper function to send tab messages
const sendTabMessage = (
  tabId: number,
  message: Record<string, unknown>,
  callback?: (response: unknown) => void
): void => {
  if (callback) {
    void chrome.tabs.sendMessage(tabId, message, callback);
  } else {
    void chrome.tabs.sendMessage(tabId, message);
  }
};

// Helper function to get active tab
const getActiveTab = (callback: (tabId: number | undefined) => void): void => {
  void chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    callback(tabs[0]?.id);
  });
};

export const useSoundTools = (): UseSoundToolsReturn => {
  const [enabledEffects, setEnabledEffects] = useState<Set<string>>(new Set());

  // Use ref for cleanup timer to avoid stale closures
  const retryTimerRef = useRef<number | null>(null);

  const getEffectStatus = useCallback((tabId: number): void => {
    sendTabMessage(tabId, { action: EFFECT_STATUS_ACTION }, response => {
      if (chrome.runtime.lastError) {
        Logger.warn(
          'Content script not ready for effects:',
          chrome.runtime.lastError.message
        );
        return;
      }
      if (
        response &&
        typeof response === 'object' &&
        response !== null &&
        'enabledEffects' in response
      ) {
        const resp = response as { enabledEffects?: string[] };
        if (Array.isArray(resp.enabledEffects)) {
          setEnabledEffects(new Set(resp.enabledEffects));
        }
      }
    });
  }, []);

  const initializePopup = useCallback((): void => {
    getActiveTab(tabId => {
      if (typeof tabId === 'number') {
        getEffectStatus(tabId);
      }
    });
  }, [getEffectStatus]);

  useEffect(() => {
    // Try immediately, then retry after a short delay if needed
    initializePopup();
    retryTimerRef.current = window.setTimeout(initializePopup, RETRY_DELAY);

    return (): void => {
      if (retryTimerRef.current !== null) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [initializePopup]);

  const toggleEffect = useCallback(
    (effect: string): void => {
      const effectLower = effect.toLowerCase();
      const isEnabled = enabledEffects.has(effectLower);

      getActiveTab(tabId => {
        if (typeof tabId === 'number') {
          sendTabMessage(
            tabId,
            {
              action: isEnabled ? DISABLE_EFFECT_ACTION : ENABLE_EFFECT_ACTION,
              effect: effectLower,
            },
            response => {
              if (chrome.runtime.lastError) {
                Logger.error(
                  'Error toggling effect:',
                  chrome.runtime.lastError.message
                );
                return;
              }

              // Update local state only if the message was successful
              if (response) {
                setEnabledEffects(prevEffects => {
                  const newEffects = new Set(prevEffects);
                  if (isEnabled) {
                    newEffects.delete(effectLower);
                  } else {
                    newEffects.add(effectLower);
                  }
                  return newEffects;
                });
              }
            }
          );
        }
      });
    },
    [enabledEffects]
  );

  const updateEffectParameter = useCallback(
    (effect: string, parameter: string, value: number): void => {
      getActiveTab(tabId => {
        if (typeof tabId === 'number') {
          sendTabMessage(tabId, {
            action: UPDATE_EFFECT_PARAMETER_ACTION,
            effect: effect.toLowerCase(),
            parameter,
            value,
          });
        }
      });
    },
    []
  );

  return useMemo(
    () => ({
      enabledEffects,
      toggleEffect,
      updateEffectParameter,
    }),
    [enabledEffects, toggleEffect, updateEffectParameter]
  );
};
