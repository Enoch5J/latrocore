import { useState, useRef, useEffect, useMemo } from 'react';
import { ALL_COUNTRIES, PREFERRED_COUNTRIES } from '../../data/countryPhoneCodes';
import { AlertCircle } from 'lucide-react';

export default function PhoneInputWithCountry({
  value = '',
  onChange,
  countryCode = '+91',
  onCountryCodeChange,
  error = '',
  onBlur,
  disabled = false,
  required = true,
  label = 'Mobile Number',
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIso, setSelectedIso] = useState('in');
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const phoneInputRef = useRef(null);
  const itemRefs = useRef({});

  // Sync selected country by ISO or countryCode
  const selectedCountry = useMemo(() => {
    return (
      ALL_COUNTRIES.find((c) => c.iso === selectedIso) ||
      ALL_COUNTRIES.find((c) => c.code === countryCode) ||
      ALL_COUNTRIES[0]
    );
  }, [selectedIso, countryCode]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle selecting a country
  const handleSelectCountry = (country) => {
    setSelectedIso(country.iso);
    if (onCountryCodeChange) {
      onCountryCodeChange(country.code, country);
    }
    setIsOpen(false);
    if (phoneInputRef.current) {
      phoneInputRef.current.focus();
    }
  };

  // Keyboard navigation & type-ahead
  const [typeAhead, setTypeAhead] = useState('');
  const typeAheadTimerRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }

    if (isOpen && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const newQuery = (typeAhead + e.key).toLowerCase();
      setTypeAhead(newQuery);

      if (typeAheadTimerRef.current) clearTimeout(typeAheadTimerRef.current);
      typeAheadTimerRef.current = setTimeout(() => setTypeAhead(''), 800);

      const target = ALL_COUNTRIES.find((c) =>
        c.name.toLowerCase().startsWith(newQuery)
      );
      if (target && itemRefs.current[target.iso]) {
        itemRefs.current[target.iso].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <label className="block text-sm font-semibold text-stone-700 shrink-0">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <span className="text-xs text-stone-400 font-normal truncate">
          Code: {selectedCountry.code}
        </span>
      </div>

      {/* Unified Input Container matching the screenshot */}
      <div
        className={`relative flex items-center rounded-xl border transition-all ${
          error
            ? 'border-red-300 bg-red-50/20 focus-within:border-red-500 focus-within:ring-3 focus-within:ring-red-500/15'
            : 'border-stone-200 bg-stone-50/40 hover:border-stone-300 focus-within:bg-white focus-within:border-[#046A38] focus-within:ring-3 focus-within:ring-[#046A38]/15'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-stone-100' : ''}`}
      >
        {/* Country Flag & Dropdown Trigger Button (Flag + downward arrow) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="h-full py-3 pl-3 pr-2 flex items-center gap-1.5 hover:bg-stone-100/70 active:bg-stone-200/50 rounded-l-xl transition-colors cursor-pointer shrink-0 border-r border-stone-200/80 group"
          title={`Selected: ${selectedCountry.name} (${selectedCountry.code}). Click to choose country.`}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <img
            src={`https://flagcdn.com/w20/${selectedCountry.iso.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/w40/${selectedCountry.iso.toLowerCase()}.png 2x`}
            width="20"
            height="14"
            alt={selectedCountry.name}
            className="rounded-xs object-cover shrink-0 shadow-2xs border border-stone-200/50"
          />
          <span className="text-[8px] text-stone-500 group-hover:text-stone-800 leading-none select-none transition-transform duration-150">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {/* Phone Number Input */}
        <input
          ref={phoneInputRef}
          type="tel"
          disabled={disabled}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={selectedCountry.placeholder || '234 567 8900'}
          className="flex-1 min-w-0 px-3.5 py-3 text-sm text-stone-900 bg-transparent placeholder:text-stone-400 focus:outline-none"
        />
      </div>

      {/* Country Dropdown Panel matching screenshot */}
      {isOpen && (
        <div
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 bg-white border border-stone-300 rounded-xl shadow-2xl shadow-stone-900/15 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* Scrollable Country List */}
          <div className="max-h-60 overflow-y-auto overscroll-contain py-1 text-xs">
            {/* 1. Preferred Countries pinned at top (US, India, UK, Australia) */}
            <div className="py-0.5">
              {PREFERRED_COUNTRIES.map((c) => (
                <button
                  key={`pref-${c.iso}`}
                  type="button"
                  ref={(el) => {
                    itemRefs.current[c.iso] = el;
                  }}
                  onClick={() => handleSelectCountry(c)}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#E8F5EE] transition-colors cursor-pointer ${
                    selectedCountry.iso === c.iso
                      ? 'bg-[#E8F5EE] font-semibold text-[#046A38]'
                      : 'text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <img
                      src={`https://flagcdn.com/w20/${c.iso.toLowerCase()}.png`}
                      srcSet={`https://flagcdn.com/w40/${c.iso.toLowerCase()}.png 2x`}
                      width="18"
                      height="13"
                      alt=""
                      className="rounded-xs object-cover shrink-0 border border-stone-200/50"
                      loading="lazy"
                    />
                    <span className="truncate text-xs">{c.name}</span>
                  </div>
                  <span className="font-mono text-stone-500 text-xs shrink-0 ml-2">
                    {c.code}
                  </span>
                </button>
              ))}
            </div>

            {/* Subtle Divider */}
            <div className="my-1 border-t border-stone-200" />

            {/* 2. All alphabetical countries starting with Afghanistan +93 */}
            <div className="py-0.5">
              {ALL_COUNTRIES.filter((c) => !c.preferred).map((c, idx) => (
                <button
                  key={`all-${c.iso}-${idx}`}
                  type="button"
                  ref={(el) => {
                    if (!itemRefs.current[c.iso]) itemRefs.current[c.iso] = el;
                  }}
                  onClick={() => handleSelectCountry(c)}
                  className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#E8F5EE] transition-colors cursor-pointer ${
                    selectedCountry.iso === c.iso && selectedCountry.code === c.code
                      ? 'bg-[#E8F5EE] font-semibold text-[#046A38]'
                      : 'text-stone-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <img
                      src={`https://flagcdn.com/w20/${c.iso.toLowerCase()}.png`}
                      srcSet={`https://flagcdn.com/w40/${c.iso.toLowerCase()}.png 2x`}
                      width="18"
                      height="13"
                      alt=""
                      className="rounded-xs object-cover shrink-0 border border-stone-200/50"
                      loading="lazy"
                    />
                    <span className="truncate text-xs">{c.name}</span>
                  </div>
                  <span className="font-mono text-stone-500 text-xs shrink-0 ml-2">
                    {c.code}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error or Hint Message */}
      {error ? (
        <p className="text-xs text-[#E34222] font-semibold mt-1 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : (
        <p className="text-xs text-stone-400 mt-1">
          Format: {selectedCountry.hint || 'Enter valid mobile number'}.
        </p>
      )}
    </div>
  );
}
