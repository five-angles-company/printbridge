import { EventEmitter } from 'events'
import https from 'https'
import http from 'http'

import { LoggerService } from './logger-service'
import { PrintJobService } from './print-job-service'
import { SettingsService } from './settings-service'
import { PrinterWithSettings } from '../../shared/types/db-types'
import { PrintJobData } from '../../shared/types/api-types'

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export class ApiService extends EventEmitter {
  private running = false
  private connected = false
  private processing = false
  private failureCount = 0
  private pollTimer?: NodeJS.Timeout

  private apiKey = ''
  private serverUrl = ''
  private clientId = ''
  private receiptPrinter?: PrinterWithSettings | null
  private labelPrinter?: PrinterWithSettings | null

  constructor(
    private readonly logger: LoggerService,
    private readonly printJobService: PrintJobService,
    private readonly settingsService: SettingsService
  ) {
    super()
    this.settingsService.on('settings:updated', () => {
      this.logger.info('Settings updated — restarting API service')
      this.restart().catch((err) => this.logger.error('Restart failed:', err))
    })
  }

  /** Public lifecycle */
  async initialize(): Promise<void> {
    this.logger.info('Initializing API Service...')
    await this.loadSettings()
    this.running = true
    this.startPolling()
    this.logger.info('API Service started')
  }

  async stop(): Promise<void> {
    if (!this.running) return
    this.running = false
    if (this.pollTimer) clearInterval(this.pollTimer)
    while (this.processing) await this.sleep(50)
    this.connected = false
    this.logger.info('API Service stopped')
    this.emit('service:stopped')
  }

  async restart(): Promise<void> {
    const wasRunning = this.running
    await this.stop()
    await this.loadSettings()
    if (wasRunning) await this.initialize()
  }

  /** Main polling loop (also heartbeat) */
  private startPolling(): void {
    if (this.pollTimer) clearInterval(this.pollTimer)

    this.pollTimer = setInterval(async () => {
      if (!this.running || this.processing) return
      this.processing = true

      if (!this.hasConfig()) {
        this.logger.warn('Missing configuration — retrying later...')
        this.processing = false
        return
      }

      try {
        // This call acts as both heartbeat & job poll
        const res = await this.request<{ jobs: PrintJobData[] }>(
          'GET',
          `/api/bridge/jobs?clientId=${this.clientId}`
        )
        if (!res.success) throw new Error(res.error || 'Polling failed')

        if (!this.connected) {
          this.connected = true
          this.failureCount = 0
          this.logger.info('Connected to API server')
          this.emit('connection:established')
        }

        const jobs = res.data?.jobs || []
        for (const job of jobs) {
          if (!this.running) break
          await this.processJob(job)
        }
      } catch (err) {
        this.connected = false
        this.logger.warn('Connection lost:', err)
        this.emit('connection:lost')
        this.scheduleReconnect()
      } finally {
        this.processing = false
      }
    }, 3000)
  }

  private scheduleReconnect(): void {
    this.failureCount++
    const delay = Math.min(this.failureCount * 2000, 30000)
    this.logger.info(`Reconnecting in ${delay}ms...`)
    setTimeout(() => {
      if (!this.running) return
      // Just let the next poll attempt handle reconnection
    }, delay)
  }

  /** Job processing */
  private async processJob(job: PrintJobData): Promise<void> {
    try {
      const printer = job.type === 'label' ? this.labelPrinter : this.receiptPrinter
      console.log(printer)
      if (!printer) throw new Error(`No ${job.type} printer configured`)
      await this.printJobService.execute(printer, {
        name: job.name,
        type: job.type,
        data: job.data,
        printerId: printer.id,
        createdAt: Date.now()
      })

      await this.request('POST', `/api/bridge/jobs/${job.id}/complete`)
      this.emit('job:success', job)
      this.logger.info(`Job completed: ${job.name}`)
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error'
      try {
        await this.request('POST', `/api/bridge/jobs/${job.id}/fail`, { reason })
      } catch (reportErr) {
        this.logger.error('Failed to report job failure:', reportErr)
      }
      this.emit('job:failure', job, reason)
      this.logger.error(`Job failed: ${job.name}`, err)
    }
  }

  /** HTTP helper */
  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.serverUrl)
    const client = url.protocol === 'https:' ? https : http
    const data = body ? JSON.stringify(body) : undefined

    return new Promise((resolve, reject) => {
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
          },
          timeout: 10000
        },
        (res) => {
          let raw = ''
          res.on('data', (chunk) => (raw += chunk))
          res.on('end', () => {
            try {
              resolve(JSON.parse(raw))
            } catch {
              this.logger.error('Invalid JSON response:', raw)
              reject(new Error('Invalid response from server'))
            }
          })
        }
      )
      req.on('error', reject)
      if (data) req.write(data)
      req.end()
    })
  }

  /** Settings */
  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.settingsService.loadSettings()
      this.apiKey = settings?.apiKey || ''
      this.serverUrl = settings?.serverUrl || ''
      this.clientId = settings?.clientId || ''
      this.receiptPrinter = settings?.receiptPrinter
      this.labelPrinter = settings?.barcodePrinter
      this.logger.info('Settings loaded successfully')
    } catch (err) {
      this.logger.error('Failed to load settings:', err)
    }
  }

  private hasConfig(): boolean {
    return Boolean(this.apiKey && this.serverUrl && this.clientId)
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
