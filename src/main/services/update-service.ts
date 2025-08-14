import { autoUpdater } from 'electron-updater'
import { EventEmitter } from 'events'
import { LoggerService } from './logger-service'

export class UpdateService extends EventEmitter {
  constructor(private readonly logger: LoggerService) {
    super()
  }

  public initialize() {
    autoUpdater.autoDownload = false
    autoUpdater.forceDevUpdateConfig = true

    autoUpdater.logger = {
      info: (...args: any[]) => this.logger.info(...args),
      warn: (...args: any[]) => this.logger.warn(...args),
      error: (...args: any[]) => this.logger.error(...args)
    }

    autoUpdater.on('checking-for-update', () => {
      this.logger.info('Checking for update...')
      this.emit('checking')
    })

    autoUpdater.on('update-available', (info) => {
      this.logger.info('Update available', info)
      this.emit('update-available', info)
    })

    autoUpdater.on('update-not-available', (info) => {
      this.logger.info('No updates found', info)
      this.emit('no-update', info)
    })

    autoUpdater.on('error', (err) => {
      this.logger.error('Update error', err)
      this.emit('error', err instanceof Error ? err.message : String(err))
    })

    autoUpdater.on('download-progress', (progress) => {
      const percent = Math.round(progress.percent)
      this.logger.info(`Download progress: ${percent}%`)
      this.emit('download-progress', percent)
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.logger.info('Update downloaded', info)
      this.emit('update-downloaded', info)
    })
  }

  public async checkForUpdates(): Promise<void> {
    this.logger.info('Manually triggered update check...')
    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.logger.error('Error while checking for updates', error)
      this.emit('error', error instanceof Error ? error.message : String(error))
    }
  }

  public async downloadUpdate(): Promise<void> {
    this.logger.info('Manually triggered update download...')
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.logger.error('Error while downloading update', error)
      this.emit('error', error instanceof Error ? error.message : String(error))
    }
  }

  public installUpdate(): void {
    this.logger.info('Installing update and restarting...')
    autoUpdater.quitAndInstall()
  }
}
