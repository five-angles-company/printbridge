import sharp from 'sharp'

export class EscPosEncoder {
  private commands: Buffer[] = []

  initialize(): this {
    return this.command([0x1b, 0x40]) // ESC @
  }

  text(text: string): this {
    this.commands.push(Buffer.from(text, 'ascii'))
    return this
  }

  line(text = ''): this {
    return this.text(text + '\n')
  }

  align(position: 'left' | 'center' | 'right'): this {
    const map = { left: 0, center: 1, right: 2 }
    return this.command([0x1b, 0x61, map[position]])
  }

  bold(on = true): this {
    return this.command([0x1b, 0x45, on ? 1 : 0])
  }

  feed(lines = 1): this {
    return this.command([0x1b, 0x64, lines])
  }

  cut(on = true): this {
    if (!on) return this
    return this.command([0x1d, 0x56, 0x00])
  }

  beep(on = true, times = 3, duration = 6): this {
    if (!on) return this
    // Clamp values to valid ranges
    const n = Math.max(1, Math.min(times, 9))
    const t = Math.max(1, Math.min(duration, 9))
    return this.command([0x1b, 0x42, n, t])
  }

  private command(bytes: number[]): this {
    this.commands.push(Buffer.from(bytes))
    return this
  }

  /**
   * Add an image to the print buffer.
   * @param imageBuffer Input image (PNG, JPG, etc.)
   * @param widthMm Width in millimeters (default 48mm for 58mm paper)
   * @param threshold Grayscale threshold for B/W (default 160)
   * @param dpi Printer resolution (default 203)
   */
  async image(imageBuffer: Buffer, widthMm = 72, threshold = 160, dpi = 203): Promise<this> {
    try {
      const pixels = Math.round((widthMm / 25.4) * dpi) // mm to pixels
      const bitmap = await this.imageToRaster(imageBuffer, pixels, threshold)

      this.command([
        0x1d,
        0x76,
        0x30,
        0x00,
        bitmap.widthBytes & 0xff,
        (bitmap.widthBytes >> 8) & 0xff,
        bitmap.height & 0xff,
        (bitmap.height >> 8) & 0xff
      ])
      this.commands.push(Buffer.from(bitmap.data))
    } catch (err) {
      console.error('Image error:', err)
      this.line('[IMAGE ERROR]')
    }
    return this
  }

  private async imageToRaster(imageBuffer: Buffer, width: number, threshold: number) {
    const { data, info } = await sharp(imageBuffer)
      .resize({ width, fit: 'contain', kernel: sharp.kernel.lanczos3, background: 'white' })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const widthBytes = Math.ceil(info.width / 8)
    const output: number[] = []

    for (let y = 0; y < info.height; y++) {
      for (let xByte = 0; xByte < widthBytes; xByte++) {
        let byte = 0
        for (let bit = 0; bit < 8; bit++) {
          const x = xByte * 8 + bit
          if (x < info.width) {
            const i = y * info.width + x
            if (data[i] < threshold) byte |= 0x80 >> bit
          }
        }
        output.push(byte)
      }
    }

    return {
      width: info.width,
      height: info.height,
      widthBytes,
      data: output
    }
  }

  getBuffer(): Buffer {
    return Buffer.concat(this.commands)
  }
}
