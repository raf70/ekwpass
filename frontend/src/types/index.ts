export interface User {
  id: string
  shopId: string
  email: string
  name: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Shop {
  id: string
  name: string
  address: string
  city: string
  province: string
  postalCode: string
  phone: string
  gstNumber: string
}

export interface Customer {
  id: string
  shopId: string
  phone: string
  phoneSecondary: string
  name: string
  street: string
  city: string
  province: string
  postalCode: string
  attention: string
  creditLimit: number
  pstExempt: boolean
  pstNumber: string
  gstExempt: boolean
  gstNumber: string
  isWholesale: boolean
  priceClass: string
  remarks: string
  gender: string
  category1: string
  category2: string
  ytdSales: number
  ytdGst: number
  lastServiceDate: string
  arBalance: number
  arCurrent: number
  ar30: number
  ar60: number
  ar90: number
  arStmtBalance: number
  arStmtFlag: string
  createdAt: string
  updatedAt: string
}

export interface Vehicle {
  id: string
  shopId: string
  customerId: string
  make: string
  model: string
  year: number
  vin: string
  productionDate: string
  odometer: number
  plate: string
  color: string
  lastServiceDate: string
  reminderIntervalDays: number
  carPlan: string
  engine: string
  safetyExpiry: string
  comments: string
  createdAt: string
  updatedAt: string
}

export interface WorkOrder {
  id: string
  shopId: string
  invoiceNumber: string
  customerId: string | null
  vehicleId: string | null
  status: string
  date: string
  time: string
  customerName: string
  customerPhone: string
  customerPhoneSecondary: string
  vehicleMake: string
  vehicleModel: string
  vehicleYear: number
  vehicleVin: string
  vehicleOdometer: number
  vehiclePlate: string
  vehicleColor: string
  jobsCount: number
  jobsTaxable: number
  jobsNontaxable: number
  jobsDiscountPct: number
  jobsDiscountAmt: number
  partsCount: number
  partsTaxable: number
  partsNontaxable: number
  partsDiscountPct: number
  partsDiscountAmt: number
  supplierPartsAmt: number
  inventoryPartsAmt: number
  shopSuppliesAmt: number
  shopSuppliesTaxable: boolean
  shopSuppliesRate: number
  docRate: number
  pstExempt: boolean
  gstExempt: boolean
  pstAmount: number
  gstAmount: number
  totalTax: number
  remark1: string
  remark2: string
  remark3: string
  createdAt: string
  updatedAt: string
}

export interface Part {
  id: string
  shopId: string
  code: string
  manufacturer: string
  altCodeA: string
  altMfgrA: string
  altCodeB: string
  altMfgrB: string
  supplierId: string | null
  description: string
  department: number
  location: string
  qtyOnHand: number
  lastUpdated: string | null
  lastSold: string | null
  turnover: number
  ytdSales: number
  sales90d: number
  reorderQty: number
  reorderAmount: number
  avgPrice: number
  sellPrice: number
  coreValue: number
  listPrice: number
  wholesalePrice: number
  discount1: number
  discount2: number
  discount3: number
  noUpdate: boolean
  createdAt: string
  updatedAt: string
}

export interface Supplier {
  id: string
  shopId: string
  code: string
  name: string
  address1: string
  address2: string
  city: string
  province: string
  postalCode: string
  country: string
  phone1: string
  phone2: string
  gstNumber: string
  remark1: string
  remark2: string
  balance: number
  openingBalance: number
  isActive: boolean
  pstGstFlag: string
  createdAt: string
  updatedAt: string
}

export interface ARTransaction {
  id: string
  shopId: string
  customerId: string
  workOrderId: string | null
  date: string
  description: string
  crDr: string
  amount: number
  createdAt: string
}

export interface APTransaction {
  id: string
  shopId: string
  supplierId: string
  invoiceNumber: string
  date: string
  type: string
  comment: string
  crDr: string
  amount: number
  gstAmount: number
  createdAt: string
}

export interface Sale {
  id: string
  shopId: string
  saleNumber: string
  customerId: string | null
  status: string
  saleType: string
  saleInfo: string
  date: string
  time: string
  qty: number
  description: string
  department: number
  amount: number
  isTaxable: boolean
  paymentType: string
  supplierId: string | null
  supplierInvoice: string
  partCode: string
  cost: number
  listPrice: number
  technicianId: string | null
  createdAt: string
  updatedAt: string
}

export interface PaginationParams {
  page: number
  pageSize: number
  search: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: User
}

export interface RegisterRequest {
  shopName: string
  name: string
  email: string
  password: string
}

export interface AuthStatus {
  initialized: boolean
}
