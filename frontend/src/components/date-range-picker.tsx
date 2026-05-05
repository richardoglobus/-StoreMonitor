import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";

interface DateRangePickerProps {
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  label?: boolean;
}

export function DateRangePicker({ from, to, onFromChange, onToChange, label = true }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1">
        {label && (
          <Label className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />From
          </Label>
        )}
        <div className="relative">
          <input
            type="date"
            value={from}
            onChange={e => onFromChange(e.target.value)}
            className="w-40 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm
              text-foreground
              [color-scheme:light]
              dark:[color-scheme:dark]
              focus:outline-none focus:ring-1 focus:ring-ring
              cursor-pointer"
          />
        </div>
      </div>
      <div className="space-y-1">
        {label && (
          <Label className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />To
          </Label>
        )}
        <div className="relative">
          <input
            type="date"
            value={to}
            max={new Date().toISOString().slice(0, 10)}
            onChange={e => onToChange(e.target.value)}
            className="w-40 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm
              text-foreground
              [color-scheme:light]
              dark:[color-scheme:dark]
              focus:outline-none focus:ring-1 focus:ring-ring
              cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}

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
