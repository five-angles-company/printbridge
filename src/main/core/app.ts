import { app } from 'electron'

// Types
import type { WindowManager } from './window-manager'
import type { MenuBuilder } from './menu-builder'
import type { PrinterService } from '../services/printer-service'
import type { ApiService } from '../services/api-service'
import type { LoggerService } from '../services/logger-service'

// Handlers
import { PrinterHandlers } from '../handlers/printer-handlers'
import { ApiHandlers } from '../handlers/api-handlers'
import { SettingsService } from '../services/settings-service'
import { PrintJobService } from '../services/print-job-service'

export class AppCore {
  private readonly isDev: boolean
  private isInitialized = false
  private isShuttingDown = false

  constructor(
    private readonly logger: LoggerService,
    private readonly printer: PrinterService,
    private readonly printJob: PrintJobService,
    private readonly settings: SettingsService,
    private readonly api: ApiService,
    public readonly windowManager: WindowManager,
    private readonly menuBuilder: MenuBuilder
  ) {
    this.isDev = process.env.NODE_ENV === 'development'
  }

  public async initialize() {
    this.setupAppEvents()

    if (!app.isReady()) await app.whenReady()

    await this.initializeServices()
    this.initializeHandlers()
    await this.initializeUI()

    this.isInitialized = true
  }

  private setupAppEvents() {
    app.on('ready', () => this.logger.info('📱 Electron ready'))

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') this.shutdown()
    })

    app.on('activate', async () => {
      if (process.platform === 'darwin' && !this.windowManager?.hasOpenWindows()) {
        await this.createMainWindow()
      }
    })

    app.on('before-quit', async (event) => {
      if (!this.isShuttingDown) {
        event.preventDefault()
        await this.shutdown()
      }
    })

    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    })
  }

  private async initializeServices() {
    await this.settings.initialize()

    await this.printer.initialize()
    this.bindPrinterEvents()

    await this.printJob.initialize()

    await this.api.initialize()
    this.bindApiEvents()
  }

  private bindPrinterEvents() {
    this.printer.on('printer:status-changed', (status) => {
      this.broadcast('printer:status-changed', status)
    })

    this.printer.on('job:completed', (job) => {
      this.logger.info(`Job complete: ${job.id}`)
      this.broadcast('print:job-completed', job)
    })
  }

  private bindApiEvents() {
    this.api.on('connection:established', (info) => {
      this.logger.info('API connected')
      this.broadcast('api:connected', info)
    })

    this.api.on('connection:lost', (error) => {
      this.logger.warn('API lost:', error)
      this.broadcast('api:disconnected', error)
    })
  }

  private initializeHandlers() {
    new PrinterHandlers(this.printer, this.logger)
    new ApiHandlers(this.api, this.logger)
  }

  private async initializeUI() {
    await this.createMainWindow()
  }

  public async createMainWindow() {
    const win = await this.windowManager.createMainWindow()
    this.menuBuilder.setMenu(this.menuBuilder.buildMenu())
    win.show()

    if (this.isDev) {
      win.webContents.openDevTools()
    }
  }

  private broadcast(channel: string, data: any) {
    this.windowManager?.broadcastToAll(channel, data)
  }

  public async shutdown() {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    this.logger.info('Shutting down...')
    try {
      await Promise.all([this.api?.stop(), this.printer?.stop(), this.logger.flush()])
      this.windowManager?.closeAll()
      app.quit()
    } catch (error) {
      this.logger.error('Shutdown error:', error)
      app.exit(1)
    }
  }

  public async restart() {
    this.logger.info('Restarting...')
    await this.shutdown()
    app.relaunch()
  }

  public getStatus() {
    return {
      initialized: this.isInitialized,
      development: this.isDev,
      services: {
        printer: !!this.printer,
        api: !!this.api
      }
    }
  }
}
