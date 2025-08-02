import { ipcMain } from 'electron'
import type { LoggerService } from '../services/logger-service'
import { SettingsService } from '../services/settings-service'
import { PrinterService } from '../services/printer-service'

export class SettingsHandlers {
  constructor(
    private readonly printer: PrinterService,
    private readonly settings: SettingsService,
    private readonly logger: LoggerService
  ) {
    this.registerHandlers()
  }

  private registerHandlers() {
    this.logger.info('Registering settings handlers')

    ipcMain.handle('settings:get', async () => {
      this.logger.debug('[IPC] settings:update')
      const settings = await this.settings.loadSettings()
      const printers = await this.printer.getPrinters()
      return { settings, printers }
    })

    ipcMain.handle('settings:update', async (_event, data) => {
      console.log(data)
      this.logger.debug('[IPC] settings:update')
      this.settings.updateSettings(data)
    })
  }
}
