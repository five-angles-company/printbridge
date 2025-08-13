import puppeteer from 'puppeteer'
import { BasePrinter } from './base-printer'
import ejs from 'ejs'
import QRCode from 'qrcode'
import { EscPosEncoder } from '../encoders/escpos-encoder'
import { PrinterWithSettings } from '../../shared/types/db-types'
import {
  ReceiptPrinterData,
  ReceiptPrinterSettingsSchema
} from '../../shared/schemas/receipt-printer'

export class ReceiptPrinter extends BasePrinter {
  async print(
    printer: PrinterWithSettings,
    data: ReceiptPrinterData,
    jobName: string
  ): Promise<void> {
    const settings = ReceiptPrinterSettingsSchema.parse(
      JSON.parse(printer.printerSettings?.settings || '')
    )
    const imageBuffer = await this.renderHtmlToImage(this.RECEIPT_TEMPLATE_PATH, data)

    const encoder = new EscPosEncoder().initialize()
    await encoder.image(imageBuffer, settings.paper_size)

    const escposData = encoder.feed(6).cut(settings.cut).beep(settings.beep).getBuffer()
    await this.printRawJob(printer.name, escposData, jobName)
  }

  private async renderHtmlToImage(templatePath: string, data: ReceiptPrinterData): Promise<Buffer> {
    const qrcode = await QRCode.toDataURL(data.clientId)

    const html = await ejs.renderFile(templatePath, { data, qrcode }, { async: true })

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()

    await page.setContent(html, { waitUntil: 'networkidle0' })

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: true
    })

    await browser.close()

    return Buffer.from(screenshot)
  }
}
