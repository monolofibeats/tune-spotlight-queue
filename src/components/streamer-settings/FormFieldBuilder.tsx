import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Trash2, 
  Type, 
  Link2, 
  Mail, 
  Hash, 
  List,
  ToggleLeft,
  FileText,
  Loader2,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FormField {
  id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  placeholder: string;
  is_required: boolean;
  is_enabled: boolean;
  field_order: number;
  options?: { values: string[] };
}

interface FormFieldBuilderProps {
  streamerId: string;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'url', label: 'URL', icon: Link2 },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'textarea', label: 'Long Text', icon: FileText },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'toggle', label: 'Yes/No', icon: ToggleLeft },
];

export function FormFieldBuilder({ streamerId }: FormFieldBuilderProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFields = useCallback(async () => {
    const { data, error } = await supabase
      .from('streamer_form_fields')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('field_order');

    if (!error && data) {
      setFields(data.map(f => ({
        ...f,
        placeholder: f.placeholder ?? '',
        is_required: f.is_required ?? false,
        is_enabled: f.is_enabled ?? true,
        field_order: f.field_order ?? 0,
        options: f.options as { values: string[] } | undefined,
      })));
    }
    setIsLoading(false);
  }, [streamerId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  const addField = async () => {
    const newField = {
      streamer_id: streamerId,
      field_name: `field_${Date.now()}`,
      field_label: 'New Field',
      field_type: 'text',
      placeholder: '',
      is_required: false,
      is_enabled: true,
      field_order: fields.length,
    };

    const { data, error } = await supabase
      .from('streamer_form_fields')
      .insert(newField)
      .select()
      .single();

    if (!error && data) {
      setFields(prev => [...prev, {
        ...data,
        placeholder: data.placeholder ?? '',
        is_required: data.is_required ?? false,
        is_enabled: data.is_enabled ?? true,
        field_order: data.field_order ?? 0,
        options: data.options as { values: string[] } | undefined,
      }]);
    } else {
      toast({ title: 'Failed to add field', variant: 'destructive' });
    }
  };

  // Update field both locally and in DB, then refetch to ensure UI is in sync
  const updateField = async (id: string, updates: Partial<FormField>) => {
    // Optimistic update
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));

    const { error } = await supabase
      .from('streamer_form_fields')
      .update(updates)
      .eq('id', id);

    if (error) {
      toast({ title: 'Failed to save change', variant: 'destructive' });
    }
    // Always refetch to ensure UI reflects actual DB state
    await fetchFields();
  };

  const deleteField = async (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    const { error } = await supabase
      .from('streamer_form_fields')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Failed to delete field', variant: 'destructive' });
      fetchFields();
    }
  };

  const moveField = async (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newFields.length) return;

    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    const reordered = newFields.map((f, i) => ({ ...f, field_order: i }));
    setFields(reordered);

    await Promise.all([
      supabase.from('streamer_form_fields').update({ field_order: reordered[index].field_order }).eq('id', reordered[index].id),
      supabase.from('streamer_form_fields').update({ field_order: reordered[swapIndex].field_order }).eq('id', reordered[swapIndex].id),
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Form Fields</CardTitle>
            <CardDescription>Configure what submitters fill in</CardDescription>
          </div>
          <Button onClick={addField} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fields yet. Add fields manually.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className={`p-4 rounded-lg border transition-colors ${field.is_enabled ? 'bg-card border-border' : 'bg-muted/30 border-border/50 opacity-60'}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Up/Down reorder */}
                    <div className="flex flex-col gap-1 pt-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === 0}
                        onClick={() => moveField(index, 'up')}
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(index, 'down')}
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Label */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Label</Label>
                        <Input
                          defaultValue={field.field_label}
                          onBlur={(e) => {
                            const val = e.target.value;
                            void updateField(field.id, { field_label: val });
                          }}
                          className="h-9"
                        />
                      </div>

                      {/* Type */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Type</Label>
                        <Select
                          value={field.field_type}
                          onValueChange={(value) => {
                            void updateField(field.id, { field_type: value });
                          }}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex items-center gap-2">
                                  <type.icon className="w-3 h-3" />
                                  {type.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Placeholder */}
                      <div className="space-y-1.5">
                        <Label className="text-xs">Placeholder</Label>
                        <Input
                          defaultValue={field.placeholder || ''}
                          onBlur={(e) => {
                            const val = e.target.value;
                            void updateField(field.id, { placeholder: val });
                          }}
                          placeholder="Hint text..."
                          className="h-9"
                        />
                      </div>

                      {/* Required */}
                      <div className="flex items-end gap-4 pb-1">
                        <div className="flex items-center gap-2">
                          <Switch
                            id={`required-${field.id}`}
                            checked={field.is_required}
                            onCheckedChange={(checked) => {
                              void updateField(field.id, { is_required: checked });
                            }}
                          />
                          <Label htmlFor={`required-${field.id}`} className="text-xs">Required</Label>
                        </div>
                      </div>
                    </div>

                    {/* Enable toggle + Delete */}
                    <div className="flex items-center gap-2 pt-5 shrink-0">
                      <Switch
                        checked={field.is_enabled}
                        onCheckedChange={(checked) => {
                          void updateField(field.id, { is_enabled: checked });
                        }}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteField(field.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
