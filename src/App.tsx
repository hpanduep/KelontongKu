import React, { useState, useEffect } from 'react';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: 'kelontong' | 'warung';
  barcode?: string;
  image?: string;
}

interface CartItem extends Product {
  qty: number;
  customPrice?: number;
}

interface Transaction {
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

interface KasbonItem {
  id: string;
  trxId: string;
  customerName: string;
  date: string;
  amount: number;
  isPaid: boolean;
  itemsSummary: string;
}

interface Settings {
  storeName: string;
  tokoPrefix: string;
  warungPrefix: string;
  printerWidth: string;
}

export default function App() {
  const [activeProfile, setActiveProfile] = useState<'kelontong' | 'warung'>('kelontong');
  const [activeMenu, setActiveMenu] = useState<'kasir' | 'produk' | 'kasbon' | 'laporan' | 'pengaturan'>('kasir');

  // Load Pengaturan dari localStorage (Default nama kosong)
  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('kelontong_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {
      storeName: '',
      tokoPrefix: 'TOKO',
      warungPrefix: 'DAPOER',
      printerWidth: '58mm'
    };
  });

  // State Form Pengaturan Sementara
  const [formStoreName, setFormStoreName] = useState(settings.storeName);
  const [formTokoPrefix, setFormTokoPrefix] = useState(settings.tokoPrefix);
  const [formWarungPrefix, setFormWarungPrefix] = useState(settings.warungPrefix);
  const [formPrinterWidth, setFormPrinterWidth] = useState(settings.printerWidth);

  // Load awal produk dari localStorage
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('kelontong_products');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: '1', name: 'Beras Ramos 5kg', price: 65000, stock: 15, category: 'kelontong', barcode: '899123456701' },
      { id: '2', name: 'Minyak Goreng Bimoli 1L', price: 19000, stock: 30, category: 'kelontong', barcode: '899123456702' },
      { id: '3', name: 'Gula Pasir 1kg', price: 17500, stock: 25, category: 'kelontong', barcode: '899123456703' },
      { id: '4', name: 'Sabun Mandi Lifebuoy', price: 4500, stock: 40, category: 'kelontong', barcode: '899123456704' },
      { id: '5', name: 'Es Teh Manis Jumbo', price: 5000, stock: 100, category: 'warung' },
      { id: '6', name: 'Kopi Hitam Tubruk', price: 4000, stock: 80, category: 'warung' },
      { id: '7', name: 'Indomie Telor Rebus', price: 12000, stock: 45, category: 'warung' },
      { id: '8', name: 'Gorengan Bakwan/Tempe', price: 2000, stock: 60, category: 'warung' },
    ];
  });

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  // State Modal Pembayaran Cash / Kasbon
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [cashInput, setCashInput] = useState<string>('');
  const [customerNameInput, setCustomerNameInput] = useState<string>('');

  // Load Transactions & Kasbon dari localStorage
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('kelontong_transactions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [kasbonList, setKasbonList] = useState<KasbonItem[]>(() => {
    const saved = localStorage.getItem('kelontong_kasbon');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);

  // State Modal Produk
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Field State Produk
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState<'kelontong' | 'warung'>('kelontong');
  const [formImage, setFormImage] = useState('');

  // Simpan otomatis ke localStorage
  useEffect(() => {
    localStorage.setItem('kelontong_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('kelontong_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('kelontong_kasbon', JSON.stringify(kasbonList));
  }, [kasbonList]);

  useEffect(() => {
    localStorage.setItem('kelontong_settings', JSON.stringify(settings));
  }, [settings]);

  // Logika Kata Sapaan Otomatis Berdasarkan Jam
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const displayName = settings.storeName.trim() ? settings.storeName : '...';
  const greetingText = `${getGreeting()}, ${displayName}!`;

  const filteredProducts = products.filter(p => 
    p.category === activeProfile && 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prevCart, { ...product, qty: 1, customPrice: product.price }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[]);
  };

  const updateCustomPrice = (id: string, price: number) => {
    setCart(prev => prev.map(item => 
      item.id === id ? { ...item, customPrice: isNaN(price) ? 0 : price } : item
    ));
  };

  const subtotal = cart.reduce((sum, item) => sum + ((item.customPrice ?? item.price) * item.qty), 0);
  const finalPayment = Math.max(0, subtotal - globalDiscount);

  const cashNum = Number(cashInput) || 0;
  const isKasbon = cashInput !== '' && cashNum < finalPayment;
  const changeNum = cashNum >= finalPayment ? cashNum - finalPayment : 0;

  const handleOpenPaymentModal = () => {
    if (cart.length === 0) return;
    setCashInput('');
    setCustomerNameInput('');
    setIsPaymentModalOpen(true);
  };

  const handleCheckout = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isKasbon && !customerNameInput.trim()) {
      alert('Uang kurang! Masukkan nama pelanggan untuk mencatat kasbon.');
      return;
    }

    setProducts(prevProducts => 
      prevProducts.map(p => {
        const cartItem = cart.find(c => c.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
        }
        return p;
      })
    );

    const now = new Date();
    const trxId = 'TRX-' + Date.now().toString().slice(-6);
    
    const newTransaction: Transaction = {
      id: trxId,
      date: now.toISOString(),
      formattedDate: now.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }),
      items: [...cart],
      subtotal,
      discount: globalDiscount,
      finalPayment,
      cashGiven: cashNum,
      change: changeNum,
      isKasbon,
      customerName: isKasbon ? customerNameInput : undefined,
      profile: activeProfile
    };

    setTransactions([newTransaction, ...transactions]);

    if (isKasbon) {
      const summaryText = cart.map(i => `${i.name} (${i.qty}x)`).join(', ');
      const newKasbon: KasbonItem = {
        id: 'KB-' + Date.now().toString().slice(-6),
        trxId,
        customerName: customerNameInput,
        date: now.toLocaleDateString('id-ID'),
        amount: finalPayment - cashNum,
        isPaid: false,
        itemsSummary: summaryText
      };
      setKasbonList([newKasbon, ...kasbonList]);
    }

    setIsPaymentModalOpen(false);
    setActiveReceipt(newTransaction);
    setCart([]);
    setGlobalDiscount(0);
  };

  const handleDeleteTransaction = (trxId: string) => {
    if (confirm('Batalkan dan hapus transaksi ini? Stok barang akan dikembalikan ke sistem.')) {
      const trxToCancel = transactions.find(t => t.id === trxId);
      if (trxToCancel) {
        setProducts(prevProducts =>
          prevProducts.map(p => {
            const itemInTrx = trxToCancel.items.find(i => i.id === p.id);
            if (itemInTrx) {
              return { ...p, stock: p.stock + itemInTrx.qty };
            }
            return p;
          })
        );
      }
      setTransactions(transactions.filter(t => t.id !== trxId));
      setKasbonList(kasbonList.filter(k => k.trxId !== trxId));
    }
  };

  const handleToggleKasbonPaid = (kasbonId: string) => {
    setKasbonList(kasbonList.map(k => k.id === kasbonId ? { ...k, isPaid: !k.isPaid } : k));
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthYear = new Date().toISOString().slice(0, 7);

  const omzetToday = transactions
    .filter(t => t.date.slice(0, 10) === todayStr)
    .reduce((sum, t) => sum + t.finalPayment, 0);

  const omzetThisMonth = transactions
    .filter(t => t.date.slice(0, 7) === currentMonthYear)
    .reduce((sum, t) => sum + t.finalPayment, 0);

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormPrice('');
    setFormStock('');
    setFormCategory(activeProfile);
    setFormImage('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormName(product.name);
    setFormPrice(product.price.toString());
    setFormStock(product.stock.toString());
    setFormCategory(product.category);
    setFormImage(product.image || '');
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formPrice) return;

    if (editingProduct) {
      setProducts(products.map(p => p.id === editingProduct.id ? {
        ...p,
        name: formName,
        price: Number(formPrice),
        stock: Number(formStock) || 0,
        category: formCategory,
        image: formImage
      } : p));
    } else {
      const newProd: Product = {
        id: Date.now().toString(),
        name: formName,
        price: Number(formPrice),
        stock: Number(formStock) || 0,
        category: formCategory,
        image: formImage
      };
      setProducts([newProd, ...products]);
    }

    setIsModalOpen(false);
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Yakin ingin menghapus produk ini dari daftar?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSettings({
      storeName: formStoreName,
      tokoPrefix: formTokoPrefix,
      warungPrefix: formWarungPrefix,
      printerWidth: formPrinterWidth
    });
    alert('Pengaturan berhasil disimpan!');
  };

  return (
    <div className="min-h-screen bg-[#F4F5F7] text-[#0B2545] font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="bg-[#0B2545] text-white px-6 py-4 flex justify-between items-center shadow-md border-b-4 border-[#3A7CA5]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-[#3A7CA5] rounded-lg flex items-center justify-center text-xl shadow-inner border border-white/25">
            🛒
          </div>
          <h1 className="text-xl font-bold tracking-wide">KelontongKu</h1>
        </div>

        {/* Sapaan di Tengah Navbar */}
        <div className="hidden md:flex items-center text-sm font-semibold text-gray-200 bg-[#133863]/60 px-4 py-1.5 rounded-full border border-white/10 shadow-inner">
          <span>{greetingText}</span>
        </div>

        <div className="flex items-center space-x-2 bg-[#133863] p-1.5 rounded-lg border border-[#3A7CA5]/40 shadow-inner">
          <button 
            onClick={() => { setActiveProfile('kelontong'); setCart([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeProfile === 'kelontong' ? 'bg-[#3A7CA5] text-white shadow' : 'text-gray-300 hover:text-white'}`}
          >
            Toko Kelontong
          </button>
          <button 
            onClick={() => { setActiveProfile('warung'); setCart([]); }}
            className={`px-4 py-1.5 rounded-md text-sm font-semibold transition ${activeProfile === 'warung' ? 'bg-[#3A7CA5] text-white shadow' : 'text-gray-300 hover:text-white'}`}
          >
            Warung (Grid)
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col justify-between shadow-sm">
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveMenu('kasir')}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${activeMenu === 'kasir' ? 'bg-[#0B2545] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Kasir / Transaksi
            </button>
            <button 
              onClick={() => setActiveMenu('produk')}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${activeMenu === 'produk' ? 'bg-[#0B2545] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Kelola Produk & Harga
            </button>
            <button 
              onClick={() => setActiveMenu('kasbon')}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${activeMenu === 'kasbon' ? 'bg-[#0B2545] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Buku Kasbon Warga
            </button>
            <button 
              onClick={() => setActiveMenu('laporan')}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${activeMenu === 'laporan' ? 'bg-[#0B2545] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Laporan Penjualan
            </button>
            <button 
              onClick={() => setActiveMenu('pengaturan')}
              className={`w-full text-left px-4 py-2.5 rounded-lg font-medium transition ${activeMenu === 'pengaturan' ? 'bg-[#0B2545] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Pengaturan Printer & Toko
            </button>
          </nav>

          <div className="text-xs text-gray-400 text-center py-2 border-t border-gray-100">
            KelontongKu v1.0.45 • Stable Build
          </div>
        </aside>

        {/* Dynamic Display Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {activeMenu === 'kasir' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0B2545]">Katalog {activeProfile === 'kelontong' ? 'Toko Kelontong' : 'Warung'}</h2>
                    <p className="text-xs text-gray-400">Klik produk untuk masukkan ke keranjang kasir</p>
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari atau scan barang..." 
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:border-[#3A7CA5]"
                  />
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[440px] p-1">
                  {filteredProducts.map(p => (
                    <button 
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-3 bg-[#F4F5F7] border border-gray-200 rounded-lg hover:border-[#3A7CA5] hover:shadow transition text-left flex flex-col justify-between"
                    >
                      <div>
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-20 object-cover rounded mb-2" /> : <div className="w-full h-20 bg-gray-200 rounded flex items-center justify-center text-xl mb-2">📦</div>}
                        <p className="font-semibold text-sm text-[#0B2545] truncate">{p.name}</p>
                        <p className="text-xs text-gray-500 mt-1">Stok: {p.stock}</p>
                      </div>
                      <p className="text-sm font-bold text-[#3A7CA5] mt-3">Rp {p.price.toLocaleString()}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0B2545] mb-4 border-b pb-2">Keranjang Kasir</h2>
                  {cart.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-12">Belum ada barang dipilih.</p>
                  ) : (
                    <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.id} className="bg-[#F4F5F7] p-2.5 rounded-lg border border-gray-200 text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-semibold text-[#0B2545]">{item.name}</span>
                            <button 
                              onClick={() => setCart(cart.filter(c => c.id !== item.id))}
                              className="text-red-500 hover:text-red-700 text-xs font-bold"
                            >
                              ✕ Hapus
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-2 gap-2">
                            <div className="flex items-center space-x-1">
                              <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 bg-white border rounded font-bold text-xs hover:bg-gray-100">-</button>
                              <span className="px-2 font-semibold text-xs">{item.qty}</span>
                              <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 bg-white border rounded font-bold text-xs hover:bg-gray-100">+</button>
                            </div>

                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500">Rp</span>
                              <input 
                                type="number"
                                value={item.customPrice ?? item.price}
                                onChange={(e) => updateCustomPrice(item.id, Number(e.target.value))}
                                className="w-24 px-1.5 py-0.5 border border-gray-300 rounded text-xs font-bold text-right bg-white focus:outline-none focus:border-[#3A7CA5]"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 mt-3 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Diskon/Potongan Kasir:</span>
                    <input 
                      type="number" 
                      value={globalDiscount || ''}
                      onChange={(e) => setGlobalDiscount(Number(e.target.value))}
                      placeholder="0"
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-right text-xs focus:outline-none focus:border-[#3A7CA5]"
                    />
                  </div>

                  <div className="flex justify-between items-center text-base font-bold pt-1 border-t">
                    <span>Total Bayar:</span>
                    <span className="text-[#3A7CA5] text-lg">Rp {finalPayment.toLocaleString()}</span>
                  </div>

                  <button 
                    onClick={handleOpenPaymentModal}
                    disabled={cart.length === 0}
                    className={`w-full py-3 rounded-lg font-bold text-white transition shadow ${cart.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#0B2545] hover:bg-[#133863]'}`}
                  >
                    Bayar Sekarang
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'produk' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-bold text-[#0B2545]">Kelola Produk & Harga</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Daftar seluruh barang yang terdaftar di sistem</p>
                </div>
                <button 
                  onClick={handleOpenAddModal}
                  className="px-4 py-2 bg-[#0B2545] text-white rounded-lg text-sm font-semibold hover:bg-[#133863] shadow"
                >
                  + Tambah Produk Baru
                </button>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#F4F5F7] text-[#0B2545] border-b border-gray-200">
                      <th className="p-3">Foto & Nama Barang</th>
                      <th className="p-3">Kategori</th>
                      <th className="p-3">Harga</th>
                      <th className="p-3">Stok</th>
                      <th className="p-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50 transition">
                        <td className="p-3 flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded border flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : '📦'}
                          </div>
                          <span className="font-semibold text-[#0B2545]">{p.name}</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${p.category === 'kelontong' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {p.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-[#3A7CA5]">Rp {p.price.toLocaleString()}</td>
                        <td className="p-3">{p.stock}</td>
                        <td className="p-3 text-center space-x-2">
                          <button 
                            onClick={() => handleOpenEditModal(p)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(p.id)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold"
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMenu === 'kasbon' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold text-[#0B2545]">Buku Kasbon Warga</h2>
                  <p className="text-xs text-gray-400">Catat dan pantau daftar utang pelanggan warung/kelontong</p>
                </div>
              </div>

              {kasbonList.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-12">Belum ada catatan kasbon warga.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F4F5F7] text-[#0B2545] border-b border-gray-200">
                        <th className="p-3">Tanggal</th>
                        <th className="p-3">Nama Pelanggan</th>
                        <th className="p-3">Rincian Barang</th>
                        <th className="p-3">Sisa Utang</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {kasbonList.map(k => (
                        <tr key={k.id} className="hover:bg-gray-50 transition">
                          <td className="p-3 text-gray-500 text-xs">{k.date}</td>
                          <td className="p-3 font-bold text-[#0B2545]">{k.customerName}</td>
                          <td className="p-3 text-xs text-gray-600 max-w-xs truncate">{k.itemsSummary}</td>
                          <td className="p-3 font-bold text-red-600">Rp {k.amount.toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold ${k.isPaid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {k.isPaid ? 'Lunas' : 'Belum Lunas'}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => handleToggleKasbonPaid(k.id)}
                              className={`px-3 py-1 rounded text-xs font-semibold ${k.isPaid ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-green-600 text-white hover:bg-green-700'}`}
                            >
                              {k.isPaid ? 'Batalkan Lunas' : 'Lunasi'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeMenu === 'laporan' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Omzet Hari Ini</span>
                  <p className="text-2xl font-bold text-[#0B2545] mt-2">Rp {omzetToday.toLocaleString()}</p>
                  <span className="text-xs text-gray-400 mt-1">Tanggal: {new Date().toLocaleDateString('id-ID')}</span>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Omzet Bulan Ini (Tgl 1 s.d Selesai)</span>
                  <p className="text-2xl font-bold text-[#3A7CA5] mt-2">Rp {omzetThisMonth.toLocaleString()}</p>
                  <span className="text-xs text-gray-400 mt-1">Akumulasi Bulan Berjalan</span>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-[#0B2545] mb-4">Riwayat & Flashback Transaksi</h2>
                {transactions.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-10">Belum ada transaksi tercatat.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="bg-[#F4F5F7] text-[#0B2545] border-b border-gray-200">
                          <th className="p-3">ID TRX</th>
                          <th className="p-3">Waktu</th>
                          <th className="p-3">Sektor</th>
                          <th className="p-3">Total Bayar</th>
                          <th className="p-3">Keterangan</th>
                          <th className="p-3 text-center">Aksi (Cetak / Batalkan)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {transactions.map(t => (
                          <tr key={t.id} className="hover:bg-gray-50 transition">
                            <td className="p-3 font-semibold text-[#0B2545]">{t.id}</td>
                            <td className="p-3 text-gray-600 text-xs">{t.formattedDate}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${t.profile === 'kelontong' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                {t.profile}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-[#3A7CA5]">Rp {t.finalPayment.toLocaleString()}</td>
                            <td className="p-3 text-xs">
                              {t.isKasbon ? (
                                <span className="text-red-600 font-semibold">Kasbon ({t.customerName})</span>
                              ) : (
                                <span className="text-green-600 font-semibold">Tunai (Kembali: Rp {t.change.toLocaleString()})</span>
                              )}
                            </td>
                            <td className="p-3 text-center space-x-2">
                              <button 
                                onClick={() => setActiveReceipt(t)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-xs font-semibold"
                              >
                                Cetak Struk
                              </button>
                              <button 
                                onClick={() => handleDeleteTransaction(t.id)}
                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-semibold"
                              >
                                Batalkan / Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeMenu === 'pengaturan' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl mx-auto">
              <h2 className="text-xl font-bold text-[#0B2545] mb-2">Pengaturan Printer & Toko</h2>
              <p className="text-xs text-gray-400 mb-6">Sesuaikan nama usaha, format header struk thermal, dan perangkat printer.</p>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-[#0B2545] mb-1">Nama Usaha / Toko</label>
                  <input 
                    type="text" 
                    value={formStoreName}
                    onChange={(e) => setFormStoreName(e.target.value)}
                    placeholder="Contoh: AL-BARKAH" 
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5]"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Nama ini akan otomatis tampil di sapaan header atas dan struk belanja.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#0B2545] mb-1">Awalan Header Sektor Toko</label>
                    <select 
                      value={formTokoPrefix}
                      onChange={(e) => setFormTokoPrefix(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5] bg-white font-medium"
                    >
                      <option value="TOKO">TOKO</option>
                      <option value="WARUNG">WARUNG</option>
                      <option value="GROSIR">GROSIR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#0B2545] mb-1">Awalan Header Sektor Warung</label>
                    <select 
                      value={formWarungPrefix}
                      onChange={(e) => setFormWarungPrefix(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5] bg-white font-medium"
                    >
                      <option value="DAPOER">DAPOER</option>
                      <option value="WARUNG">WARUNG</option>
                      <option value="KEDAI">KEDAI</option>
                      <option value="RESTO">RESTO</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#0B2545] mb-1">Lebar Kertas Thermal Printer</label>
                  <select 
                    value={formPrinterWidth}
                    onChange={(e) => setFormPrinterWidth(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5] bg-white font-medium"
                  >
                    <option value="58mm">Thermal 58mm (Bluetooth / USB)</option>
                    <option value="80mm">Thermal 80mm (Standard)</option>
                  </select>
                </div>

                <div className="pt-4 border-t">
                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#0B2545] text-white rounded-xl font-bold text-sm hover:bg-[#133863] transition shadow"
                  >
                    Simpan Pengaturan
                  </button>
                </div>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Modal Pop-up Input Pembayaran Kasir */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-t-8 border-[#0B2545]">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h3 className="font-bold text-lg text-[#0B2545]">Konfirmasi Pembayaran</h3>
              <button 
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="bg-[#F4F5F7] p-3.5 rounded-xl border flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-600">Total Belanja:</span>
                <span className="text-xl font-extrabold text-[#3A7CA5]">Rp {finalPayment.toLocaleString()}</span>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#0B2545] mb-1.5">Masukkan Uang Tunai (Cash):</label>
                <input 
                  type="number"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="Contoh: 50000"
                  autoFocus
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl text-lg font-bold focus:outline-none focus:border-[#3A7CA5]"
                />
              </div>

              {cashInput !== '' && (
                <div className="p-3.5 rounded-xl border text-sm font-semibold">
                  {isKasbon ? (
                    <div className="text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
                      ⚠️ Uang kurang Rp {(finalPayment - cashNum).toLocaleString()}. Transaksi otomatis masuk ke **Buku Kasbon**.
                    </div>
                  ) : (
                    <div className="text-green-700 bg-green-50 p-2 rounded-lg border border-green-200 flex justify-between items-center">
                      <span>Uang Tunai Pas / Lebih</span>
                      <span className="text-base font-bold">Kembalian: Rp {changeNum.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}

              {isKasbon && (
                <div>
                  <label className="block text-sm font-bold text-red-600 mb-1">Nama Pelanggan (Wajib untuk Kasbon):</label>
                  <input 
                    type="text"
                    value={customerNameInput}
                    onChange={(e) => setCustomerNameInput(e.target.value)}
                    placeholder="Contoh: Bu Siti Sebelah / Pak RT"
                    className="w-full px-3.5 py-2.5 border-2 border-red-300 bg-red-50 rounded-xl text-sm focus:outline-none focus:border-red-500 font-medium"
                  />
                </div>
              )}

              <div className="flex space-x-3 pt-4 border-t">
                <button 
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className={`flex-1 py-3 text-white rounded-xl font-bold text-sm transition shadow ${isKasbon ? 'bg-red-600 hover:bg-red-700' : 'bg-[#0B2545] hover:bg-[#133863]'}`}
                >
                  {isKasbon ? 'Simpan Kasbon' : 'Selesaikan Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal / Pop-up Struk Belanja (Header Menyesuaikan Sektor & Nama Usaha) */}
      {activeReceipt && (() => {
        const primaryProfile = activeReceipt.profile;
        const storeCleanName = settings.storeName.trim() || 'AL-BARKAH';
        const headerTitle = primaryProfile === 'kelontong' 
          ? `${settings.tokoPrefix} ${storeCleanName}` 
          : `${settings.warungPrefix} ${storeCleanName}`;

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-[320px] p-5 text-sm font-mono border border-gray-300">
              <div className="text-center border-b border-dashed pb-3 mb-3">
                <h3 className="font-bold text-sm text-gray-900">{headerTitle}</h3>
                <p className="text-[11px] text-gray-500">Struk Pembayaran Kasir</p>
                <p className="text-[10px] text-gray-400 mt-1">{activeReceipt.formattedDate}</p>
                <p className="text-[10px] font-bold text-gray-600">ID: {activeReceipt.id}</p>
                {activeReceipt.isKasbon && (
                  <p className="text-[11px] font-bold text-red-600 mt-1 bg-red-50 py-0.5 rounded">STATUS: KASBON ({activeReceipt.customerName})</p>
                )}
              </div>

              <div className="space-y-2 mb-3 max-h-40 overflow-y-auto text-[11px] border-b border-dashed pb-3">
                {activeReceipt.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <div className="pr-2">
                      <p className="font-sans font-medium text-gray-900 leading-tight">{item.name}</p>
                      <p className="text-gray-500">{item.qty}x @Rp {(item.customPrice ?? item.price).toLocaleString()}</p>
                    </div>
                    <span className="font-semibold whitespace-nowrap">Rp {((item.customPrice ?? item.price) * item.qty).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed pb-3 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>Rp {activeReceipt.subtotal.toLocaleString()}</span>
                </div>
                {activeReceipt.discount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Potongan Kasir:</span>
                    <span>-Rp {activeReceipt.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs pt-1 border-t text-gray-900">
                  <span>Total Bayar:</span>
                  <span>Rp {activeReceipt.finalPayment.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600 pt-0.5">
                  <span>Uang Tunai:</span>
                  <span>Rp {activeReceipt.cashGiven.toLocaleString()}</span>
                </div>
                {!activeReceipt.isKasbon ? (
                  <div className="flex justify-between text-green-700 font-bold pt-0.5">
                    <span>Kembalian:</span>
                    <span>Rp {activeReceipt.change.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-red-600 font-bold pt-0.5">
                    <span>Sisa Utang (Kasbon):</span>
                    <span>Rp {(activeReceipt.finalPayment - activeReceipt.cashGiven).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-gray-400 mb-4">
                Terima Kasih Telah Berbelanja!<br/>Barang yang sudah dibeli tidak dapat ditukar.
              </div>

              <div className="flex space-x-2">
                <button 
                  onClick={() => setActiveReceipt(null)}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-sans font-semibold hover:bg-green-700 shadow flex items-center justify-center space-x-1"
                >
                  <span>✓</span>
                  <span>Transaksi Baru</span>
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 py-2 bg-[#0B2545] text-white rounded-lg text-xs font-sans font-semibold hover:bg-[#133863] shadow flex items-center justify-center space-x-1"
                >
                  <span>🖨️</span>
                  <span>Print Struk</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal Form Tambah / Edit Produk */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-[#0B2545] mb-4">
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Barang / Menu</label>
                <input 
                  type="text" 
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Susu Kental Manis" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Harga Jual (Rp)</label>
                  <input 
                    type="number" 
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="12000" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5]"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stok Awal</label>
                  <input 
                    type="number" 
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value)}
                    placeholder="25" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori / Sektor Mode</label>
                <select 
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as 'kelontong' | 'warung')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5] bg-white"
                >
                  <option value="kelontong">Toko Kelontong</option>
                  <option value="warung">Warung (Grid)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Foto Produk (PNG, JPG, SVG, atau URL)</label>
                
                <div className="flex items-center space-x-2">
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                    onChange={handleImageUpload}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0B2545] file:text-white hover:file:bg-[#133863] cursor-pointer"
                  />
                </div>

                <div className="text-center text-xs text-gray-400 my-1">- ATAU MASUKKAN LINK URL -</div>

                <input 
                  type="text" 
                  value={formImage.startsWith('data:') ? '' : formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://example.com/logo.png" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#3A7CA5]"
                />

                {formImage && (
                  <div className="mt-2 flex items-center space-x-3 p-2 bg-gray-50 rounded-lg border">
                    <img src={formImage} alt="Preview" className="w-12 h-12 object-cover rounded border" />
                    <span className="text-xs text-gray-600 truncate flex-1">Pratinjau gambar aktif</span>
                    <button type="button" onClick={() => setFormImage('')} className="text-red-500 text-xs font-bold hover:underline">Hapus</button>
                  </div>
                )}
              </div>

              <div className="flex space-x-3 pt-4 border-t">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition"
                >
                  Batal
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 bg-[#0B2545] hover:bg-[#133863] text-white rounded-lg font-semibold text-sm transition shadow"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}