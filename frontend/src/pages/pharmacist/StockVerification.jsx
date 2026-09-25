import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { Badge, StatCard, Avatar } from '../../components/ui';
import {
  Package, Search, Barcode, ShieldCheck, CheckCheck, ShoppingBag,
  Layers, ArrowLeft, RefreshCw, Check, AlertTriangle, AlertCircle,
  Clock, Pill, Building, ThermometerSnowflake, FileText
} from 'lucide-react';
import { formatDate } from '../../data/demoDate';

const INITIAL_INVENTORY = {
  'med-001': {
    code: 'MET-500',
    name: 'Metformin HCl 500mg',
    brand: 'Glucophage / Glycomet',
    category: 'Biguanide • Antidiabetic',
    stockCount: 480,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 4800,
    batchNo: 'LOT-2026-MF500',
    expiryDate: 'Dec 2027',
    shelf: 'Bay A, Rack 02, Shelf 3',
    reorderLevel: 80,
    status: 'In Stock',
  },
  'med-002': {
    code: 'GLI-001',
    name: 'Glimepiride 1mg',
    brand: 'Amaryl 1mg',
    category: 'Sulfonylurea • Antidiabetic',
    stockCount: 220,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 2200,
    batchNo: 'LOT-2026-GM102',
    expiryDate: 'Aug 2027',
    shelf: 'Bay A, Rack 04, Shelf 1',
    reorderLevel: 50,
    status: 'In Stock',
  },
  'med-003': {
    code: 'ATO-010',
    name: 'Atorvastatin 10mg',
    brand: 'Lipitor / Atorva',
    category: 'Statin • Lipid Lowering',
    stockCount: 310,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 3100,
    batchNo: 'LOT-2026-AT911',
    expiryDate: 'Oct 2027',
    shelf: 'Bay B, Rack 01, Shelf 2',
    reorderLevel: 60,
    status: 'In Stock',
  },
  'med-004': {
    code: 'TEL-040',
    name: 'Telmisartan 40mg',
    brand: 'Micardis / Telma',
    category: 'ARB • Antihypertensive',
    stockCount: 195,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 1950,
    batchNo: 'LOT-2026-TL440',
    expiryDate: 'Mar 2028',
    shelf: 'Bay B, Rack 03, Shelf 4',
    reorderLevel: 40,
    status: 'In Stock',
  },
  'med-005': {
    code: 'MET-1000',
    name: 'Metformin HCl SR 1000mg',
    brand: 'Glycomet SR 1000',
    category: 'Biguanide SR • Antidiabetic',
    stockCount: 340,
    unitsPerPack: '10 Tablets / Strip',
    totalUnits: 3400,
    batchNo: 'LOT-2026-MF100',
    expiryDate: 'Jan 2028',
    shelf: 'Bay A, Rack 02, Shelf 4',
    reorderLevel: 75,
    status: 'In Stock',
  },
  'med-006': {
    code: 'INS-GLA',
    name: 'Insulin Glargine 100 U/mL',
    brand: 'Lantus SoloStar Pen (3mL)',
    category: 'Long-Acting Basal Insulin',
    stockCount: 48,
    unitsPerPack: 'Pre-filled Pens (Cold Chain 2-8°C)',
    totalUnits: 48,
    batchNo: 'LOT-2026-LN993',
    expiryDate: 'Sep 2027',
    shelf: 'Cold Vault Fridge #2 (Row 1)',
    reorderLevel: 15,
    status: 'In Stock (Cold Chain Verified)',
    isColdChain: true,
  },
  'med-007': {
    code: 'INS-ASP',
    name: 'Insulin Aspart 100 U/mL',
    brand: 'NovoRapid FlexPen (3mL)',
    category: 'Rapid-Acting Bolus Insulin',
    stockCount: 36,
    unitsPerPack: 'Pre-filled Pens (Cold Chain 2-8°C)',
    totalUnits: 36,
    batchNo: 'LOT-2026-NR118',
    expiryDate: 'Jun 2027',
    shelf: 'Cold Vault Fridge #2 (Row 2)',
    reorderLevel: 12,
    status: 'In Stock (Cold Chain Verified)',
    isColdChain: true,
  },
  'med-008': {
    code: 'INS-GLA22',
    name: 'Insulin Glargine 100 U/mL (22U)',
    brand: 'Toujeo SoloStar Pen',
    category: 'Ultra Long-Acting Basal Insulin',
    stockCount: 52,
    unitsPerPack: 'Pre-filled Pens',
    totalUnits: 52,
    batchNo: 'LOT-2026-TJ404',
    expiryDate: 'Nov 2027',
    shelf: 'Cold Vault Fridge #2 (Row 1)',
    reorderLevel: 15,
    status: 'In Stock',
    isColdChain: true,
  },
};

export default function StockVerification() {
  const { currentUser, data, addToast } = useApp();
  const navigate = useNavigate();

  const [inventory, setInventory] = useState(INITIAL_INVENTORY);
  const [rxCodeInput, setRxCodeInput] = useState('RX-001');
  const [dispensedMap, setDispensedMap] = useState({});

  // Real-time matched prescription or medicine stock logic
  const matchedData = useMemo(() => {
    const raw = (rxCodeInput || '').trim().toLowerCase();
    if (!raw) return null;

    const allPrescriptions = data?.prescriptions || [];
    const usersMap = data?.users || {};

    // 1. Direct prescription match (e.g. "RX-001", "rx-002")
    const foundRx = allPrescriptions.find(p => p.id.toLowerCase() === raw || p.id.toLowerCase() === `rx-${raw}`);
    if (foundRx) {
      const patient = usersMap[foundRx.patientId];
      const doctor = usersMap[foundRx.doctorId];
      const medsWithStock = (foundRx.medicines || []).map(m => {
        const stockItem = inventory[m.id] || Object.values(inventory).find(i =>
          i.name.toLowerCase().includes(m.name.toLowerCase().split(' ')[0]) ||
          m.name.toLowerCase().includes(i.name.toLowerCase().split(' ')[0])
        ) || {
          code: 'GEN-001',
          name: m.name,
          brand: 'Standard Formulary',
          category: 'Standard Medication',
          stockCount: 150,
          unitsPerPack: '10 Tablets / Strip',
          totalUnits: 1500,
          batchNo: 'LOT-2026-GEN1',
          expiryDate: 'Dec 2027',
          shelf: 'General Dispensary Bay C',
          reorderLevel: 30,
          status: 'In Stock',
        };
        return {
          ...m,
          stock: stockItem,
        };
      });

      return {
        type: 'prescription',
        prescription: foundRx,
        patient,
        doctor,
        medicines: medsWithStock,
      };
    }

    // 2. Direct medicine code or medicine name match (e.g. "MET-500", "INS-GLA", "Metformin")
    const foundMedStock = Object.values(inventory).find(item =>
      item.code.toLowerCase() === raw ||
      item.code.toLowerCase().replace(/[^a-z0-9]/g, '') === raw.replace(/[^a-z0-9]/g, '') ||
      item.name.toLowerCase().includes(raw)
    );

    if (foundMedStock) {
      const relatedRxs = allPrescriptions.filter(p =>
        (p.medicines || []).some(m => m.name.toLowerCase().includes(foundMedStock.name.toLowerCase().split(' ')[0]))
      );
      return {
        type: 'medicine',
        stock: foundMedStock,
        relatedPrescriptions: relatedRxs,
      };
    }

    return { type: 'not_found', query: rxCodeInput };
  }, [rxCodeInput, data?.prescriptions, data?.users, inventory]);

  const handleDispensePrescription = (rxId, meds) => {
    setInventory(prev => {
      const updated = { ...prev };
      meds.forEach(m => {
        const medId = m.id;
        if (updated[medId]) {
          const deduct = m.isInsulin ? 1 : 6;
          updated[medId] = {
            ...updated[medId],
            stockCount: Math.max(0, updated[medId].stockCount - deduct),
            totalUnits: Math.max(0, updated[medId].totalUnits - (m.isInsulin ? 1 : 60)),
          };
        }
      });
      return updated;
    });

    setDispensedMap(prev => ({
      ...prev,
      [rxId]: {
        dispensedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        dispensedBy: currentUser?.name || 'Pharmacist',
      },
    }));

    addToast({
      type: 'success',
      message: `Prescription ${rxId.toUpperCase()} verified & dispensed! Live medicine stock successfully deducted.`,
    });
  };

  const inventoryItems = Object.values(inventory);
  const totalUnits = inventoryItems.reduce((acc, item) => acc + item.totalUnits, 0);
  const lowStockCount = inventoryItems.filter(i => i.stockCount <= i.reorderLevel).length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D2E2E6] pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/pharmacist/dashboard')}
            className="p-2 rounded-xl border border-[#D2E2E6] bg-white hover:bg-[#F3F8F9] text-[#367588] transition cursor-pointer shrink-0"
            title="Back to Pharmacist Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider bg-[#367588]/10 text-[#367588] px-2.5 py-0.5 rounded-full border border-[#A0C7D1]">
                Dispensary Operations
              </span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                <ShieldCheck size={12} className="text-emerald-700" />
                Live Stock Sync Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-1 flex items-center gap-2">
              <Package size={28} className="text-[#367588]" />
              <span>Stock Verification & Dispensing</span>
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
              Authenticated prescription code verification, formulation inventory count validation, and real-time stock deduction.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setInventory(INITIAL_INVENTORY);
            setDispensedMap({});
            addToast({ type: 'info', message: 'Dispensary inventory counts reset to baseline levels' });
          }}
          className="btn-outline self-start sm:self-center font-bold text-xs py-2 px-3 flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>Reset Inventory Counts</span>
        </button>
      </div>

      {/* ── Top Metric Highlights Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-[#D2E2E6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Formulations</span>
            <div className="w-8 h-8 rounded-lg bg-[#367588]/10 text-[#367588] flex items-center justify-center">
              <Package size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-950 mt-1">{inventoryItems.length}</p>
          <p className="text-[11px] font-semibold text-slate-500">Active Formulary Items</p>
        </div>

        <div className="bg-white border border-[#D2E2E6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Total Units</span>
            <div className="w-8 h-8 rounded-lg bg-[#367588]/10 text-[#367588] flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-[#367588] mt-1">{totalUnits.toLocaleString()}</p>
          <p className="text-[11px] font-semibold text-slate-500">Dispensary Stock Count</p>
        </div>

        <div className="bg-white border border-[#D2E2E6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Cold Chain</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
              <ThermometerSnowflake size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-850 mt-1">
            {inventoryItems.filter(i => i.isColdChain).reduce((a, b) => a + b.stockCount, 0)}
          </p>
          <p className="text-[11px] font-semibold text-slate-500">Insulin Pens (2-8°C Vault)</p>
        </div>

        <div className="bg-white border border-[#D2E2E6] rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase">Alert Thresholds</span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${lowStockCount > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-950 mt-1">{lowStockCount}</p>
          <p className="text-[11px] font-semibold text-slate-500">{lowStockCount === 0 ? 'All Stocks Healthy' : 'Items Near Reorder'}</p>
        </div>
      </div>

      {/* ── Main Verification Card (Matching User Blueprint & Screenshot) ── */}
      <div className="card p-5 sm:p-6 border-2 border-[#367588]/40 bg-white shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#D2E2E6]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black tracking-wider uppercase bg-[#367588]/10 text-[#367588] border border-[#A0C7D1] px-2.5 py-0.5 rounded-full">
                Pharmacist Dispensing & Inventory System
              </span>
              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-700" />
                Live Stock Sync
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight mt-1.5 flex items-center gap-2">
              <Package size={22} className="text-[#367588]" />
              <span>Prescription Code & Medicine Stock Verification</span>
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-600 mt-0.5">
              Enter any Prescription Code (e.g. <span className="font-mono text-[#367588] font-bold">RX-001</span>) or Medicine Code (<span className="font-mono text-[#367588] font-bold">MET-500</span>) to inspect authenticated prescriptions and real-time inventory counts.
            </p>
          </div>

          {/* Code Search Input Form */}
          <div className="w-full md:w-80 shrink-0">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={rxCodeInput}
                onChange={(e) => setRxCodeInput(e.target.value)}
                placeholder="Enter Rx Code (e.g. RX-001)..."
                className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-[#D2E2E6] focus:border-[#367588] focus:ring-2 focus:ring-[#367588]/20 rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 outline-none transition uppercase"
              />
              {rxCodeInput && (
                <button
                  onClick={() => setRxCodeInput('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Sample Code Chips */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="font-bold text-slate-600 text-xs shrink-0 flex items-center gap-1">
            <Barcode size={13} /> Quick Lookups:
          </span>
          {[
            { code: 'RX-001', label: 'RX-001 (Priya Sharma • Metformin + Glimepiride)' },
            { code: 'RX-002', label: 'RX-002 (Priya Sharma • Telmisartan)' },
            { code: 'RX-003', label: 'RX-003 (Rajesh Kumar • Metformin + Lantus)' },
            { code: 'RX-004', label: 'RX-004 (Farooq • NovoRapid + Lantus)' },
            { code: 'MET-500', label: 'MET-500 (Metformin Stock)' },
            { code: 'INS-GLA', label: 'INS-GLA (Lantus Cold Storage)' },
          ].map(chip => (
            <button
              key={chip.code}
              onClick={() => setRxCodeInput(chip.code)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                rxCodeInput.toUpperCase().includes(chip.code)
                  ? 'bg-[#367588] text-white border-[#2A5C6B] shadow-xs'
                  : 'bg-white hover:bg-[#F3F8F9] text-slate-700 border-[#D2E2E6]'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* Matched Prescription Result View */}
        {matchedData?.type === 'prescription' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
            {/* Left Column (5 cols): Prescription Clinical Details */}
            <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-[#D2E2E6] shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 border-b border-[#D2E2E6] pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-[#367588]/10 text-[#367588] border border-[#A0C7D1]">
                      {matchedData.prescription.id.toUpperCase()}
                    </span>
                    <Badge variant={matchedData.prescription.status === 'active' ? 'success' : 'gray'}>
                      {matchedData.prescription.status.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Auth: {formatDate(matchedData.prescription.authorizedAt)}
                  </span>
                </div>

                {/* Patient & Doctor Card */}
                <div className="mt-3.5 space-y-2">
                  <div className="flex items-center gap-3">
                    <Avatar user={matchedData.patient} size="md" />
                    <div>
                      <h4 className="font-extrabold text-sm sm:text-base text-slate-950">
                        {matchedData.patient?.name || 'Verified Patient'}
                      </h4>
                      <p className="text-xs font-semibold text-slate-600">
                        {matchedData.patient?.age} yrs • {matchedData.patient?.gender || 'Female'} • {matchedData.patient?.diabetesType || 'Type 2 Diabetes'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#F3F8F9] rounded-xl p-3 border border-[#D2E2E6] text-xs space-y-1">
                    <p className="text-slate-600 font-medium">
                      <span className="font-bold text-slate-900">Authorizing Doctor:</span> {matchedData.doctor?.name || 'Dr. Arun Krishnamurthy (MD)'}
                    </p>
                    {matchedData.prescription.notes && (
                      <p className="text-slate-600 font-medium">
                        <span className="font-bold text-slate-900">Clinical Directive:</span> {matchedData.prescription.notes}
                      </p>
                    )}
                  </div>
                </div>

                {/* Prescribed Items Summary */}
                <div className="mt-4">
                  <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Prescribed Medicines ({matchedData.medicines.length})
                  </h5>
                  <div className="space-y-2">
                    {matchedData.medicines.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl border border-[#D2E2E6] bg-white text-xs flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{m.name}</p>
                          <p className="text-[11px] text-slate-600">
                            {m.dose} • {m.frequency} • {m.foodInstruction}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-black bg-[#367588]/10 text-[#367588] border border-[#A0C7D1] px-2 py-0.5 rounded-md">
                          {m.isInsulin ? '1 Pen Prescribed' : '60 Tabs (30d supply)'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dispense Action Bar */}
              <div className="mt-5 pt-3.5 border-t border-[#D2E2E6] flex items-center justify-between gap-3">
                {dispensedMap[matchedData.prescription.id] ? (
                  <div className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <CheckCheck size={16} className="text-emerald-700" />
                      <span>Dispensed today at {dispensedMap[matchedData.prescription.id].dispensedAt}</span>
                    </span>
                    <span className="text-[10px] bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-950 font-black">
                      VERIFIED & DEDUCTED
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDispensePrescription(matchedData.prescription.id, matchedData.medicines)}
                    className="btn-primary w-full py-2.5 font-black text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag size={16} />
                    <span>Dispense Prescription & Deduct Live Stock</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column (7 cols): Medicine Stock Counts & Pharmacy Inventory */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-[#D2E2E6] shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#D2E2E6] pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={18} className="text-[#367588]" />
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-950">
                    Respective Medicine Stock Counts in Dispensary
                  </h3>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {matchedData.medicines.length} Item(s) Linked
                </span>
              </div>

              {/* Medicine Stock Cards List */}
              <div className="space-y-3.5">
                {matchedData.medicines.map((m, idx) => {
                  const s = m.stock;
                  const stockHealthPct = Math.min(100, Math.round((s.stockCount / 500) * 100));
                  const isLow = s.stockCount <= s.reorderLevel;

                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-[#D2E2E6] hover:border-[#367588] bg-white transition-all shadow-2xs space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-slate-950 text-sm sm:text-base">
                              {s.name}
                            </h4>
                            <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-800 px-1.5 py-0.2 rounded border border-slate-300">
                              {s.code}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                              isLow
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}>
                              {isLow ? '⚠️ Low Stock' : '🟢 Healthy Stock'}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-600 mt-0.5">
                            {s.brand} • <span className="text-slate-500">{s.category}</span>
                          </p>
                        </div>

                        {/* Big Stock Counter Badge */}
                        <div className="text-left sm:text-right shrink-0 bg-[#F3F8F9] border border-[#D2E2E6] p-2.5 rounded-xl shadow-2xs">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Available Stock
                          </p>
                          <p className="text-lg sm:text-xl font-black text-[#367588] leading-tight">
                            {s.stockCount} <span className="text-xs font-bold text-slate-600">{s.unitsPerPack.split(' ')[0]}</span>
                          </p>
                          <p className="text-[10px] font-semibold text-slate-500 mt-0.5">
                            ({s.totalUnits.toLocaleString()} Total Units)
                          </p>
                        </div>
                      </div>

                      {/* Stock Specs Strip */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-[#F3F8F9] p-2 rounded-lg border border-[#D2E2E6] font-medium text-slate-700">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Batch / Lot</span>
                          <span className="font-mono font-bold text-slate-900">{s.batchNo}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Expiry Date</span>
                          <span className="font-bold text-slate-900">{s.expiryDate}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Location</span>
                          <span className="font-bold text-slate-900 truncate block">{s.shelf}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Reorder Level</span>
                          <span className="font-bold text-slate-900">{s.reorderLevel} units</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                          <span>Inventory Fill Level</span>
                          <span>{stockHealthPct}% Capacity</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLow ? 'bg-amber-500' : 'bg-[#367588]'
                            }`}
                            style={{ width: `${stockHealthPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Matched Single Medicine Result View */}
        {matchedData?.type === 'medicine' && (
          <div className="bg-white rounded-2xl p-5 border border-[#D2E2E6] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D2E2E6] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-black bg-[#367588]/10 text-[#367588] border border-[#A0C7D1] px-2 py-0.5 rounded-md">
                    {matchedData.stock.code}
                  </span>
                  <Badge variant="success">INVENTORY VERIFIED</Badge>
                </div>
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-950 mt-1">
                  {matchedData.stock.name} ({matchedData.stock.brand})
                </h3>
                <p className="text-xs font-semibold text-slate-600">
                  {matchedData.stock.category} • Location: {matchedData.stock.shelf}
                </p>
              </div>

              <div className="bg-[#F3F8F9] border border-[#D2E2E6] p-3 rounded-xl text-right">
                <span className="text-[10px] font-bold text-[#367588] uppercase block">Dispensary Stock</span>
                <span className="text-2xl font-black text-slate-950">{matchedData.stock.stockCount}</span>
                <span className="text-xs font-bold text-[#367588] block">{matchedData.stock.unitsPerPack}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-[#F3F8F9] p-3 rounded-xl border border-[#D2E2E6]">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Batch / Lot No</span>
                <span className="font-mono font-bold text-slate-900">{matchedData.stock.batchNo}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Expiry Date</span>
                <span className="font-bold text-slate-900">{matchedData.stock.expiryDate}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Total Units</span>
                <span className="font-bold text-slate-900">{matchedData.stock.totalUnits.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Reorder Alert Level</span>
                <span className="font-bold text-slate-900">{matchedData.stock.reorderLevel} units</span>
              </div>
            </div>

            {matchedData.relatedPrescriptions?.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Active Prescriptions Utilizing This Medicine ({matchedData.relatedPrescriptions.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matchedData.relatedPrescriptions.map(p => (
                    <div key={p.id} className="p-3 rounded-xl border border-[#D2E2E6] bg-white text-xs flex items-center justify-between">
                      <div>
                        <span className="font-mono font-bold text-[#367588]">{p.id.toUpperCase()}</span>
                        <p className="text-slate-900 font-semibold">{data?.users[p.patientId]?.name}</p>
                      </div>
                      <button
                        onClick={() => setRxCodeInput(p.id)}
                        className="text-[11px] font-bold text-[#367588] hover:underline cursor-pointer"
                      >
                        Inspect Rx →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Not Found View */}
        {matchedData?.type === 'not_found' && (
          <div className="bg-[#F3F8F9] rounded-2xl p-6 text-center border-2 border-dashed border-[#D2E2E6] space-y-2">
            <AlertCircle size={24} className="mx-auto text-slate-400" />
            <h4 className="font-bold text-sm text-slate-900">No match found for &ldquo;{matchedData.query}&rdquo;</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Please check the code format. Try entering a prescription code like <span className="font-mono font-bold text-[#367588]">RX-001</span> or a medicine item code like <span className="font-mono font-bold text-[#367588]">MET-500</span>.
            </p>
          </div>
        )}
      </div>

      {/* ── Complete Dispensary Formulary & Stock Catalog ── */}
      <div className="card border border-[#D2E2E6] bg-white">
        <div className="card-header bg-[#F3F8F9] rounded-t-2xl border-b border-[#D2E2E6] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-[#367588]" />
            <h3 className="font-extrabold text-base text-slate-950">Complete Dispensary Stock Directory</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#367588] border border-[#A0C7D1]">
              {inventoryItems.length} Formulations
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-500">Live Formulary Inventory</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-[#D2E2E6] text-slate-600 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Medicine & Formulation</th>
                <th className="py-3 px-4">Batch / Lot</th>
                <th className="py-3 px-4">Expiry</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4 text-right">Available Stock</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D2E2E6]">
              {inventoryItems.map((item, idx) => {
                const isLow = item.stockCount <= item.reorderLevel;
                return (
                  <tr key={idx} className="hover:bg-[#F3F8F9] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#367588]">
                      {item.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-950">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{item.brand} • {item.category}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.batchNo}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {item.expiryDate}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600">
                      {item.shelf}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-sm text-slate-950">
                      {item.stockCount} <span className="text-[11px] font-normal text-slate-500">{item.unitsPerPack.split(' ')[0]}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isLow
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      }`}>
                        {isLow ? 'Low Stock' : 'Healthy'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setRxCodeInput(item.code);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-[#F3F8F9] text-[#367588] border border-[#A0C7D1] rounded-lg font-bold text-xs transition cursor-pointer"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
