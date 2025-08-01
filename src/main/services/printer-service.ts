import EventEmitter from 'events'
import { eq, sql } from 'drizzle-orm'
import { LoggerService } from './logger-service'
import { db } from '../../db'
import { printers, printerSettings } from '../../db/schema'
import { checkPrinterStatus } from '../utils/windows-printing'
import { UpdatePrinter } from '../../shared/types/db-types'

interface PrinterStatus {
  online: boolean
  error: string
}

export class PrinterService extends EventEmitter {
  private monitoringInterval?: NodeJS.Timeout
  private isRunning = false

  constructor(private readonly logger: LoggerService) {
    super()
  }

  // ===========================
  // LIFECYCLE METHODS
  // ===========================

  public initialize(): this {
    if (this.isRunning) {
      this.logger.warn('Printer service already initialized')
      return this
    }

    this.logger.info('Printer service initialized')
    this.isRunning = true

    // Start periodic monitoring
    this.startMonitoring()

    return this
  }

  public stop(): this {
    if (!this.isRunning) {
      this.logger.warn('Printer service already stopped')
      return this
    }

    this.logger.info('Printer service stopped')

    // Clean up interval
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }

    // Remove all listeners
    this.removeAllListeners()
    this.isRunning = false

    return this
  }

  private startMonitoring() {
    // Run immediately
    this.monitorPrinterStatus().catch((err) =>
      this.logger.error('Initial printer monitoring failed:', err)
    )

    // Then run every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.monitorPrinterStatus().catch((err) =>
        this.logger.error('Printer monitoring failed:', err)
      )
    }, 2000)
  }

  // ===========================
  // CRUD OPERATIONS
  // ===========================

  async getPrinters() {
    return await db.query.printers.findMany({
      with: {
        printerSettings: true
      }
    })
  }

  async createPrinter(printerName: string, printerType: 'receipt' | 'a4' | 'label') {
    return await db
      .insert(printers)
      .values({ name: printerName, type: printerType })
      .returning()
      .get()
  }

  async updatePrinter(printerId: number, data: UpdatePrinter) {
    return await db.update(printers).set(data).where(eq(printers.id, printerId)).returning().get()
  }

  async updatePrinterSettings(printerId: number, settings: any) {
    console.log('Updating printer settings', printerId, settings)
    return await db
      .insert(printerSettings)
      .values({
        printerId,
        settings: JSON.stringify(settings)
      })
      .onConflictDoUpdate({
        target: [printerSettings.printerId],
        set: { settings: sql`excluded.settings` }
      })
      .returning()
  }

  async deletePrinter(printerId: number) {
    return await db.delete(printers).where(eq(printers.id, printerId)).returning().get()
  }

  // ===========================
  // MONITORING
  // ===========================

  async monitorPrinterStatus() {
    if (!this.isRunning) {
      return
    }

    try {
      const printerList = await this.getPrinters()

      for (const printer of printerList) {
        const currentStatus = await this.getPrinterStatus(printer.name)

        if (currentStatus.online !== printer.online) {
          await db
            .update(printers)
            .set({ online: currentStatus.online })
            .where(eq(printers.name, printer.name))

          this.emit('printer:status-changed', {
            ...printer,
            online: currentStatus.online,
            previousStatus: printer.online
          })

          this.logger.info(
            `Printer ${printer.name} status changed: ${printer.online ? 'offline' : 'online'} -> ${currentStatus.online ? 'online' : 'offline'}`
          )
        }
      }
    } catch (error) {
      this.logger.error('Error during printer status monitoring:', error)
      this.emit('printer:monitoring-error', error)
    }
  }

  // ===========================
  // PRIVATE UTILITIES
  // ===========================

  private async getPrinterStatus(printerName: string): Promise<PrinterStatus> {
    if (!printerName) {
      throw new Error('Printer name is required')
    }

    return new Promise((resolve, reject) => {
      checkPrinterStatus({ printerName }, (err: Error, result: unknown) => {
        if (err) {
          return reject(err)
        }

        if (!result || typeof result !== 'object') {
          return reject(new Error('Invalid printer status result'))
        }

        resolve(result as PrinterStatus)
      })
    })
  }
}
