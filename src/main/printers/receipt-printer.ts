import puppeteer from 'puppeteer'
import { BasePrinter } from './base-printer'
import path from 'path'
import { writeFileSync } from 'fs'
import ejs from 'ejs'
import { EscPosEncoder } from '../encoders/escpos-encoder'

export class ReceiptPrinter extends BasePrinter {
  async print(printerName: string, htmlFileName: string): Promise<void> {
    const imageBuffer = await this.renderHtmlToImage(htmlFileName)

    const encoder = new EscPosEncoder().initialize()
    await encoder.image(imageBuffer)

    const escposData = encoder.feed(6).cut().getBuffer()
    await this.printRawJob(printerName, escposData)
  }

  private async renderHtmlToImage(htmlFileName: string, data?: any): Promise<Buffer> {
    const receiptData = {
      branchEn: 'Al Majmaa Branch',
      branchCode: '01',
      branchAr: 'فرع المجمعة',
      vatNumber: '310432040400003',
      receiptNumber: 'PHI-20299',
      dateTime: '25.March.2025 10:25 PM',
      phoneNumber: '126485237',
      userId: 10,

      items: [
        {
          nameEn: 'Panadol Cold + Flu Vapour Release',
          nameAr: 'بانادول كولد + فلو أقراص البخاريه',
          vat: 0,
          quantity: '1 Pack',
          price: 8.0,
          total: 8.0,
          vatAmount: 0
        },
        {
          nameEn: 'Panadol Cold + Flu Vapour Release',
          nameAr: 'بانادول كولد + فلو أقراص البخاريه',
          vat: 0,
          quantity: '1 Pack',
          price: 8.0,
          total: 8.0,
          vatAmount: 0
        },
        {
          nameEn: 'Panadol Cold + Flu Vapour Release',
          nameAr: 'بانادول كولد + فلو أقراص البخاريه',
          vat: 15,
          quantity: '1 Pack',
          price: 8.0,
          total: 8.0,
          vatAmount: 1.2
        }
      ],

      totalQuantity: 3,
      totalWithoutVAT: 24.0,
      totalVAT: 1.2,
      totalWithVAT: 25.2,
      spanAmount: 20.2,
      cashAmount: 5.0
    }

    const templatePath = path.join(process.cwd(), htmlFileName)
    const html = await ejs.renderFile(templatePath, data || receiptData, { async: true })

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
