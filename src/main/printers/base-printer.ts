import { printRaw } from '../utils/windows-printing'

// BasePrinter.ts
export abstract class BasePrinter {
  abstract print(printerName: string, data: unknown): Promise<void>

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
