import EventEmitter from 'events'
import { LoggerService } from './logger-service'

export class ApiService extends EventEmitter {
  constructor(private readonly logger: LoggerService) {
    super()
  }

  public initialize() {
    this.logger.info('Api service initialized')
    return this
  }

  public stop() {
    this.logger.info('Api service stopped')
    return this
  }
}
