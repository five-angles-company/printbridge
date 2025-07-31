// src/services/printers/builders/TsplBuilder.ts
export class TsplEncoder {
  private lines: string[] = []

  start(widthMm = 40, heightMm = 20, gapMm = 2): this {
    this.lines.push(`SIZE ${widthMm} mm, ${heightMm} mm`)
    this.lines.push(`GAP ${gapMm} mm, 0`)
    this.lines.push('DENSITY 8')
    this.lines.push('DIRECTION 1')
    this.lines.push('REFERENCE 0,0')
    this.lines.push('CLS') // clear image buffer
    return this
  }

  density(level: number): this {
    // TSPL density range: 0-15 (0 = lightest, 15 = darkest)
    if (level >= 0 && level <= 15) {
      this.lines.push(`DENSITY ${level}`)
    }
    return this
  }

  speed(speed: number): this {
    if (speed >= 1.0 && speed <= 14.0) {
      this.lines.push(`SPEED ${speed}`)
    }
    return this
  }

  text(x: number, y: number, font = '0', rotation = 0, xMul = 1, yMul = 1, content = ''): this {
    this.lines.push(`TEXT ${x},${y},"${font}",${rotation},${xMul},${yMul},"${content}"`)
    return this
  }

  barcode(
    x: number,
    y: number,
    type = '128',
    height = 100,
    readable = 1,
    rotation = 0,
    narrow = 2,
    wide = 2,
    content = ''
  ): this {
    this.lines.push(
      `BARCODE ${x},${y},"${type}",${height},${readable},${rotation},${narrow},${wide},"${content}"`
    )
    return this
  }

  qrcode(x: number, y: number, ecc = 'L', cellWidth = 4, content = 'testettt'): this {
    console.log('QRCODE', x, y, ecc, cellWidth, content)
    this.lines.push(`QRCODE ${x},${y},L,${cellWidth},A,0,"${content}"`)
    return this
  }

  print(copies = 1): this {
    this.lines.push(`PRINT ${copies}`)
    return this
  }

  getTspl(): string {
    return this.lines.join('\r\n') + '\r\n'
  }

  getBuffer(): Buffer {
    return Buffer.from(this.getTspl(), 'ascii')
  }
}
