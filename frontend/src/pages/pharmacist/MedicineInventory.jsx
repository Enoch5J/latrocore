import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Badge, StatCard, SearchBar } from '../../components/ui';
import {
  Package, Search, AlertTriangle, CheckCircle, Clock,
  ThermometerSnowflake, Plus, RefreshCw, Barcode, ShieldCheck,
  Building, Pill, Filter, Box, ArrowRight, X
} from 'lucide-react';

const INITIAL_INVENTORY_DATA = [
  {
    id: 'med-001',
    code: 'MET-500',
    name: 'Metformin HCl 500mg',
    brand: 'Glucophage / Glycomet',
    category: 'Biguanide • Antidiabetic',
    stockCount: 480,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 4800,
    batchNo: 'LOT-2026-MF500',
    expiryDate: 'Dec 2027',
    expiryStatus: 'good',
    shelf: 'Bay A, Rack 02, Shelf 3',
    reorderLevel: 100,
    unitPrice: '₹4.50',
    isColdChain: false,
  },
  {
    id: 'med-002',
    code: 'GLI-001',
    name: 'Glimepiride 1mg',
    brand: 'Amaryl 1mg',
    category: 'Sulfonylurea • Antidiabetic',
    stockCount: 45, // Below reorder level 50
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 450,
    batchNo: 'LOT-2026-GM102',
    expiryDate: 'Aug 2027',
    expiryStatus: 'good',
    shelf: 'Bay A, Rack 04, Shelf 1',
    reorderLevel: 50,
    unitPrice: '₹8.20',
    isColdChain: false,
  },
  {
    id: 'med-003',
    code: 'ATO-010',
    name: 'Atorvastatin 10mg',
    brand: 'Lipitor / Atorva',
    category: 'Statin • Lipid Lowering',
    stockCount: 310,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 3100,
    batchNo: 'LOT-2026-AT911',
    expiryDate: 'Oct 2027',
    expiryStatus: 'good',
    shelf: 'Bay B, Rack 01, Shelf 2',
    reorderLevel: 60,
    unitPrice: '₹12.00',
    isColdChain: false,
  },
  {
    id: 'med-004',
    code: 'TEL-040',
    name: 'Telmisartan 40mg',
    brand: 'Micardis / Telma',
    category: 'ARB • Antihypertensive',
    stockCount: 195,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 1950,
    batchNo: 'LOT-2026-TL440',
    expiryDate: 'Mar 2028',
    expiryStatus: 'good',
    shelf: 'Bay B, Rack 03, Shelf 4',
    reorderLevel: 40,
    unitPrice: '₹9.50',
    isColdChain: false,
  },
  {
    id: 'med-005',
    code: 'MET-1000',
    name: 'Metformin HCl SR 1000mg',
    brand: 'Glycomet SR 1000',
    category: 'Biguanide SR • Antidiabetic',
    stockCount: 340,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 3400,
    batchNo: 'LOT-2026-MF100',
    expiryDate: 'Jan 2028',
    expiryStatus: 'good',
    shelf: 'Bay A, Rack 02, Shelf 4',
    reorderLevel: 75,
    unitPrice: '₹7.80',
    isColdChain: false,
  },
  {
    id: 'med-006',
    code: 'INS-GLA',
    name: 'Insulin Glargine 100 U/mL (Lantus)',
    brand: 'Lantus SoloStar Pen (3mL)',
    category: 'Long-Acting Basal Insulin',
    stockCount: 12, // Below reorder level 15
    unitsPerPack: 'Pre-filled Pens (Cold Chain)',
    totalUnits: 12,
    batchNo: 'LOT-2026-LN993',
    expiryDate: 'Sep 2027',
    expiryStatus: 'good',
    shelf: 'Cold Vault Fridge #2 (Row 1)',
    reorderLevel: 15,
    unitPrice: '₹620.00',
    isColdChain: true,
  },
  {
    id: 'med-007',
    code: 'INS-ASP',
    name: 'Insulin Aspart 100 U/mL (NovoRapid)',
    brand: 'NovoRapid FlexPen (3mL)',
    category: 'Rapid-Acting Bolus Insulin',
    stockCount: 10, // Below reorder level 12
    unitsPerPack: 'Pre-filled Pens (Cold Chain)',
    totalUnits: 10,
    batchNo: 'LOT-2026-NR118',
    expiryDate: 'Jun 2027',
    expiryStatus: 'good',
    shelf: 'Cold Vault Fridge #2 (Row 2)',
    reorderLevel: 12,
    unitPrice: '₹580.00',
    isColdChain: true,
  },
  {
    id: 'med-008',
    code: 'EMP-010',
    name: 'Empagliflozin 10mg',
    brand: 'Jardiance 10mg',
    category: 'SGLT2 Inhibitor • Antidiabetic',
    stockCount: 160,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 1600,
    batchNo: 'LOT-2026-EM010',
    expiryDate: 'Jul 2027',
    expiryStatus: 'good',
    shelf: 'Bay A, Rack 05, Shelf 2',
    reorderLevel: 30,
    unitPrice: '₹48.00',
    isColdChain: false,
  },
  {
    id: 'med-009',
    code: 'SIT-100',
    name: 'Sitagliptin 100mg',
    brand: 'Januvia 100mg',
    category: 'DPP-4 Inhibitor • Antidiabetic',
    stockCount: 120,
    unitsPerPack: '7 Tablets / Strip',
    totalUnits: 840,
    batchNo: 'LOT-2026-ST100',
    expiryDate: 'Feb 2027', // Near expiry
    expiryStatus: 'near_expiry',
    shelf: 'Bay A, Rack 05, Shelf 3',
    reorderLevel: 25,
    unitPrice: '₹42.00',
    isColdChain: false,
  },
];

export default function MedicineInventory() {
  const { addToast } = useApp();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState(INITIAL_INVENTORY_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');
  const [reorderModalItem, setReorderModalItem] = useState(null);

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.stockCount <= item.reorderLevel);
  }, [inventory]);

  const nearExpiryItems = useMemo(() => {
    return inventory.filter(item => item.expiryStatus === 'near_expiry');
  }, [inventory]);

  const filteredItems = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shelf.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' ||
        (categoryFilter === 'cold_chain' && item.isColdChain) ||
        (categoryFilter === 'oral' && !item.isColdChain);

      const matchesStockStatus = stockStatusFilter === 'all' ||
        (stockStatusFilter === 'low' && item.stockCount <= item.reorderLevel) ||
        (stockStatusFilter === 'near_expiry' && item.expiryStatus === 'near_expiry');

      return matchesSearch && matchesCategory && matchesStockStatus;
    });
  }, [inventory, searchQuery, categoryFilter, stockStatusFilter]);

  const handlePlaceReorder = (item, quantity = 50) => {
    setInventory(prev => prev.map(m => {
      if (m.id === item.id) {
        return {
          ...m,
          stockCount: m.stockCount + quantity,
          totalUnits: m.totalUnits + (m.isColdChain ? quantity : quantity * 10),
        };
      }
      return m;
    }));

    setReorderModalItem(null);
    addToast({
      type: 'success',
      message: `📦 Reorder PO logged for ${item.name} (+${quantity} units). Live dispensary inventory replenished.`,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12 font-sans">
      {/* ── Top Header ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl border-2 border-[#E8DCC8] p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] uppercase font-black tracking-widest text-[#046A38] bg-[#E8F5EE] px-2.5 py-1 rounded-full border border-[#A8D7BD]">
              Dispensary Stock Ledger
            </span>
            <span className="text-xs text-stone-300">•</span>
            <span className="text-xs font-bold text-stone-600">
              Cold Chain &amp; Essential Medicines
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight flex items-center gap-2.5">
            <Package className="text-[#046A38] shrink-0" size={28} />
            <span>Medicine Inventory &amp; Stock Availability</span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1 max-w-2xl leading-relaxed">
            Monitor real-time dispensary stock levels, cold vault temperatures, batch expiration dates, automated reorder thresholds, and bin locations.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => navigate('/pharmacist/stock-verification')}
            className="btn-outline btn-sm font-bold flex items-center gap-1.5"
          >
            <Barcode size={15} /> Barcode Scan &amp; Dispense
          </button>
        </div>
      </div>

      {/* ── Inventory KPI Metrics ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Total SKUs in Vault</p>
          <p className="text-3xl font-black text-slate-950 mt-1">{inventory.length} Items</p>
          <p className="text-[11px] font-semibold text-emerald-800 mt-1">100% Formulary Verified</p>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-amber-300 shadow-xs bg-amber-50/20">
          <p className="text-xs font-black uppercase text-amber-900">Low Stock Alerts</p>
          <p className="text-3xl font-black text-amber-950 mt-1">{lowStockItems.length} SKUs</p>
          <p className="text-[11px] font-bold text-amber-800 mt-1">Below Reorder Threshold</p>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Cold Chain Vault</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-blue-900">3.8°C</span>
            <span className="text-xs font-bold text-emerald-800">Normal (2-8°C)</span>
          </div>
          <p className="text-[11px] font-semibold text-slate-600 mt-1">Fridge #2 Digital Sensor Online</p>
        </div>

        <div className="card p-5 bg-white rounded-3xl border-2 border-slate-200 shadow-xs">
          <p className="text-xs font-black uppercase text-slate-600">Near-Expiry Warning</p>
          <p className="text-3xl font-black text-rose-950 mt-1">{nearExpiryItems.length} Batches</p>
          <p className="text-[11px] font-bold text-rose-800 mt-1">Expiring within 6 months</p>
        </div>
      </div>

      {/* ── Search & Filter Controls ───────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border-2 border-[#E8DCC8] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 max-w-md">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search medicine name, code (e.g. INS-GLA), brand, or shelf..."
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-[#FAF6EF] text-slate-800 cursor-pointer"
          >
            <option value="all">All Product Categories</option>
            <option value="cold_chain">Cold Chain (Insulins 2-8°C)</option>
            <option value="oral">Oral Solid Formulations</option>
          </select>

          <button
            onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              stockStatusFilter === 'low'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            Low Stock Only ({lowStockItems.length})
          </button>
        </div>
      </div>

      {/* ── Medicine Inventory Table ───────────────────────────────── */}
      <div className="card bg-white rounded-3xl border-2 border-[#E8DCC8] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-800">
            <thead className="bg-[#FAF6EF] border-b-2 border-[#E8DCC8] text-[10px] font-black uppercase text-slate-700">
              <tr>
                <th className="p-4">Medication &amp; Brand</th>
                <th className="p-4">Code / Batch</th>
                <th className="p-4">Location / Shelf</th>
                <th className="p-4">Available Stock</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((med) => {
                const isLow = med.stockCount <= med.reorderLevel;
                const isNearExpiry = med.expiryStatus === 'near_expiry';

                return (
                  <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          med.isColdChain ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {med.isColdChain ? <ThermometerSnowflake size={16} /> : <Pill size={16} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-950 text-xs sm:text-sm">{med.name}</p>
                          <p className="text-[11px] font-semibold text-slate-500">{med.brand} • {med.category}</p>
                          {med.isColdChain && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 mt-1">
                              ❄️ Cold Chain 2°C - 8°C Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="font-extrabold text-slate-900 font-mono block">{med.code}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{med.batchNo}</span>
                    </td>

                    <td className="p-4">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
                        <Building size={12} className="text-slate-400" />
                        {med.shelf}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-black ${isLow ? 'text-rose-700' : 'text-slate-950'}`}>
                          {med.stockCount} {med.isColdChain ? 'Pens' : 'Strips'}
                        </span>
                        {isLow && (
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                            Low
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-semibold">
                        Reorder Level: {med.reorderLevel} ({med.totalUnits} total units)
                      </p>
                    </td>

                    <td className="p-4">
                      <span className={`font-black ${isNearExpiry ? 'text-rose-700' : 'text-slate-900'}`}>
                        {med.expiryDate}
                      </span>
                      {isNearExpiry && (
                        <span className="block text-[10px] font-bold text-rose-700">Near Expiry</span>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {isLow ? (
                        <button
                          onClick={() => setReorderModalItem(med)}
                          className="btn-primary btn-sm bg-amber-600 hover:bg-amber-700 text-xs font-bold inline-flex items-center gap-1"
                        >
                          <RefreshCw size={12} /> Reorder Stock
                        </button>
                      ) : (
                        <button
                          onClick={() => setReorderModalItem(med)}
                          className="btn-outline btn-sm text-xs font-bold inline-flex items-center gap-1"
                        >
                          <Plus size={12} /> Add Stock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Reorder / Replenish Modal ──────────────────────────────── */}
      {reorderModalItem && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full border-2 border-[#E8DCC8] shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-slate-950">Replenish Dispensary Inventory</h3>
              <button
                onClick={() => setReorderModalItem(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs font-medium text-slate-800">
              <p>Item: <span className="font-black text-slate-950">{reorderModalItem.name}</span></p>
              <p>Batch: <span className="font-mono font-bold text-slate-950">{reorderModalItem.batchNo}</span></p>
              <p>Storage Shelf: <span className="font-bold text-[#046A38]">{reorderModalItem.shelf}</span></p>

              <div className="p-3 bg-[#FAF6EF] rounded-xl border border-[#E8DCC8]">
                <label className="font-extrabold text-slate-900 block mb-1">Standard PO Pack Size:</label>
                <select id="reorderQty" defaultValue="50" className="w-full p-2 rounded-lg border border-slate-300 bg-white font-bold text-xs">
                  <option value="25">+25 Units (Emergency Top-Up)</option>
                  <option value="50">+50 Units (Standard 30-Day Restock)</option>
                  <option value="100">+100 Units (Bulk Reorder)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button onClick={() => setReorderModalItem(null)} className="btn-outline btn-sm font-bold">
                Cancel
              </button>
              <button
                onClick={() => {
                  const selectEl = document.getElementById('reorderQty');
                  const qty = parseInt(selectEl?.value || '50', 10);
                  handlePlaceReorder(reorderModalItem, qty);
                }}
                className="btn-primary btn-sm font-bold flex items-center gap-1.5"
              >
                <CheckCircle size={14} /> Authorize Inflow Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

