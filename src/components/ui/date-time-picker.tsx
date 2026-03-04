import * as React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DateTimePickerProps {
  value?: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
}

export function DateTimePicker({ value, onChange, placeholder = 'Pick date & time' }: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const selectedHour = value ? value.getHours() : null;
  const selectedMinute = value ? value.getMinutes() : null;

  const handleDateSelect = (day: Date | undefined) => {
    if (!day) { onChange(null); return; }
    const h = value ? value.getHours() : 20;
    const m = value ? value.getMinutes() : 0;
    const newDate = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
    onChange(newDate);
  };

  const handleHourSelect = (h: number) => {
    const base = value || new Date();
    const newDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, base.getMinutes());
    onChange(newDate);
  };

  const handleMinuteSelect = (m: number) => {
    const base = value || new Date();
    const newDate = new Date(base.getFullYear(), base.getMonth(), base.getDate(), base.getHours(), m);
    onChange(newDate);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'dd.MM.yyyy – HH:mm') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={handleDateSelect}
            initialFocus
            className={cn('p-3 pointer-events-auto')}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          />
          <div className="flex border-l border-border">
            {/* Hours */}
            <div className="flex flex-col">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center border-b border-border">
                <Clock className="h-3 w-3 mx-auto" />
              </div>
              <ScrollArea className="h-[280px] w-12">
                <div className="p-1">
                  {hours.map((h) => (
                    <button
                      key={h}
                      onClick={() => handleHourSelect(h)}
                      className={cn(
                        'w-full rounded-md px-1 py-1.5 text-xs text-center transition-colors',
                        selectedHour === h
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {String(h).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {/* Minutes */}
            <div className="flex flex-col border-l border-border">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground text-center border-b border-border">
                <span className="text-[10px]">min</span>
              </div>
              <ScrollArea className="h-[280px] w-12">
                <div className="p-1">
                  {minutes.map((m) => (
                    <button
                      key={m}
                      onClick={() => handleMinuteSelect(m)}
                      className={cn(
                        'w-full rounded-md px-1 py-1.5 text-xs text-center transition-colors',
                        selectedMinute === m
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      {String(m).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
