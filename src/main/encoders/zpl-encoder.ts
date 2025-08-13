/* eslint-disable @typescript-eslint/no-unused-vars */
// src/services/encoders/zpl-encoder.ts

import { LabelEncoder } from './label-encoder'

export class ZplEncoder implements LabelEncoder {
  private lines: string[] = []
  private labelWidth = 800
  private labelHeight = 600

  constructor(labelWidth = 800, labelHeight = 600) {
    this.labelWidth = labelWidth
    this.labelHeight = labelHeight
  }

  private resolveX(x: number | 'center', width: number) {
    return x === 'center' ? Math.floor((this.labelWidth - width) / 2) : x
  }

  private resolveY(y: number | 'center', height: number) {
    return y === 'center' ? Math.floor((this.labelHeight - height) / 2) : y
  }

  start(_widthMm = 40, _heightMm = 20, _gapMm = 2): this {
    this.lines.push('^XA')
    return this
  }

  setSpeed(speed: number): this {
    // ZPL: ^PRp  (p = 0-30 cm/sec depending on model)
    this.lines.push(`^PR${speed}`)
    return this
  }

  setDensity(density: number): this {
    // ZPL: ^MDn  (n = -30 to +30, default 0)
    this.lines.push(`^MD${density}`)
    return this
  }

  text(
    x: number | 'center',
    y: number | 'center',
    font: string | number = 'A',
    _rot = 0,
    xMul = 50,
    yMul = 50,
    content = ''
  ): this {
    const width = content.length * xMul
    const height = yMul
    const posX = this.resolveX(x, width)
    const posY = this.resolveY(y, height)
    this.lines.push(`^FO${posX},${posY}`)
    this.lines.push(`^A${font},${yMul},${xMul}`)
    this.lines.push(`^FD${content}^FS`)
    return this
  }

  barcode(
    x: number | 'center',
    y: number | 'center',
    type = 'BC',
    height = 100,
    readable = 1,
    _rot = 0,
    _narrow = 2,
    _wide = 2,
    content = ''
  ): this {
    const width = content.length * 16
    const posX = this.resolveX(x, width)
    const posY = this.resolveY(y, height)
    this.lines.push(`^FO${posX},${posY}`)
    this.lines.push(`^B${type},${height},${readable ? 'Y' : 'N'},N,N`)
    this.lines.push(`^FD${content}^FS`)
    return this
  }

  qrcode(
    x: number | 'center',
    y: number | 'center',
    _ecc = 'L',
    cellWidth = 4,
    content = ''
  ): this {
    const size = cellWidth * 21
    const posX = this.resolveX(x, size)
    const posY = this.resolveY(y, size)
    this.lines.push(`^FO${posX},${posY}`)
    this.lines.push(`^BQN,2,${cellWidth}`)
    this.lines.push(`^FDLA,${content}^FS`)
    return this
  }

  print(copies = 1): this {
    this.lines.push(`^PQ${copies}`)
    this.lines.push('^XZ')
    return this
  }

  getBuffer(): Buffer {
    return Buffer.from(this.lines.join('\n'), 'ascii')
  }
}
