import { LabelPrinterData } from '../../shared/schemas/label-printer'
import { ReceiptPrinterData } from '../../shared/schemas/receipt-printer'

export const RECEIPT_TEST_DATA: ReceiptPrinterData = {
  brand: 'Test Brand',
  date: '2023-06-01',
  items: [
    {
      name: 'Test Item',
      quantity: 10,
      totalPrice: 100,
      unitPrice: 10
    }
  ],
  subtotal: 100,
  tax: 10,
  total: 110,
  address: 'Test Address',
  phone: '123-456-7890',
  clientId: '1234'
}

export const LABEL_TEST_DATA: LabelPrinterData = {
  barcode: '1234567890',
  brand: 'Test Brand',
  expiry: '2023-06-01',
  price: 10,
  productName: 'Test Product',
  copies: 5
}
