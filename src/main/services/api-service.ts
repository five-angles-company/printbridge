import { EventEmitter } from 'events'
import https from 'https'
import http from 'http'

import { LoggerService } from './logger-service'
import { PrintJobService } from './print-job-service'
import { SettingsService } from './settings-service'
import { Printer } from '../../shared/types/db-types'
import { PrintJobData } from '../../shared/types/api-types'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export class ApiService extends EventEmitter {
  private isConnected = false
  private isProcessing = false
  private isStopped = false
  private failureCount = 0

  private jobTimer?: NodeJS.Timeout
  private heartbeatTimer?: NodeJS.Timeout
  private reconnectTimer?: NodeJS.Timeout

  private apiKey = ''
  private serverUrl = ''
  private clientId = ''
  private receiptPrinter?: Printer
  private labelPrinter?: Printer

  constructor(
    private readonly logger: LoggerService,
    private readonly printJobService: PrintJobService,
    private readonly settingsService: SettingsService
  ) {
    super()
    this.settingsService.on('settings:updated', () =>
      this.restart().catch((err) => this.logger.error('Restart failed:', err))
    )
  }

  // Lifecycle Methods
  async initialize(): Promise<void> {
    await this.loadSettings()
    await this.start()
    this.logger.info('API Service initialized')
  }

  async stop(): Promise<void> {
    this.isStopped = true
    this.clearTimers()
    while (this.isProcessing) await this.sleep(100)
    this.isConnected = false
    this.logger.info('API Service stopped')
  }

  get connected(): boolean {
    return this.isConnected
  }

  // Connection Management
  private async start(): Promise<void> {
    if (!this.hasConfig() || this.isStopped) {
      this.handleConnectionLoss('Invalid configuration')
      return
    }

    try {
      await this.connect()
      this.startHeartbeat()
      this.startPolling()
    } catch (err) {
      this.logger.error('Connection failed:', err)
      this.handleConnectionLoss('Connection failed')
      this.scheduleReconnect()
    }
  }

  private async restart(): Promise<void> {
    this.handleConnectionLoss('Settings changed')
    await this.loadSettings()
    await this.start()
  }

  private async connect(): Promise<void> {
    const response = await this.request('POST', `/api/bridge/register?clientId=${this.clientId}`, {
      timestamp: new Date().toISOString()
    })

    if (!response.success) throw new Error(response.error || 'Connection failed')

    this.isConnected = true
    this.failureCount = 0
    this.emit('connection:established')
    this.logger.info('Connected to API server')
  }

  private handleConnectionLoss(reason: string): void {
    if (!this.isConnected) return
    this.isConnected = false
    this.clearTimers()
    this.emit('connection:lost')
    this.logger.error(`Connection lost - ${reason}`)
  }

  private scheduleReconnect(): void {
    if (this.isStopped || this.reconnectTimer) return

    this.failureCount++
    const delay = Math.min(1000 * this.failureCount, 30000)
    this.logger.info(`Reconnecting in ${delay}ms`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined
      this.start().catch(() => {})
    }, delay)
  }

  // Heartbeat
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => this.checkHeartbeat(), 10000)
  }

  private async checkHeartbeat(): Promise<void> {
    if (!this.isConnected || this.isStopped) return

    try {
      const response = await this.request('GET', `/api/bridge/heartbeat?clientId=${this.clientId}`)
      if (!response.success) throw new Error('Heartbeat failed')
    } catch (err) {
      this.logger.warn('Heartbeat failed:', err)
      this.handleConnectionLoss('Heartbeat failed')
    }
  }

  // Job Processing
  private startPolling(): void {
    this.jobTimer = setInterval(() => this.pollJobs(), 3000)
  }

  private async pollJobs(): Promise<void> {
    if (!this.isConnected || this.isProcessing || this.isStopped) return

    try {
      const response = await this.request<{ jobs: PrintJobData[] }>(
        'GET',
        `/api/bridge/jobs?clientId=${this.clientId}`
      )
      const jobs = response.data?.jobs || []
      if (jobs.length > 0) await this.processJobs(jobs)
    } catch (err) {
      this.logger.warn('Job polling failed:', err)
      this.handleConnectionLoss('Job polling failed')
    }
  }

  private async processJobs(jobs: PrintJobData[]): Promise<void> {
    this.isProcessing = true
    try {
      for (const job of jobs) {
        if (this.isStopped) break
        await this.processJob(job)
      }
    } finally {
      this.isProcessing = false
    }
  }

  private async processJob(job: PrintJobData): Promise<void> {
    try {
      const printer = job.type === 'label' ? this.labelPrinter : this.receiptPrinter
      if (!printer) throw new Error(`No ${job.type} printer`)

      await this.printJobService.execute(printer.name, {
        name: job.name,
        type: job.type,
        data: JSON.stringify(job.data),
        printerId: printer.id,
        createdAt: Date.now()
      })

      await this.request('POST', `/api/bridge/jobs/${job.id}/complete`)
      this.logger.info(`Job completed: ${job.name}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      try {
        await this.request('POST', `/api/bridge/jobs/${job.id}/fail`, { reason: errorMessage })
      } catch {
        this.logger.error('Failed to report job failure:', err)
      }
      this.logger.error(`Job failed: ${job.name}`, err)
    }
  }

  // HTTP Requests
  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.serverUrl)
    const client = url.protocol === 'https:' ? https : http
    const data = body ? JSON.stringify(body) : undefined

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        req.destroy()
        reject(new Error('Timeout'))
      }, 10000)

      const req = client.request(
        {
          method,
          hostname: url.hostname,
          port: url.port,
          path: url.pathname + url.search,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            ...(data && { 'Content-Length': Buffer.byteLength(data) })
          }
        },
        (res) => {
          clearTimeout(timeout)
          let raw = ''
          res.on('data', (chunk) => (raw += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw))
            } catch {
              reject(new Error('Invalid response'))
            }
          })
        }
      )

      req.on('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })

      if (data) req.write(data)
      req.end()
    })
  }

  // Utilities
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.settingsService.loadSettings()
      this.apiKey = settings?.apiKey || ''
      this.serverUrl = settings?.serverUrl || ''
      this.clientId = settings?.clientId || ''
      this.receiptPrinter = settings?.receiptPrinter || undefined
      this.labelPrinter = settings?.barcodePrinter || undefined
    } catch (err) {
      this.logger.error('Failed to load settings:', err)
    }
  }

  private hasConfig(): boolean {
    return !!(this.apiKey && this.serverUrl && this.clientId)
  }

  private clearTimers(): void {
    if (this.jobTimer) clearInterval(this.jobTimer)
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.jobTimer = undefined
    this.heartbeatTimer = undefined
    this.reconnectTimer = undefined
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
