import path from 'path'
import { Printer } from '../../shared/types/db-types'
import { printRaw } from '../utils/windows-printing'
import { ReceiptPrinterData } from '../../shared/schemas/receipt-printer'
import { LabelPrinterData } from '../../shared/schemas/label-printer'

// BasePrinter.ts
export abstract class BasePrinter {
  protected readonly RECEIPT_TEMPLATE_PATH = path.join(__dirname, '../../resources', 'receipt.ejs')

  abstract print(
    Printer: Printer,
    data: ReceiptPrinterData | LabelPrinterData,
    jobName: string
  ): Promise<void>

  printRawJob(printerName: string, data: Buffer, jobName = 'Node Print Job') {
    if (!printerName) throw new Error('Printer name is required')
    if (!Buffer.isBuffer(data)) throw new Error('Print data must be a Buffer')

    return new Promise((resolve, reject) => {
      printRaw({ printerName, data, jobName }, (error, result) => {
        if (error) return reject(error)
        if (
          !result ||
          typeof result !== 'object' ||
          !('jobId' in result) ||
          !('bytesWritten' in result) ||
          !('success' in result)
        ) {
          return reject(new Error('Invalid print job result'))
        }
        resolve(result)
      })
    })
  }
}
