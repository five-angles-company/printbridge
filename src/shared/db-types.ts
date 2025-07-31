// Enhanced types.ts with additional type definitions
import { printers, printerSettings, printJobs, settings } from '../db/schema'

// Base types
export type Printer = typeof printers.$inferSelect
export type NewPrinter = typeof printers.$inferInsert
export type UpdatePrinter = Partial<Omit<NewPrinter, 'id' | 'createdAt'>>

export type PrinterSettings = typeof printerSettings.$inferSelect
export type NewPrinterSettings = typeof printerSettings.$inferInsert
export type UpdatePrinterSettings = Partial<
  Omit<NewPrinterSettings, 'id' | 'printerId' | 'createdAt'>
>

export type PrintJob = typeof printJobs.$inferSelect
export type NewPrintJob = typeof printJobs.$inferInsert
export type UpdatePrintJob = Partial<Omit<NewPrintJob, 'id' | 'createdAt'>>

export type Settings = typeof settings.$inferSelect
export type NewSettings = typeof settings.$inferInsert
export type UpdateSettings = Partial<Omit<NewSettings, 'id' | 'createdAt'>>

// Extended types with relations
export type PrinterWithSettings = Printer & {
  printerSettings: PrinterSettings
}

export type PrinterWithJobs = Printer & {
  printJobs: PrintJob[]
}

export type PrinterWithRelations = Printer & {
  printerSettings: PrinterSettings
  printJobs: PrintJob[]
}

export type PrintJobWithPrinter = PrintJob & {
  printer: Printer
}

export type SettingsWithPrinters = Settings & {
  barcodePrinter?: Printer
  receiptPrinter?: Printer
  regularPrinter?: Printer
}

// Utility types
export type PrinterType = 'receipt' | 'a4' | 'barcode'
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
export type JobType = 'receipt' | 'a4' | 'barcode'

// Query filters
export interface PrinterFilter {
  type?: PrinterType
  isActive?: boolean
  name?: string
}

export interface PrintJobFilter {
  printerId?: number
  status?: JobStatus
  jobType?: JobType
  dateFrom?: number
  dateTo?: number
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Print job creation helpers
export interface CreateReceiptJob {
  printerId: number
  data: {
    items: Array<{
      name: string
      quantity: number
      price: number
    }>
    total: number
    customerName?: string
    timestamp: number
  }
  priority?: number
}

export interface CreateBarcodeJob {
  printerId: number
  data: {
    code: string
    format: 'CODE128' | 'CODE39' | 'EAN13' | 'QR'
    width?: number
    height?: number
  }
  priority?: number
}

export interface CreateA4Job {
  printerId: number
  data: {
    content: string
    format: 'html' | 'pdf' | 'text'
    orientation?: 'portrait' | 'landscape'
    margins?: {
      top: number
      right: number
      bottom: number
      left: number
    }
  }
  priority?: number
}

// Configuration types
export interface PrinterConfiguration {
  [key: string]: string | number | boolean
}
