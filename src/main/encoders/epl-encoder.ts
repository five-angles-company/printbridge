export class EplEncoder {
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

  start(): this {
    this.lines.push('N') // clear image buffer
    return this
  }

  text(x: number | 'center', y: number | 'center', font = 3, rotation = 0, content = ''): this {
    const charWidth = 8
    const charHeight = 12
    const width = charWidth * content.length
    const height = charHeight
    const posX = this.resolveX(x, width)
    const posY = this.resolveY(y, height)
    this.lines.push(`A${posX},${posY},${rotation},${font},1,1,N,"${content}"`)
    return this
  }

  barcode(
    x: number | 'center',
    y: number | 'center',
    type = '3',
    height = 100,
    content = ''
  ): this {
    const width = content.length * 16
    const posX = this.resolveX(x, width)
    const posY = this.resolveY(y, height)
    this.lines.push(`B${posX},${posY},0,${type},2,2,${height},N,"${content}"`)
    return this
  }

  print(copies = 1): this {
    this.lines.push(`P${copies}`)
    return this
  }

  getOutput(): string {
    return this.lines.join('\n')
  }

  getBuffer(): Buffer {
    return Buffer.from(this.getOutput(), 'ascii')
  }
}
