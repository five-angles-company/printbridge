// src/schemas/receipt-printer.schema.ts
import { z } from 'zod'

export const ReceiptPrinterDataSchema = z.object({
  brand: z.string(),
  address: z.string().optional(),
  phone: z.string().optional(),
  date: z.string(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unitPrice: z.number(),
      totalPrice: z.number()
    })
  ),
  subtotal: z.number().nonnegative(),
  tax: z.number().nonnegative().optional(),
  total: z.number().nonnegative(),
  clientId: z.string()
})

export const ReceiptPrinterSettingsSchema = z.object({
  paper_size: z.coerce.number().default(80),
  print_density: z.coerce.string().default('6'),
  print_speed: z.coerce.string().default('1'),
  cut: z.boolean().default(true),
  beep: z.boolean().default(true)
})

export type ReceiptPrinterData = z.infer<typeof ReceiptPrinterDataSchema>
export type ReceiptPrinterSettings = z.infer<typeof ReceiptPrinterSettingsSchema>
