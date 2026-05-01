import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, subMonths, addMonths } from "date-fns";

interface MonthPickerProps {
  month: string; // YYYY-MM
  onChange: (month: string) => void;
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const date = parseISO(`${month}-01`);

  const handlePrev = () => {
    onChange(format(subMonths(date, 1), "yyyy-MM"));
  };

  const handleNext = () => {
    onChange(format(addMonths(date, 1), "yyyy-MM"));
  };

  return (
    <div className="flex items-center gap-2 bg-card border rounded-md p-1 shadow-sm">
      <Button variant="ghost" size="icon" onClick={handlePrev} className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="w-32 text-center font-medium text-sm">
        {format(date, "MMMM yyyy")}
      </div>
      <Button variant="ghost" size="icon" onClick={handleNext} className="h-8 w-8 text-muted-foreground hover:text-foreground">
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function getCurrentMonth() {
  return format(new Date(), "yyyy-MM");
}
