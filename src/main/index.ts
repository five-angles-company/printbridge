import { app } from 'electron'
import { AppCore } from './core/app'

// Services
import { LoggerService } from './services/logger-service'
import { PrinterService } from './services/printer-service'
import { ApiService } from './services/api-service'
import { SettingsService } from './services/settings-service'
import { PrintJobService } from './services/print-job-service'
import { DashboardService } from './services/dashboard-service'
import { UpdateService } from './services/update-service'

// Core
import { WindowManager } from './core/window-manager'
import { MenuBuilder } from './core/menu-builder'

// Printers
import { ReceiptPrinter } from './printers/receipt-printer'
import { LabelPrinter } from './printers/label-printer'

class Main {
  private appCore: AppCore | null = null
  private readonly logger = new LoggerService('Main')

  public async start() {
    try {
      this.logger.info('🚀 Starting Printer Bridge...')

      // Prevent multiple instances
      if (!app.requestSingleInstanceLock()) {
        this.logger.warn('Instance already running. Exiting.')
        app.quit()
        return
      }

      // ===== Dependency Injection Wiring =====
      const receiptPrinter = new ReceiptPrinter()
      const labelPrinter = new LabelPrinter()

      const dashboardService = new DashboardService()
      const printerService = new PrinterService(this.logger, labelPrinter, receiptPrinter)
      const printJobService = new PrintJobService(this.logger, receiptPrinter, labelPrinter)
      const settingsService = new SettingsService(this.logger)
      const apiService = new ApiService(this.logger, printJobService, settingsService)
      const updateService = new UpdateService(new LoggerService('Updater'))
      const windowManager = new WindowManager(this.logger, process.env.NODE_ENV === 'development')
      const menuBuilder = new MenuBuilder()

      // ===== App Core Initialization =====
      this.appCore = new AppCore(
        this.logger,
        dashboardService,
        printerService,
        printJobService,
        settingsService,
        apiService,
        updateService, // ✅ Now passing a proper UpdateService instance
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

// ===== App Entry Point =====
const main = new Main()

app.whenReady().then(() => main.start())

// Ensure clean shutdown
app.on('before-quit', () => main.shutdown())
