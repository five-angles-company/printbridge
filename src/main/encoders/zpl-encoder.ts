export class ZplEncoder {
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
    this.lines.push('^XA')
    return this
  }

  text(x: number | 'center', y: number | 'center', font = 'A', h = 50, w = 50, content = ''): this {
    const posX = this.resolveX(x, w * content.length)
    const posY = this.resolveY(y, h)
    this.lines.push(`^FO${posX},${posY}`)
    this.lines.push(`^A${font},${h},${w}`)
    this.lines.push(`^FD${content}^FS`)
    return this
  }

  barcode(
    x: number | 'center',
    y: number | 'center',
    type = 'BC',
    height = 100,
    readable = true,
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
    model = 2,
    magnification = 6,
    content = ''
  ): this {
    const size = magnification * 21
    const posX = this.resolveX(x, size)
    const posY = this.resolveY(y, size)
    this.lines.push(`^FO${posX},${posY}`)
    this.lines.push(`^BQN,${model},${magnification}`)
    this.lines.push(`^FDLA,${content}^FS`)
    return this
  }

  print(copies = 1): this {
    this.lines.push(`^PQ${copies}`)
    this.lines.push('^XZ')
    return this
  }

  getOutput(): string {
    return this.lines.join('\n')
  }

  getBuffer(): Buffer {
    return Buffer.from(this.getOutput(), 'ascii')
  }
}
