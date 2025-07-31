import { BrowserWindow, ipcMain } from 'electron'
import type { PrinterService } from '../services/printer-service'
import type { LoggerService } from '../services/logger-service'

export class PrinterHandlers {
  constructor(
    private readonly printer: PrinterService,
    private readonly logger: LoggerService
  ) {
    this.registerHandlers()
  }

  private registerHandlers() {
    this.logger.info('Registering printer handlers')

    ipcMain.handle('printers:list', async () => {
      this.logger.debug('[IPC] printer:list')
      const window = BrowserWindow.getFocusedWindow()
      const printers = window ? await window?.webContents.getPrintersAsync() : []
      return printers
    })

    ipcMain.handle('printers:get', async () => {
      this.logger.debug('[IPC] printer:get')
      return this.printer.getPrinters()
    })

    ipcMain.handle('printers:create', async (_event, data) => {
      this.logger.debug('[IPC] printer:create', data)
      const printer = await this.printer.createPrinter(data.name, data.type)
      return printer
    })

    ipcMain.handle('printers:update', async (_event, data) => {
      this.logger.debug('[IPC] printer:update', data)
      const printer = await this.printer.updatePrinter(data.id, data)
      return printer
    })

    ipcMain.handle('printers:update-settings', async (_event, data) => {
      const { printerId, settings } = data
      const printer = await this.printer.updatePrinterSettings(printerId, settings)
      return printer
    })

    ipcMain.handle('printers:delete', async (_event, printerId) => {
      this.logger.debug('[IPC] printer:delete', printerId)
      const printer = await this.printer.deletePrinter(printerId)
      return printer
    })
  }
}
