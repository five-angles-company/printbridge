import type { LoggerService } from '../services/logger-service'

export class ApiHandlers {
  constructor(private readonly logger: LoggerService) {
    this.registerHandlers()
  }

  private registerHandlers() {
    this.logger.info('Registering api handlers')
  }
}
