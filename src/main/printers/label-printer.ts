// src/services/printers/LabelPrinter.ts
import { PrinterWithSettings, PrintJob } from '../../shared/types/db-types'
import { TsplEncoder } from '../encoders/tspl-encoder'
import { BasePrinter } from './base-printer'

interface LabelPrinterData {
  productName: string
  barcode: string
}
export class LabelPrinter extends BasePrinter {
  async print(printer: PrinterWithSettings, job: PrintJob): Promise<void> {
    if (!job.data) throw new Error('No job data')
    const data = JSON.parse(job.data) as LabelPrinterData
    const settings = JSON.parse(printer.printerSettings.settings)
    const widthMm = settings?.width || 40
    const heightMm = settings?.height || 20

    const encoder = new TsplEncoder().start(widthMm, heightMm, 2)

    const labelWidthDots = Math.floor(widthMm * (203 / 25.4))
    const labelHeightDots = Math.floor(heightMm * (203 / 25.4))

    // Title - Pharmacy Name (top center)
    encoder.text('center', Math.floor(labelHeightDots * 0.2), '0', 0, 1, 1, 'Almoharib Pharmacy')

    // Subtitle - Drug Info
    encoder.text('center', Math.floor(labelHeightDots * 0.3), '0', 0, 1, 1, 'GASEC 20MG 28CAP')

    // Barcode
    encoder.barcode(
      'center',
      Math.floor(labelHeightDots * 0.4),
      '128',
      Math.floor(labelHeightDots * 0.3), // height ~30% of label
      0,
      0,
      2,
      0,
      '7640118193909'
    )

    // Barcode Text
    encoder.text('center', Math.floor(labelHeightDots * 0.75), '0', 0, 1, 1, data.barcode)

    // Price (bottom left)
    encoder.text(
      Math.floor(labelWidthDots * 0.03),
      Math.floor(labelHeightDots * 0.88),
      '0',
      0,
      1,
      1,
      'SR: 48.40'
    )

    // Date (bottom right)
    encoder.text(
      Math.floor(labelWidthDots * 0.7),
      Math.floor(labelHeightDots * 0.88),
      '0',
      0,
      1,
      1,
      '11.11.20'
    )

    // Finalize
    encoder.print(1)

    await this.printRawJob(printer.name, encoder.getBuffer(), 'Node Print Job')
  }
}
