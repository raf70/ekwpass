import client from './client'

export interface ShopSettings {
  id: string
  shopId: string
  nextInvoiceNumber: number
  nextSaleNumber: number
  nextRefNumber: number
  systemMonth: number
  shopSuppliesRate: number
  shopSuppliesTaxable: boolean
  docRate: number
  shopRate: number
  gstNumber: string
  useHst: boolean
  federalTaxRate: number
  provincialTaxRate: number
  arInterestRate: number
  arDelayProcessing: boolean
  supplierProcessing: boolean
  coreAddOn: boolean
  defaultCity: string
  defaultProvince: string
  defaultComment: string
  reminderIntervalDays: number
  printTechDetail: boolean
  printInvoiceHours: boolean
  printInvoiceSupplier: boolean
  paymentType1: string
  paymentType2: string
  paymentType3: string
  paymentType4: string
  paymentType5: string
  skipLines: number
  updatedAt: string
}

export async function getSettings(): Promise<ShopSettings> {
  const { data } = await client.get<ShopSettings>('/api/settings')
  return data
}

export async function updateSettings(s: Partial<ShopSettings>): Promise<ShopSettings> {
  const { data } = await client.put<ShopSettings>('/api/settings', s)
  return data
}
