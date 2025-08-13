// src/services/encoders/LabelEncoder.ts
export interface LabelEncoder {
  start(widthMm: number, heightMm: number, gapMm: number): this

  setSpeed(speed: number): this
  setDensity(density: number): this

  text(
    x: number | 'center',
    y: number | 'center',
    font?: string | number,
    rot?: number,
    xMul?: number,
    yMul?: number,
    content?: string
  ): this

  barcode(
    x: number | 'center',
    y: number | 'center',
    type?: string,
    height?: number,
    readable?: number,
    rot?: number,
    narrow?: number,
    wide?: number,
    content?: string
  ): this

  qrcode?(
    x: number | 'center',
    y: number | 'center',
    ecc?: string,
    cellWidth?: number,
    content?: string
  ): this

  print(copies?: number): this
  getBuffer(): Buffer
}
