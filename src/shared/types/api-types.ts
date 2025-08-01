export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}
export type ReceiptData = {
  branch_en: string
  branch_ar: string
  branch_code: string
  vat_number: string
  receipt_number: string
  date_time: string
  phone_number: string
  user_id: number
  products: {
    english_name: string
    arabic_name: string
    quantity: string
    vat: number
    price: number
    total: number
    vat_amount: number
  }[]
  payments: {
    name: string
    amount: number
  }[]
}

export type LabelData = {
  brand: string
  product_name: string
  product_barcode: string
  price: number
  expiry: string
}

export type PrintJobData =
  | {
      id: number
      name: string
      type: 'receipt'
      data: ReceiptData
    }
  | {
      id: number
      name: string
      type: 'label'
      data: LabelData
    }
