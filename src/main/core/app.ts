import { app } from 'electron'

// Types
import type { WindowManager } from './window-manager'
import type { MenuBuilder } from './menu-builder'
import type { PrinterService } from '../services/printer-service'
import type { ApiService } from '../services/api-service'
import type { LoggerService } from '../services/logger-service'
import type { UpdateService } from '../services/update-service'

// Services
import { SettingsService } from '../services/settings-service'
import { PrintJobService } from '../services/print-job-service'
import { DashboardService } from '../services/dashboard-service'

// Handlers
import { PrinterHandlers } from '../handlers/printer-handlers'
import { ApiHandlers } from '../handlers/api-handlers'
import { SettingsHandlers } from '../handlers/settings-handlers'
import { DashboardHandlers } from '../handlers/dashboard-handlers'
import { UpdateHandlers } from '../handlers/update-handlers'

export class AppCore {
  private readonly isDev: boolean
  private isInitialized = false
  private isShuttingDown = false

  constructor(
    private readonly logger: LoggerService,
    private readonly dashboard: DashboardService,
    private readonly printer: PrinterService,
    private readonly printJob: PrintJobService,
    private readonly settings: SettingsService,
    private readonly api: ApiService,
    private readonly updater: UpdateService,
    public readonly windowManager: WindowManager,
    private readonly menuBuilder: MenuBuilder
  ) {
    this.isDev = process.env.NODE_ENV === 'development'
  }

  /* -------------------------------------------------------------------------- */
  /*                               INITIALIZATION                               */
  /* -------------------------------------------------------------------------- */

  public async initialize() {
    this.setupAppEvents()

    if (!app.isReady()) {
      await app.whenReady()
    }

    await this.initializeServices()
    this.initializeHandlers()
    await this.initializeUI()

    this.isInitialized = true
  }

  private setupAppEvents() {
    app.on('ready', () => this.logger.info('📱 Electron ready'))

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.shutdown()
      }
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

    this.updater.initialize()
    this.bindUpdateEvents()
  }

  private initializeHandlers() {
    new PrinterHandlers(this.printer, this.logger)
    new DashboardHandlers(this.dashboard, this.logger)
    new ApiHandlers(this.logger)
    new SettingsHandlers(this.printer, this.settings, this.logger)
    new UpdateHandlers(this.updater, this.logger)
  }

  private async initializeUI() {
    await this.createMainWindow()
  }

  /* -------------------------------------------------------------------------- */
  /*                                EVENT BINDING                               */
  /* -------------------------------------------------------------------------- */

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

  private bindUpdateEvents() {
    this.updater.on('checking', () => {
      this.logger.info('Checking for updates...')
      this.broadcast('update:checking', null)
    })

    this.updater.on('update-available', (info) => {
      this.logger.info('Update available', info)
      this.broadcast('update:available', info)
    })

    this.updater.on('no-update', () => {
      this.logger.info('No updates available')
      this.broadcast('update:none', null)
    })

    this.updater.on('download-progress', (percent) => {
      this.logger.info(`Update download progress: ${percent}%`)
      this.broadcast('update:progress', percent)
    })

    this.updater.on('update-downloaded', (info) => {
      this.logger.info('Update downloaded', info)
      this.broadcast('update:downloaded', info)
    })

    this.updater.on('error', (error) => {
      this.logger.error('Update error:', error)
      this.broadcast('update:error', error)
    })
  }

  /* -------------------------------------------------------------------------- */
  /*                                    UI                                      */
  /* -------------------------------------------------------------------------- */

  public async createMainWindow() {
    const win = await this.windowManager.createMainWindow()
    this.menuBuilder.setMenu(this.menuBuilder.buildMenu())
    win.show()
  }

  private broadcast(channel: string, data: any) {
    this.windowManager?.broadcastToAll(channel, data)
  }

  /* -------------------------------------------------------------------------- */
  /*                                APP LIFECYCLE                               */
  /* -------------------------------------------------------------------------- */

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

  /* -------------------------------------------------------------------------- */
  /*                                  STATUS                                    */
  /* -------------------------------------------------------------------------- */

  public getStatus() {
    return {
      initialized: this.isInitialized,
      development: this.isDev,
      services: {
        printer: !!this.printer,
        api: !!this.api,
        updater: !!this.updater
      }
    }
  }
}
