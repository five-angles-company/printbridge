/* eslint-disable @typescript-eslint/no-unused-vars */
// src/services/encoders/epl-encoder.ts

import { LabelEncoder } from './label-encoder'

export class EplEncoder implements LabelEncoder {
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
    this.lines.push('N')
    return this
  }

  setSpeed(speed: number): this {
    // EPL: Can't directly set speed in EPL, but some models support "q" for print speed
    // We'll store as comment for unsupported cases
    this.lines.push(`q${speed}`)
    return this
  }

  setDensity(density: number): this {
    // EPL: Set print darkness (D0 - D15)
    this.lines.push(`D${density}`)
    return this
  }

  text(
    x: number | 'center',
    y: number | 'center',
    font: string | number = 3,
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
    this.lines.push(`A${posX},${posY},${rot},${font},${xMul},${yMul},N,"${content}"`)
    return this
  }

  barcode(
    x: number | 'center',
    y: number | 'center',
    type = '3',
    height = 100,
    _readable = 1,
    rot = 0,
    narrow = 2,
    wide = 2,
    content = ''
  ): this {
    const width = content.length * 16
    const posX = this.resolveX(x, width)
    const posY = this.resolveY(y, height)
    this.lines.push(`B${posX},${posY},${rot},${type},${narrow},${wide},${height},N,"${content}"`)
    return this
  }

  print(copies = 1): this {
    this.lines.push(`P${copies}`)
    return this
  }

  getBuffer(): Buffer {
    return Buffer.from(this.lines.join('\n'), 'ascii')
  }
}
