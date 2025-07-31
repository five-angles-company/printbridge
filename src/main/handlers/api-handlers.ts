import type { LoggerService } from '../services/logger-service'
import { ApiService } from '../services/api-service'

export class ApiHandlers {
  constructor(
    private readonly api: ApiService,
    private readonly logger: LoggerService
  ) {
    this.registerHandlers()
  }

  private registerHandlers() {
    this.logger.info('Registering api handlers')
  }
}
