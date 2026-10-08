export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: 'kelontong' | 'warung';
  barcode?: string;
  image?: string;
}

export interface CartItem extends Product {
  qty: number;
  customPrice?: number;
}

export interface Transaction {
  id: string;
  date: string;
  formattedDate: string;
  items: CartItem[];
  subtotal: number;
  discount: number;
  finalPayment: number;
  cashGiven: number;
  change: number;
  isKasbon: boolean;
  customerName?: string;
  profile: 'kelontong' | 'warung';
}

export interface KasbonItem {
  id: string;
  trxId: string;
  customerName: string;
  date: string;
  amount: number;
  isPaid: boolean;
  itemsSummary: string;
}

export interface Settings {
  storeName: string;
  tokoPrefix: string;
  warungPrefix: string;
  printerWidth: string;
}
