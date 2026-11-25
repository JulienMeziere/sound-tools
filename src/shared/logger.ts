/* eslint-disable no-console */

/**
 * Warnings and errors are always printed.
 * Info/debug messages are only printed in development builds.
 */
const PREFIX = '🎵 Sound Tools:';
// MODE rather than DEV: DEV is false for the custom "firefox-development" build mode.
const isDev =
  import.meta.env.DEV || import.meta.env.MODE.endsWith('development');

export const Logger = {
  info: (...params: unknown[]): void => {
    if (isDev) console.info(PREFIX, ...params);
  },
  debug: (...params: unknown[]): void => {
    if (isDev) console.debug(PREFIX, ...params);
  },
  warn: (...params: unknown[]): void => console.warn(PREFIX, ...params),
  error: (...params: unknown[]): void => console.error(PREFIX, ...params),
};
