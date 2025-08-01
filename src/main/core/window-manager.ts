import { BrowserWindow } from 'electron'
import path from 'path'
import { LoggerService } from '../services/logger-service'

export class WindowManager {
  private windows: Map<number, BrowserWindow> = new Map()
  private mainWindowId: number | null = null

  constructor(
    private logger: LoggerService,
    private isDevelopment: boolean = false
  ) {}

  /**
   * Create the main application window
   */
  async createMainWindow(): Promise<BrowserWindow> {
    const windowOptions: Electron.BrowserWindowConstructorOptions = {
      width: 800,
      height: 600,
      minWidth: 500,
      minHeight: 400,
      show: false,
      webPreferences: {
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js'),
        sandbox: false
      }
    }

    const window = new BrowserWindow(windowOptions)

    this.windows.set(window.id, window)
    this.mainWindowId = window.id

    const indexHtml = this.isDevelopment
      ? 'http://localhost:5174' // or your dev server URL
      : `file://${path.join(__dirname, '../renderer/index.html')}`

    await window.loadURL(indexHtml)

    window.once('ready-to-show', () => {
      this.logger.info('✅ Main window ready to show')
    })

    window.on('closed', () => {
      this.logger.info(`🪟 Window ${window.id} closed`)
      this.windows.delete(window.id)
      if (window.id === this.mainWindowId) {
        this.mainWindowId = null
      }
    })

    return window
  }

  /**
   * Send a message to all windows
   */
  broadcastToAll(channel: string, data: unknown): void {
    for (const window of this.windows.values()) {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data)
      }
    }
  }

  /**
   * Close all open windows
   */
  closeAll(): void {
    this.logger.info('🧹 Closing all windows...')
    for (const window of this.windows.values()) {
      if (!window.isDestroyed()) {
        window.close()
      }
    }
    this.windows.clear()
  }

  /**
   * Check if any windows are currently open
   */
  hasOpenWindows(): boolean {
    return this.windows.size > 0
  }

  /**
   * Get number of currently open windows
   */
  getWindowCount(): number {
    return this.windows.size
  }

  /**
   * Get the main window instance (if available)
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindowId !== null ? (this.windows.get(this.mainWindowId) ?? null) : null
  }
}
