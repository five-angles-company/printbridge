import { ipcMain } from 'electron'
import type { LoggerService } from '../services/logger-service'
import { UpdateService } from '../services/update-service'

export class UpdateHandlers {
  constructor(
    private readonly updateService: UpdateService,
    private readonly logger: LoggerService
  ) {
    this.registerHandlers()
  }

  private registerHandlers() {
    this.logger.info('Registering update handlers')

    // Check for update
    ipcMain.handle('update:check', async () => {
      try {
        this.logger.info('Checking for updates…')
        const info = await this.updateService.checkForUpdates()
        return info
      } catch (err) {
        this.logger.error('Error checking for updates', err)
        throw err
      }
    })

    // Download update
    ipcMain.handle('update:download', async () => {
      try {
        this.logger.info('Downloading update…')
        await this.updateService.downloadUpdate()
        return true
      } catch (err) {
        this.logger.error('Error downloading update', err)
        throw err
      }
    })

    // Install update
    ipcMain.handle('update:install', async () => {
      try {
        this.logger.info('Installing update…')
        await this.updateService.installUpdate()
        return true
      } catch (err) {
        this.logger.error('Error installing update', err)
        throw err
      }
    })
  }
}
