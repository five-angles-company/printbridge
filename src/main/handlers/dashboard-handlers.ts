import { ipcMain } from 'electron'
import type { LoggerService } from '../services/logger-service'
import { DashboardService } from '../services/dashboard-service'

export class DashboardHandlers {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly logger: LoggerService
  ) {
    this.registerHandlers()
  }

  private registerHandlers() {
    this.logger.info('Registering settings handlers')

    ipcMain.handle('dashboard:get', async () => {
      this.logger.debug('[IPC] dashboard:get')
      const stats = await this.dashboardService.getStats()
      const jobs = await this.dashboardService.getRecentJobs(5)
      return { stats, jobs }
    })
  }
}
