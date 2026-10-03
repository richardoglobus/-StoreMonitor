import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export type SearchOption = { value: string; label: string; hint?: string };

/** Searchable dropdown with a magnifier icon, matching the ERP-style forms. */
export function SearchSelect({ options, value, onChange, placeholder, disabled }: {
  options: SearchOption[]; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (t ? options.filter(o => o.label.toLowerCase().includes(t)) : options).slice(0, 50);
  }, [options, q]);

  return (
    <div ref={ref} className="relative">
      <div className={`flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2 text-sm ${disabled ? "opacity-60" : "focus-within:ring-1 focus-within:ring-ring"}`}>
        <Search className="h-3.5 w-3.5 shrink-0 text-blue-500" />
        <input
          disabled={disabled}
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={placeholder}
          value={open ? q : (selected?.label ?? "")}
          onFocus={() => setOpen(true)}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
        />
        {value && !disabled && <button type="button" onClick={() => { onChange(""); setQ(""); }} className="text-muted-foreground hover:text-foreground"><X className="h-3.5 w-3.5" /></button>}
      </div>
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filtered.length === 0 && <div className="px-2 py-1.5 text-xs text-muted-foreground">No matches</div>}
          {filtered.map(o => (
            <button type="button" key={o.value} onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
              className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent">
              <span className="truncate">{o.label}</span>{o.hint && <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
