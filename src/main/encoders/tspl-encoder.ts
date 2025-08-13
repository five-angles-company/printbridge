// src/services/encoders/tspl-encoder.ts

import { LabelEncoder } from './label-encoder'

export class TsplEncoder implements LabelEncoder {
  private lines: string[] = []
  private labelWidth = 800
  private labelHeight = 600
  private dpi = 203

  constructor(dpi = 203) {
    this.dpi = dpi
  }

  private resolveX(x: number | 'center', width: number) {
    return x === 'center' ? Math.floor((this.labelWidth - width) / 2) : x
  }

  private resolveY(y: number | 'center', height: number) {
    return y === 'center' ? Math.floor((this.labelHeight - height) / 2) : y
  }

  start(widthMm = 40, heightMm = 20, gapMm = 2): this {
    this.labelWidth = Math.floor(widthMm * (this.dpi / 25.4))
    this.labelHeight = Math.floor(heightMm * (this.dpi / 25.4))
    this.lines.push(`SIZE ${widthMm} mm, ${heightMm} mm`)
    this.lines.push(`GAP ${gapMm} mm, 0`)
    this.lines.push('DENSITY 8')
    this.lines.push('DIRECTION 1')
    this.lines.push('REFERENCE 0,0')
    this.lines.push('CLS')
    return this
  }

  setSpeed(speed: number): this {
    // TSPL: SPEED n  (n = 1 to 5 or printer supported range)
    this.lines.push(`SPEED ${speed}`)
    return this
  }

  setDensity(density: number): this {
    // TSPL: DENSITY n  (n = 0 to 15)
    this.lines.push(`DENSITY ${density}`)
    return this
  }

  text(
    x: number | 'center',
    y: number | 'center',
    font: string | number = '0',
    rot = 0,
    xMul = 1,
    yMul = 1,
    content = ''
  ): this {
    const charWidth = 8 * xMul
    const charHeight = 12 * yMul
    const width = content.length * charWidth
    const height = charHeight
    const posX = this.resolveX(x, width)
    const posY = this.resolveY(y, height)
    this.lines.push(`TEXT ${posX},${posY},"${font}",${rot},${xMul},${yMul},"${content}"`)
    return this
  }

  barcode(
    x: number | 'center',
    y: number | 'center',
    type = '128',
    height = 100,
    readable = 1,
    rot = 0,
    narrow = 2,
    wide = 0,
    content = ''
  ): this {
    const modulesPerChar = 9
    const barcodeWidth = content.length * modulesPerChar * narrow
    const posX = this.resolveX(x, barcodeWidth)
    const posY = this.resolveY(y, height)
    this.lines.push(
      `BARCODE ${posX},${posY},"${type}",${height},${readable},${rot},${narrow},${wide},"${content}"`
    )
    return this
  }

  qrcode(x: number | 'center', y: number | 'center', ecc = 'L', cellWidth = 4, content = ''): this {
    const size = 21 * cellWidth
    const posX = this.resolveX(x, size)
    const posY = this.resolveY(y, size)
    this.lines.push(`QRCODE ${posX},${posY},${ecc},${cellWidth},A,0,"${content}"`)
    return this
  }

  print(copies = 1): this {
    this.lines.push(`PRINT ${copies}`)
    return this
  }

  getBuffer(): Buffer {
    return Buffer.from(this.lines.join('\r\n') + '\r\n', 'ascii')
  }
}
