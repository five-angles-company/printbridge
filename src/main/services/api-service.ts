import { EventEmitter } from 'events'
import https from 'https'
import http from 'http'
import { LoggerService } from './logger-service'
import { PrintJobService } from './print-job-service'
import { db } from '../../db'
import { Printer } from '../../shared/types/db-types'
import { PrintJobData } from '../../shared/types/api-types'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export class ApiService extends EventEmitter {
  private serverUrl?: string
  private clientId?: string
  private apiKey?: string
  private receiptPrinter?: Printer | null
  private labelPrinter?: Printer | null
  private isConnected = false
  private jobPollingTimer?: NodeJS.Timeout
  private readonly jobPollingInterval = 5000

  constructor(
    private readonly logger: LoggerService,
    private readonly printJobService: PrintJobService
  ) {
    super()
  }

  async initialize(): Promise<void> {
    await this.loadSettings()
    await this.registerWithServer()
    this.startPollingJobs()
    this.logger.info('API Service initialized and connected.')
  }

  async stop(): Promise<void> {
    this.clearPolling()
    this.isConnected = false
    this.logger.info('API Service stopped.')
  }

  private async loadSettings(): Promise<void> {
    const settings = await db.query.settings.findFirst({
      with: {
        barcodePrinter: true,
        receiptPrinter: true
      }
    })

    if (!settings) {
      throw new Error('No API settings found in local DB.')
    }

    this.apiKey = settings.apiKey
    this.serverUrl = settings.serverUrl
    this.clientId = settings.clientId
    this.receiptPrinter = settings.receiptPrinter
    this.labelPrinter = settings.barcodePrinter
  }

  async registerWithServer(): Promise<void> {
    const response = await this.makeRequest('POST', '/api/bridge/register', {
      timestamp: new Date().toISOString()
    }).catch((error) => ({ success: false, error }))

    if (!response.success) {
      this.logger.error('Failed to register with server:', response.error)
    }

    this.isConnected = true
    this.logger.info('Successfully registered with server.')
  }

  private startPollingJobs(): void {
    this.jobPollingTimer = setInterval(async () => {
      try {
        const response = await this.makeRequest<{ jobs: PrintJobData[] }>(
          'GET',
          `/api/bridge/jobs?clientId=${this.clientId}`
        )

        const jobs = response.data?.jobs ?? []
        if (jobs.length) {
          this.logger.info(`Fetched ${jobs.length} job(s)`)
          for (const job of jobs) {
            await this.processJob(job)
          }
        }
      } catch (error) {
        this.logger.warn('Failed to fetch jobs,', error)
      }
    }, this.jobPollingInterval)
  }

  private async processJob(job: PrintJobData): Promise<void> {
    try {
      this.logger.info(`Processing job ${job.name}`)
      const printer = this.getPrinterForJobType(job.type)

      await this.printJobService.execute(printer.name, {
        name: job.name,
        type: job.type,
        data: JSON.stringify(job.data),
        printerId: printer.id,
        createdAt: Date.now()
      })
    } catch (error) {
      this.logger.error(`Failed to process job ${job.name}:`, error)
    }
  }

  private getPrinterForJobType(type: string): Printer {
    if (type === 'label' && this.labelPrinter) {
      return this.labelPrinter
    }

    if (type === 'receipt' && this.receiptPrinter) {
      return this.receiptPrinter
    }

    throw new Error(`No configured printer for job type: ${type}`)
  }

  private async makeRequest<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    if (!this.apiKey || !this.serverUrl) {
      throw new Error('API key or server URL not configured')
    }

    const url = new URL(path, this.serverUrl)
    const protocol = url.protocol === 'https:' ? https : http

    return new Promise((resolve, reject) => {
      const request = protocol.request(
        {
          method,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'User-Agent': 'PrinterBridge/1.0'
          }
        },
        (response) => {
          let data = ''
          response.on('data', (chunk) => (data += chunk))
          response.on('end', () => {
            try {
              const parsed: ApiResponse<T> = JSON.parse(data)
              resolve(parsed)
            } catch {
              reject(new Error('Failed to parse API response'))
            }
          })
        }
      )

      request.on('error', reject)
      if (body) request.write(JSON.stringify(body))
      request.end()
    })
  }

  private clearPolling(): void {
    if (this.jobPollingTimer) {
      clearInterval(this.jobPollingTimer)
      this.jobPollingTimer = undefined
    }
  }

  get connected(): boolean {
    return this.isConnected
  }
}
