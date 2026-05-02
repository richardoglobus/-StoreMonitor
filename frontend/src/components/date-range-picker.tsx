import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CalendarDays } from "lucide-react";

interface DateRangePickerProps {
  from: string;   // YYYY-MM-DD
  to: string;     // YYYY-MM-DD
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  label?: boolean;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, label = true }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        {label && <Label className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" />From</Label>}
        <Input type="date" value={from} onChange={e => onFromChange(e.target.value)} className="w-40 text-sm" />
      </div>
      <div className="space-y-1">
        {label && <Label className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="h-3 w-3" />To</Label>}
        <Input type="date" value={to} max={new Date().toISOString().slice(0,10)} onChange={e => onToChange(e.target.value)} className="w-40 text-sm" />
      </div>
    </div>
  );
}

// Convert YYYY-MM-DD to YYYY-MM for API calls that still need month
export function dateToMonth(date: string) {
  return date.slice(0, 7);
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
