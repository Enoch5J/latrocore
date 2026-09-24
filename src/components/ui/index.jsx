import { useState, useEffect, useRef, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, Loader2, Search, ChevronDown, ChevronLeft, ChevronRight, Trash2, User } from 'lucide-react';

// ── Avatar Component (No Emojis, Pure Clinical Design) ─────────────────
export function Avatar({ user, name, role, size = 'md', className = '' }) {
  const userName = user?.name || name || 'User';
  const userRole = user?.role || role || 'patient';
  
  // Extract clean 2-letter initials
  let initials = user?.avatar;
  if (!initials || /[\p{Extended_Pictographic}]/u.test(initials) || initials.length > 3) {
    const cleanName = userName.replace(/^(Dr\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim();
    const parts = cleanName.split(/\s+/);
    if (parts.length >= 2) {
      initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    } else if (parts[0]) {
      initials = parts[0].slice(0, 2).toUpperCase();
    } else {
      initials = 'LC';
    }
  }

  const roleStyles = {
    patient: 'bg-teal-700 text-white border-teal-800',
    doctor: 'bg-blue-700 text-white border-blue-800',
    pharmacist: 'bg-purple-700 text-white border-purple-800',
    admin: 'bg-slate-800 text-white border-slate-900',
  };

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px] font-bold rounded-lg',
    sm: 'w-8 h-8 text-xs font-bold rounded-lg',
    md: 'w-10 h-10 text-sm font-bold rounded-xl',
    lg: 'w-12 h-12 text-base font-extrabold rounded-xl',
    xl: 'w-14 h-14 text-lg font-black rounded-2xl',
  };

  const style = roleStyles[userRole] || roleStyles.patient;
  const sizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      className={`inline-flex items-center justify-center font-sans tracking-wide border shadow-xs shrink-0 select-none ${style} ${sizeClass} ${className}`}
      title={`${userName} (${userRole})`}
    >
      {initials}
    </div>
  );
}

// ── Toast ───────────────────────────────────────────────────────────────
export function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-start gap-3 p-4 rounded-xl shadow-xl border-2 animate-slide-in ${
          t.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-medium' :
          t.type === 'error' ? 'bg-rose-50 border-rose-300 text-rose-950 font-medium' :
          t.type === 'warning' ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium' :
          'bg-blue-50 border-blue-300 text-blue-950 font-medium'
        }`}>
          {t.type === 'success' && <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-700" />}
          {t.type === 'error' && <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-700" />}
          {t.type === 'warning' && <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-700" />}
          {t.type === 'info' && <Info size={18} className="shrink-0 mt-0.5 text-blue-700" />}
          <div className="flex-1">
            {t.title && <p className="font-bold text-sm text-slate-950">{t.title}</p>}
            <p className="text-sm text-slate-900 leading-snug">{t.message}</p>
          </div>
          <button onClick={() => onRemove(t.id)} className="shrink-0 hover:opacity-70 cursor-pointer p-1 text-slate-700"><X size={16} /></button>
        </div>
      ))}
    </div>
  );
}

// ── Modal ───────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  const overlayRef = useRef(null);
  const firstFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => firstFocusRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : size === 'xl' ? 'max-w-5xl' : 'max-w-xl';

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in" onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClass} max-h-[92vh] flex flex-col border border-slate-300 animate-slide-up`}>
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-950 tracking-tight">{title}</h2>
          <button ref={firstFocusRef} onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-950 transition-colors cursor-pointer" aria-label="Close dialog"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-slate-900">{children}</div>
        {footer && <div className="flex items-center justify-end gap-3 px-5 sm:px-6 py-4 border-t border-slate-200 bg-slate-50/70 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

// ── Confirm Dialog ──────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = 'Confirm', variant = 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title || 'Confirm Action'} size="sm"
      footer={<>
        <button className="btn-outline" onClick={onClose}>Cancel</button>
        <button className={variant === 'danger' ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmText}</button>
      </>}>
      <p className="text-slate-900 font-medium text-sm leading-relaxed">{message}</p>
    </Modal>
  );
}

// ── Loading Spinner ─────────────────────────────────────────────────────
export function LoadingSpinner({ size = 'md', text }) {
  const s = size === 'sm' ? 18 : size === 'lg' ? 36 : 26;
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <Loader2 size={s} className="animate-spin text-teal-700" />
      {text && <p className="text-sm font-bold text-slate-900">{text}</p>}
    </div>
  );
}

// ── Empty State ─────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 text-slate-600">
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-950 mb-1">{title}</h3>
      <p className="text-sm font-semibold text-slate-700 max-w-md mb-4 leading-relaxed">{message}</p>
      {action}
    </div>
  );
}

// ── Search Bar ──────────────────────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder = 'Search...' }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="input pl-10" />
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────
export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-2 border-b-2 border-slate-200 overflow-x-auto pb-px">
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className={`px-4 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 -mb-0.5 transition-all cursor-pointer ${
            activeTab === tab.id ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-700 hover:text-slate-950 hover:border-slate-300'
          }`}>
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-2 px-2 py-0.5 text-xs font-black rounded-full ${activeTab === tab.id ? 'bg-teal-100 text-teal-900' : 'bg-slate-200 text-slate-800'}`}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Badge ───────────────────────────────────────────────────────────────
export function Badge({ variant = 'gray', children, dot }) {
  const classes = {
    primary: 'badge-primary', success: 'badge-success', warning: 'badge-warning',
    danger: 'badge-danger', info: 'badge-info', gray: 'badge-gray',
  };
  return (
    <span className={classes[variant] || classes.gray}>
      {dot && <span className={`w-2 h-2 rounded-full ${
        variant === 'success' ? 'bg-emerald-600' : variant === 'danger' ? 'bg-rose-600' : variant === 'warning' ? 'bg-amber-600' : 'bg-slate-600'
      }`} />}
      {children}
    </span>
  );
}

// ── Tooltip ─────────────────────────────────────────────────────────────
export function Tooltip({ content, children }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-950 rounded-lg whitespace-nowrap z-50 shadow-lg animate-fade-in">
          {content}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
        </span>
      )}
    </span>
  );
}

// ── Select ──────────────────────────────────────────────────────────────
export function Select({ value, onChange, options, placeholder, className = '' }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`input appearance-none pr-9 cursor-pointer ${className}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────
export function StatCard({ label, value, icon: Icon, color = 'primary', subtitle, onClick }) {
  const colorStyles = {
    primary: { iconBg: 'bg-teal-100 text-teal-800', border: 'border-l-4 border-l-teal-600' },
    secondary: { iconBg: 'bg-blue-100 text-blue-800', border: 'border-l-4 border-l-blue-600' },
    success: { iconBg: 'bg-emerald-100 text-emerald-800', border: 'border-l-4 border-l-emerald-600' },
    warning: { iconBg: 'bg-amber-100 text-amber-800', border: 'border-l-4 border-l-amber-600' },
    danger: { iconBg: 'bg-rose-100 text-rose-800', border: 'border-l-4 border-l-rose-600' },
  };
  const current = colorStyles[color] || colorStyles.primary;

  return (
    <div
      className={`card p-5 ${current.border} ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md transition-all' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-800 truncate">{label}</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-950 mt-1.5 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs font-semibold text-slate-700 mt-1 truncate">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${current.iconBg} shrink-0`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Pagination ──────────────────────────────────────────────────────────
export function usePagination(items, perPage = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.ceil(items.length / perPage);
  const paginated = items.slice((page - 1) * perPage, page * perPage);

  useEffect(() => { if (page > totalPages && totalPages > 0) setPage(totalPages); }, [totalPages, page]);

  return { page, setPage, totalPages, paginated, total: items.length };
}

export function Pagination({ page, totalPages, onPageChange, total }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 gap-2 flex-wrap">
      <p className="text-xs sm:text-sm font-semibold text-slate-800">Showing page {page} of {totalPages} ({total} items)</p>
      <div className="flex gap-1.5">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="btn-outline btn-sm"><ChevronLeft size={14} /></button>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="btn-outline btn-sm"><ChevronRight size={14} /></button>
      </div>
    </div>
  );
}

