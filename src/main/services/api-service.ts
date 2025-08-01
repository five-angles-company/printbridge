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
  private isProcessingJobs = false
  private isConnected = false
  private jobPollingTimer?: NodeJS.Timeout
  private processingTimeout?: NodeJS.Timeout

  private serverUrl?: string
  private apiKey?: string
  private clientId?: string
  private receiptPrinter?: Printer | null
  private labelPrinter?: Printer | null

  private readonly jobPollingInterval = 2000 // 2 seconds
  private readonly processingTimeoutMs = 300000 // 5 minutes

  constructor(
    private readonly logger: LoggerService,
    private readonly printJobService: PrintJobService
  ) {
    super()
  }

  // ─────────────────────────────────────────────────────────
  // Lifecycle Methods
  // ─────────────────────────────────────────────────────────
  async initialize(): Promise<void> {
    try {
      await this.loadSettings()
      await this.registerWithServer()
      this.startPollingJobs()
      this.logger.info('API Service initialized and connected')
    } catch (error) {
      this.logger.error('Failed to initialize API Service:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    this.clearPolling()
    this.clearProcessingTimeout()
    this.isConnected = false
    this.isProcessingJobs = false
    this.logger.info('API Service stopped')
  }

  get connected(): boolean {
    return this.isConnected
  }

  // ─────────────────────────────────────────────────────────
  // Settings & Registration
  // ─────────────────────────────────────────────────────────
  private async loadSettings(): Promise<void> {
    const settings = await db.query.settings.findFirst({
      with: {
        barcodePrinter: true,
        receiptPrinter: true
      }
    })

    if (!settings?.apiKey || !settings?.serverUrl || !settings?.clientId) {
      throw new Error('Incomplete API settings found in database')
    }

    this.apiKey = settings.apiKey
    this.serverUrl = settings.serverUrl
    this.clientId = settings.clientId
    this.receiptPrinter = settings.receiptPrinter
    this.labelPrinter = settings.barcodePrinter

    this.logger.info('Settings loaded successfully')
  }

  private async registerWithServer(): Promise<void> {
    try {
      const response = await this.makeRequest(
        'POST',
        `/api/bridge/register?clientId=${this.clientId}`,
        {
          timestamp: new Date().toISOString()
        }
      )

      if (!response.success) {
        throw new Error(response.error || 'Registration failed')
      }

      this.isConnected = true
      this.logger.info('Successfully registered with server')
    } catch (error) {
      this.logger.error('Failed to register with server:', error)
      throw error
    }
  }

  // ─────────────────────────────────────────────────────────
  // Job Polling
  // ─────────────────────────────────────────────────────────
  private startPollingJobs(): void {
    this.jobPollingTimer = setInterval(async () => {
      if (this.isProcessingJobs) {
        this.logger.debug('Still processing jobs, skipping poll')
        return
      }

      if (!this.isConnected) {
        this.logger.warn('Not connected to server, skipping job poll')
        return
      }

      try {
        await this.fetchAndProcessJobs()
      } catch (error) {
        this.logger.warn('Error during job polling:', error)
      }
    }, this.jobPollingInterval)

    this.logger.info(`Started job polling every ${this.jobPollingInterval}ms`)
  }

  private clearPolling(): void {
    if (this.jobPollingTimer) {
      clearInterval(this.jobPollingTimer)
      this.jobPollingTimer = undefined
    }
  }

  // ─────────────────────────────────────────────────────────
  // Job Fetching & Processing
  // ─────────────────────────────────────────────────────────
  private async fetchAndProcessJobs(): Promise<void> {
    const response = await this.makeRequest<{ jobs: PrintJobData[] }>(
      'GET',
      `/api/bridge/jobs?clientId=${this.clientId}`
    )

    const jobs = response.data?.jobs ?? []
    if (!jobs.length) return

    this.logger.info(`Fetched ${jobs.length} job(s)`)
    await this.processJobsBatch(jobs)
  }

  private async processJobsBatch(jobs: PrintJobData[]): Promise<void> {
    this.isProcessingJobs = true
    this.setProcessingTimeout()

    try {
      for (const job of jobs) {
        await this.processJob(job)
      }
      this.logger.info(`Successfully processed ${jobs.length} job(s)`)
    } catch (error) {
      this.logger.error('Error processing job batch:', error)
    } finally {
      this.isProcessingJobs = false
      this.clearProcessingTimeout()
    }
  }

  private async processJob(job: PrintJobData): Promise<void> {
    try {
      this.logger.info(`Processing job: ${job.name} (${job.type})`)

      const printer = this.getPrinterForJobType(job.type)

      await this.printJobService.execute(printer.name, {
        name: job.name,
        type: job.type,
        data: JSON.stringify(job.data),
        printerId: printer.id,
        createdAt: Date.now()
      })

      await this.markJobComplete(job.id)
      this.logger.info(`Job ${job.name} completed successfully`)
    } catch (error) {
      this.logger.error(`Failed to process job ${job.name}:`, error)

      try {
        await this.markJobFailed(job.id, error instanceof Error ? error.message : 'Unknown error')
      } catch (markError) {
        this.logger.error(`Failed to mark job ${job.name} as failed:`, markError)
      }

      throw error // Stop batch processing on error
    }
  }

  // ─────────────────────────────────────────────────────────
  // Job Completion / Failure Reporting
  // ─────────────────────────────────────────────────────────
  private async markJobComplete(jobId: number): Promise<void> {
    const response = await this.makeRequest('POST', `/api/bridge/jobs/${jobId}/complete`)
    if (!response.success) {
      throw new Error(`Failed to mark job ${jobId} as complete: ${response.error}`)
    }
  }

  private async markJobFailed(jobId: number, reason: string): Promise<void> {
    await this.makeRequest('POST', `/api/bridge/jobs/${jobId}/fail`, { reason })
  }

  // ─────────────────────────────────────────────────────────
  // Printer Handling
  // ─────────────────────────────────────────────────────────
  private getPrinterForJobType(type: string): Printer {
    const printer =
      type === 'label' ? this.labelPrinter : type === 'receipt' ? this.receiptPrinter : null

    if (!printer) {
      throw new Error(`No configured printer for job type: ${type}`)
    }

    return printer
  }

  // ─────────────────────────────────────────────────────────
  // Timeouts
  // ─────────────────────────────────────────────────────────
  private setProcessingTimeout(): void {
    this.processingTimeout = setTimeout(() => {
      this.logger.warn('Job processing timeout reached, resetting processing flag')
      this.isProcessingJobs = false
      this.clearProcessingTimeout()
    }, this.processingTimeoutMs)
  }

  private clearProcessingTimeout(): void {
    if (this.processingTimeout) {
      clearTimeout(this.processingTimeout)
      this.processingTimeout = undefined
    }
  }

  // ─────────────────────────────────────────────────────────
  // HTTP Request Helper
  // ─────────────────────────────────────────────────────────
  private async makeRequest<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    if (!this.apiKey || !this.serverUrl) {
      throw new Error('API configuration missing')
    }

    const url = new URL(path, this.serverUrl)
    const protocol = url.protocol === 'https:' ? https : http

    return new Promise((resolve, reject) => {
      const requestData = body ? JSON.stringify(body) : undefined

      const request = protocol.request(
        {
          method,
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'User-Agent': 'PrinterBridge/1.0',
            ...(requestData && { 'Content-Length': Buffer.byteLength(requestData) })
          }
        },
        (response) => {
          let data = ''
          response.on('data', (chunk) => (data += chunk))
          response.on('end', () => {
            try {
              const parsed: ApiResponse<T> = JSON.parse(data)
              resolve(parsed)
            } catch (parseError) {
              reject(new Error(`Failed to parse API response: ${parseError}`))
            }
          })
        }
      )

      request.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`))
      })

      request.on('timeout', () => {
        request.destroy()
        reject(new Error('Request timeout'))
      })

      request.setTimeout(30000) // 30 seconds

      if (requestData) {
        request.write(requestData)
      }

      request.end()
    })
  }
}
