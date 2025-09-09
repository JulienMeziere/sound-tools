/*
 * Logger class for Chrome Extension.
 *
 * Warning, errors, and debug messages are always printed in the console
 * However logs and info are only printed if it's NOT production environment
 */
export class Logger {
  private static isDev(): boolean {
    // Check for Vite development environment
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (
        import.meta.env.DEV === true || import.meta.env.MODE === 'development'
      )
    }

    // Fallback to globalThis check
    if (
      typeof globalThis !== 'undefined' &&
      (globalThis as Record<string, unknown>)['__DEV__'] !== undefined
    ) {
      return Boolean((globalThis as Record<string, unknown>)['__DEV__'])
    }

    // Default to development for Chrome extensions
    return true
  }

  private static output<T extends (..._data: unknown[]) => void>(
    logCb: T,
    params: Parameters<T>,
    alwaysPrint = false
  ): void {
    if (this.isDev() || alwaysPrint) {
      logCb(...params)
    }
  }

  private static formatMessage(
    prefix: string,
    ...params: unknown[]
  ): unknown[] {
    return [`🎵 Sound Tools [${prefix}]:`, ...params]
  }

  public static log(...params: Parameters<typeof console.log>): void {
    // eslint-disable-next-line no-console
    this.output(console.log, this.formatMessage('LOG', ...params))
  }

  public static info(...params: Parameters<typeof console.info>): void {
    // eslint-disable-next-line no-console
    this.output(console.info, this.formatMessage('INFO', ...params))
  }

  public static warn(...params: Parameters<typeof console.warn>): void {
    // eslint-disable-next-line no-console
    this.output(console.warn, this.formatMessage('WARN', ...params), true)
  }

  public static error(...params: Parameters<typeof console.error>): void {
    // eslint-disable-next-line no-console
    this.output(console.error, this.formatMessage('ERROR', ...params), true)
  }

  public static debug(...params: Parameters<typeof console.debug>): void {
    // eslint-disable-next-line no-console
    this.output(console.debug, this.formatMessage('DEBUG', ...params), true)
  }
}
