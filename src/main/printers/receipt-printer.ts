import puppeteer from 'puppeteer'
import { BasePrinter } from './base-printer'
import path from 'path'
import { writeFileSync } from 'fs'
import ejs from 'ejs'
import { EscPosEncoder } from '../encoders/escpos-encoder'
import { Printer, PrintJob } from '../../shared/types/db-types'

export class ReceiptPrinter extends BasePrinter {
  async print(printer: Printer, job: PrintJob): Promise<void> {
    const imageBuffer = await this.renderHtmlToImage(this.RECEIPT_TEMPLATE_PATH)

    const encoder = new EscPosEncoder().initialize()
    await encoder.image(imageBuffer)

    const escposData = encoder.feed(6).cut().getBuffer()
    await this.printRawJob(printer.name, escposData, job.name)
  }

  private async renderHtmlToImage(htmlFileName: string, data?: any): Promise<Buffer> {
    const templatePath = path.join(process.cwd(), htmlFileName)
    const html = await ejs.renderFile(templatePath, data, { async: true })

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
    writeFileSync('screenshot.png', screenshot)

    await browser.close()

    return Buffer.from(screenshot)
  }
}
