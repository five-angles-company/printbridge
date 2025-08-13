// src/services/printers/LabelPrinter.ts
import { LabelPrinterData, LabelPrinterSettingsSchema } from '../../shared/schemas/label-printer'
import { PrinterWithSettings } from '../../shared/types/db-types'
import { EplEncoder } from '../encoders/epl-encoder'
import { LabelEncoder } from '../encoders/label-encoder'
import { TsplEncoder } from '../encoders/tspl-encoder'
import { ZplEncoder } from '../encoders/zpl-encoder'
import { BasePrinter } from './base-printer'

type EncoderConstructor = new () => LabelEncoder

const ENCODER_MAP: Record<string, EncoderConstructor> = {
  TSPL: TsplEncoder,
  ZPL: ZplEncoder,
  EPL: EplEncoder
}

export class LabelPrinter extends BasePrinter {
  async print(
    printer: PrinterWithSettings,
    data: LabelPrinterData,
    jobName: string
  ): Promise<void> {
    const settings = LabelPrinterSettingsSchema.parse(
      JSON.parse(printer.printerSettings?.settings || '')
    )

    const widthMm = settings?.label_width || 40
    const heightMm = settings?.label_height || 20

    const encoder = this.getEncoder(settings.encoder)
      .start(settings.label_width, settings.label_height, settings.print_density)
      .setSpeed(settings.print_speed)
      .setDensity(settings.print_density)

    const labelWidthDots = Math.floor(widthMm * (203 / 25.4))
    const labelHeightDots = Math.floor(heightMm * (203 / 25.4))

    // Title - Pharmacy Name (top center)
    encoder.text('center', Math.floor(labelHeightDots * 0.1), '0', 0, 1, 1, data.brand)

    // Subtitle - Drug Info
    encoder.text('center', Math.floor(labelHeightDots * 0.2), '0', 0, 1, 1, data.productName)

    // Barcode
    encoder.barcode(
      'center',
      Math.floor(labelHeightDots * 0.3),
      '128',
      Math.floor(labelHeightDots * 0.3), // height ~30% of label
      0,
      0,
      2,
      0,
      data.barcode
    )

    // Barcode Text
    encoder.text('center', Math.floor(labelHeightDots * 0.65), '0', 0, 1, 1, data.barcode)

    // Price (bottom left)
    encoder.text(
      Math.floor(labelWidthDots * 0.03),
      Math.floor(labelHeightDots * 0.78),
      '0',
      0,
      1,
      1,
      'SR: 48.40'
    )

    // Date (bottom right)
    encoder.text(
      Math.floor(labelWidthDots * 0.68),
      Math.floor(labelHeightDots * 0.78),
      '0',
      0,
      1,
      1,
      data.expiry
    )

    // Finalize
    encoder.print(data.copies)

    await this.printRawJob(printer.name, encoder.getBuffer(), jobName)
  }

  private getEncoder(encoderType: string) {
    const EncoderClass = ENCODER_MAP[encoderType]
    if (!EncoderClass) {
      throw new Error(`Unsupported encoder type: ${encoderType}`)
    }
    return new EncoderClass()
  }
}
