import fs from 'fs'
import path from 'path'

export class LoggerService {
  private logStream: fs.WriteStream
  private logDir: string
  private logFile: string

  constructor(private context: string = 'App') {
    this.logDir = path.join(process.cwd(), 'logs')
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    this.logFile = path.join(this.logDir, `log-${timestamp}.log`)
    this.logStream = fs.createWriteStream(this.logFile, { flags: 'a' })

    this.info(`Logger initialized for ${this.context}`)
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString()
    return `[${timestamp}] [${this.context}] [${level}] ${message}`
  }

  private writeToFile(message: string): void {
    this.logStream.write(`${message}\n`)
  }

  info(...messages: unknown[]): void {
    const message = this.formatMessage('INFO', messages.map(String).join(' '))
    console.log(message)
    this.writeToFile(message)
  }

  warn(...messages: unknown[]): void {
    const message = this.formatMessage('WARN', messages.map(String).join(' '))
    console.warn(message)
    this.writeToFile(message)
  }
  debug(...messages: unknown[]): void {
    const message = this.formatMessage('DEBUG', messages.map(String).join(' '))
    console.debug(message)
    this.writeToFile(message)
  }

  error(...messages: unknown[]): void {
    const message = this.formatMessage('ERROR', messages.map(String).join(' '))
    console.error(message)
    this.writeToFile(message)
  }

  async flush(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logStream.end(() => {
        resolve()
      })
      this.logStream.on('error', reject)
    })
  }
}
