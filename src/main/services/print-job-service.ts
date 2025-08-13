import EventEmitter from 'events'
import { eq } from 'drizzle-orm'
import { LoggerService } from './logger-service'
import { ReceiptPrinter } from '../printers/receipt-printer'
import { LabelPrinter } from '../printers/label-printer'
import { db } from '../../db'
import { printJobs } from '../../db/schema'
import { NewPrintJob, PrinterWithSettings, PrintJob } from '../../shared/types/db-types'
import { ReceiptPrinterData, ReceiptPrinterDataSchema } from '../../shared/schemas/receipt-printer'
import { LabelPrinterData, LabelPrinterDataSchema } from '../../shared/schemas/label-printer'

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
  async execute(printer: PrinterWithSettings, jobData: NewPrintJob): Promise<PrintResult> {
    this.ensureRunning()

    try {
      const job = await db.insert(printJobs).values(jobData).returning().get()
      const result = await this.print(printer, job)
      await this.updateStatus(job.id, result.success ? 'completed' : 'failed', result.error)

      this.emit('job:completed', { jobId: job.id, printerName: printer.name, ...result })
      return { ...result, jobId: job.id }
    } catch (error) {
      this.logger.error('Print execution failed:', error)
      this.emit('job:failed', { printerName: printer.name, error })
      throw error
    }
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

  // Private Helpers
  private ensureRunning() {
    if (!this.isRunning) throw new Error('Service not running')
  }

  private async print(
    printer: PrinterWithSettings,
    job: PrintJob
  ): Promise<{ success: boolean; error?: string }> {
    if (!job.data) throw new Error('No job data')
    if (printer.type !== job.type) {
      throw new Error(`Type mismatch: ${printer.type} != ${job.type}`)
    }
    let printData: ReceiptPrinterData | LabelPrinterData

    try {
      if (printer.type === 'receipt') {
        printData = ReceiptPrinterDataSchema.parse(JSON.parse(job.data))
        await this.receiptPrinter.print(printer, printData, job.name)
      } else if (printer.type === 'label') {
        printData = LabelPrinterDataSchema.parse(JSON.parse(job.data))
        await this.labelPrinter.print(printer, printData, job.name)
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
