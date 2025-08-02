import EventEmitter from 'events'
import { eq } from 'drizzle-orm'
import { LoggerService } from './logger-service'
import { ReceiptPrinter } from '../printers/receipt-printer'
import { LabelPrinter } from '../printers/label-printer'
import { db } from '../../db'
import { printers, printJobs } from '../../db/schema'
import { NewPrintJob, PrintJob } from '../../shared/types/db-types'

type PrinterType = 'receipt' | 'label'
type JobStatus = 'pending' | 'completed' | 'failed'

interface PrintResult {
  success: boolean
  jobId: number
  error?: string
}

interface JobFilters {
  status?: JobStatus
  printerName?: string
  type?: PrinterType
  limit?: number
  offset?: number
}

export class PrintJobService extends EventEmitter {
  private isRunning = false

  constructor(
    private readonly logger: LoggerService,
    private readonly receiptPrinter: ReceiptPrinter,
    private readonly labelPrinter: LabelPrinter
  ) {
    super()
  }

  // Lifecycle
  initialize(): this {
    if (this.isRunning) return this
    this.isRunning = true
    this.logger.info('Print service initialized')
    return this
  }

  stop(): this {
    if (!this.isRunning) return this
    this.isRunning = false
    this.removeAllListeners()
    this.logger.info('Print service stopped')
    return this
  }

  get running(): boolean {
    return this.isRunning
  }

  // Core Operations
  async execute(printerName: string, jobData: NewPrintJob): Promise<PrintResult> {
    this.ensureRunning()

    try {
      const printer = await this.findPrinter(printerName)
      const job = await db.insert(printJobs).values(jobData).returning().get()

      const result = await this.print(printer, job)
      await this.updateStatus(job.id, result.success ? 'completed' : 'failed', result.error)

      this.emit('job:completed', { jobId: job.id, printerName, ...result })
      return { ...result, jobId: job.id }
    } catch (error) {
      this.logger.error('Print execution failed:', error)
      this.emit('job:failed', { printerName, error })
      throw error
    }
  }

  async retry(jobId: number): Promise<PrintResult> {
    this.ensureRunning()

    const job = await this.getJob(jobId)
    if (job.status === 'completed') {
      throw new Error('Job already completed')
    }

    await this.updateStatus(jobId, 'pending')

    try {
      const printer = await this.findPrinter(job.printer.name)
      const result = await this.print(printer, job)

      await this.updateStatus(jobId, result.success ? 'completed' : 'failed', result.error)
      this.emit('job:retried', { jobId, ...result })

      return { ...result, jobId }
    } catch (error) {
      await this.updateStatus(jobId, 'failed', 'Retry failed')
      throw error
    }
  }

  async cancel(jobId: number) {
    const job = await this.getJob(jobId)
    if (job.status === 'completed') {
      throw new Error('Cannot cancel completed job')
    }

    await this.updateStatus(jobId, 'failed', 'Cancelled')
    this.emit('job:cancelled', { jobId })
    return job
  }

  // CRUD Operations
  async getJobs(filters: JobFilters = {}) {
    let query = db.select().from(printJobs)

    if (filters.status) query = query.where(eq(printJobs.status, filters.status)) as any
    if (filters.type) query = query.where(eq(printJobs.type, filters.type)) as any
    if (filters.limit) query = query.limit(filters.limit) as any
    if (filters.offset) query = query.offset(filters.offset) as any

    return query.all()
  }

  async getJob(jobId: number) {
    const job = await db.query.printJobs.findFirst({
      where: eq(printJobs.id, jobId),
      with: {
        printer: true
      }
    })
    if (!job) throw new Error(`Job ${jobId} not found`)
    return job
  }

  async createJob(jobData: NewPrintJob) {
    return db.insert(printJobs).values(jobData).returning().get()
  }

  async updateJob(
    jobId: number,
    updates: Partial<{
      status: JobStatus
      error: string | null
      data: string
      priority: number
    }>
  ) {
    return db.update(printJobs).set(updates).where(eq(printJobs.id, jobId)).returning().get()
  }

  async deleteJob(jobId: number) {
    return db.delete(printJobs).where(eq(printJobs.id, jobId)).returning().get()
  }

  async getStats() {
    const jobs = await db.select({ status: printJobs.status }).from(printJobs)
    const byStatus = jobs.reduce(
      (acc, { status }) => {
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<JobStatus, number>
    )

    return { total: jobs.length, byStatus }
  }

  // Private Helpers
  private ensureRunning() {
    if (!this.isRunning) throw new Error('Service not running')
  }

  private async findPrinter(name: string) {
    const printer = await db.query.printers.findFirst({
      where: eq(printers.name, name)
    })
    if (!printer) throw new Error(`Printer '${name}' not found`)
    return printer
  }

  private async print(printer: any, job: PrintJob): Promise<{ success: boolean; error?: string }> {
    if (!job.data) throw new Error('No job data')
    if (printer.type !== job.type) {
      throw new Error(`Type mismatch: ${printer.type} != ${job.type}`)
    }

    try {
      if (printer.type === 'receipt') {
        await this.receiptPrinter.print(printer.name, job)
      } else if (printer.type === 'label') {
        await this.labelPrinter.print(printer.name, job)
      } else {
        throw new Error(`Unsupported type: ${printer.type}`)
      }

      this.logger.info(`${printer.type} printed on ${printer.name}`)
      return { success: true }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Print failed'
      this.logger.error(`Print failed on ${printer.name}:`, error)
      return { success: false, error: message }
    }
  }

  private async updateStatus(jobId: number, status: JobStatus, error?: string) {
    await db
      .update(printJobs)
      .set({
        status,
        error: error || null,
        ...(status === 'completed' && { completedAt: Date.now() })
      })
      .where(eq(printJobs.id, jobId))
  }
}
