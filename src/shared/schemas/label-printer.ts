import { z } from 'zod'

export const LabelPrinterDataSchema = z.object({
  brand: z.string(),
  productName: z.string(),
  barcode: z.string(),
  price: z.number(),
  expiry: z.string(),
  copies: z.coerce.number().default(1)
})

export const LabelPrinterSettingsSchema = z.object({
  label_width: z.coerce.number().default(40),
  label_height: z.coerce.number().default(20),
  print_density: z.coerce.number().default(6),
  print_speed: z.coerce.number().default(1),
  encoder: z.enum(['EPL', 'ZPL', 'TSPL']).default('TSPL')
})

export type LabelPrinterData = z.infer<typeof LabelPrinterDataSchema>
export type LabelPrinterSettings = z.infer<typeof LabelPrinterSettingsSchema>
