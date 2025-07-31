// src/services/printers/builders/ZplBuilder.ts
export class ZplEncoder {
  private lines: string[] = []

  start(): this {
    this.lines.push('^XA')
    return this
  }

  density(density: number): this {
    if (density >= -15 && density <= 15) {
      this.lines.push(`^MD${density}`)
    }
    return this
  }

  speed(speed: number): this {
    if (speed >= 1 && speed <= 12) {
      this.lines.push(`^PR${speed}`)
    }
    return this
  }

  end(): this {
    this.lines.push('^XZ')
    return this
  }

  text(x: number, y: number, font = 'A', height = 30, width = 30, content = ''): this {
    this.lines.push(`^FO${x},${y}`)
    this.lines.push(`^A${font},${height},${width}`)
    this.lines.push(`^FD${content}^FS`)
    return this
  }

  barcode(x: number, y: number, data: string, height = 100): this {
    this.lines.push(`^FO${x},${y}`)
    this.lines.push(`^BY2`)
    this.lines.push(`^BCN,${height},Y,N,N`)
    this.lines.push(`^FD${data}^FS`)
    return this
  }

  getZpl(): string {
    return this.lines.join('\n')
  }

  getBuffer(): Buffer {
    return Buffer.from(this.getZpl(), 'ascii')
  }
}
