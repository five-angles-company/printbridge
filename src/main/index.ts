import { app } from 'electron'
import { AppCore } from './core/app'

// Services
import { LoggerService } from './services/logger-service'
import { PrinterService } from './services/printer-service'
import { ApiService } from './services/api-service'
import { WindowManager } from './core/window-manager'
import { MenuBuilder } from './core/menu-builder'
import { SettingsService } from './services/settings-service'
import { PrintJobService } from './services/print-job-service'
import { ReceiptPrinter } from './printers/receipt-printer'
import { LabelPrinter } from './printers/label-printer'

class Main {
  public appCore: AppCore | null = null
  private readonly logger = new LoggerService('Main')

  public async start() {
    try {
      this.logger.info('🚀 Starting Printer Bridge...')

      if (!app.requestSingleInstanceLock()) {
        this.logger.warn('Instance already running. Exiting.')
        app.quit()
        return
      }

      // DI Wiring
      const receiptPrinter = new ReceiptPrinter()
      const labelPrinter = new LabelPrinter()
      const printer = new PrinterService(this.logger)
      const printJob = new PrintJobService(this.logger, receiptPrinter, labelPrinter)
      const settings = new SettingsService(this.logger)
      const api = new ApiService(this.logger, printJob)
      const windowManager = new WindowManager(this.logger, process.env.NODE_ENV === 'development')
      const menuBuilder = new MenuBuilder(this.logger, windowManager)

      this.appCore = new AppCore(
        this.logger,
        printer,
        printJob,
        settings,
        api,
        windowManager,
        menuBuilder
      )
      await this.appCore.initialize()

      this.logger.info('✅ Application started')
    } catch (error: any) {
      this.logger.error('💥 Startup failed:', error)
      app.quit()
    }
  }

  public async shutdown() {
    if (this.appCore) {
      await this.appCore.shutdown()
    }
  }
}

// Launch
const main = new Main()
app.whenReady().then(() => main.start())
