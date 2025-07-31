// src/services/printers/LabelPrinter.ts
import { TsplEncoder } from '../encoders/tspl-encoder'
import { BasePrinter } from './base-printer'

interface LabelPrinterData {
  productName: string
  barcode: string
}
export class LabelPrinter extends BasePrinter {
  async print(printerName: string, data: LabelPrinterData): Promise<void> {
    const { productName, barcode } = data
    console.log('Printing label for', productName)
    const encoder = new TsplEncoder()
      .start(40, 20, 2)
      .barcode(50, 30, '128', 80, 1, 0, 2, 2, barcode)
      .print(5)

    await this.printRawJob(printerName, encoder.getBuffer(), 'Node Print Job')
  }
}
