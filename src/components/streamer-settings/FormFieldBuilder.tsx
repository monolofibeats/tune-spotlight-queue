import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
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
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/hooks/useLanguage';

const CORE_FIELD_NAMES = new Set(['song_url', 'file_upload', 'artist_name', 'song_title', 'email', 'message']);
const CORE_FIELD_TYPE_MAP: Record<string, string> = {
  song_url: 'url',
  file_upload: 'file',
  artist_name: 'text',
  song_title: 'text',
  email: 'email',
  message: 'textarea',
};

// Default core fields to auto-seed if missing from DB
const CORE_FIELD_DEFAULTS: { field_name: string; field_label: string; field_type: string; is_required: boolean; is_enabled: boolean; field_order: number }[] = [
  { field_name: 'song_url', field_label: 'Song Link', field_type: 'url', is_required: true, is_enabled: true, field_order: 0 },
  { field_name: 'file_upload', field_label: 'Upload File', field_type: 'file', is_required: false, is_enabled: true, field_order: 1 },
  { field_name: 'artist_name', field_label: 'Artist Name', field_type: 'text', is_required: false, is_enabled: true, field_order: 2 },
  { field_name: 'song_title', field_label: 'Song Title', field_type: 'text', is_required: false, is_enabled: true, field_order: 3 },
  { field_name: 'email', field_label: 'Email', field_type: 'email', is_required: false, is_enabled: true, field_order: 4 },
  { field_name: 'message', field_label: 'Message', field_type: 'textarea', is_required: false, is_enabled: true, field_order: 5 },
];

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

export interface FormFieldBuilderHandle {
  save: () => Promise<void>;
  discard: () => void;
  hasChanges: boolean;
}

interface FormFieldBuilderProps {
  streamerId: string;
  onChangeStatus?: (hasChanges: boolean) => void;
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: Type },
  { value: 'url', label: 'URL', icon: Link2 },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'number', label: 'Number', icon: Hash },
  { value: 'textarea', label: 'Long Text', icon: FileText },
  { value: 'select', label: 'Dropdown', icon: List },
  { value: 'toggle', label: 'Yes/No', icon: ToggleLeft },
  { value: 'file', label: 'File Upload', icon: FileText },
];

function fieldsEqual(a: FormField[], b: FormField[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i].id !== b[i].id ||
      a[i].field_label !== b[i].field_label ||
      a[i].field_type !== b[i].field_type ||
      a[i].placeholder !== b[i].placeholder ||
      a[i].is_required !== b[i].is_required ||
      a[i].is_enabled !== b[i].is_enabled ||
      a[i].field_order !== b[i].field_order
    ) return false;
  }
  return true;
}

export const FormFieldBuilder = forwardRef<FormFieldBuilderHandle, FormFieldBuilderProps>(function FormFieldBuilder({ streamerId, onChangeStatus }, ref) {
  const { t } = useLanguage();
  const [fields, setFields] = useState<FormField[]>([]);
  const [savedFields, setSavedFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const parseFields = (data: any[]): FormField[] =>
    data.map(f => ({
      ...f,
      placeholder: f.placeholder ?? '',
      is_required: f.is_required ?? false,
      is_enabled: f.is_enabled ?? true,
      field_order: f.field_order ?? 0,
      options: f.options as { values: string[] } | undefined,
    }));

  const fetchFields = useCallback(async () => {
    const { data, error } = await supabase
      .from('streamer_form_fields')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('field_order');

    if (!error && data) {
      const parsed = parseFields(data);

      // Auto-seed any missing core fields
      const existingNames = new Set(parsed.map(f => f.field_name));
      const missingDefaults = CORE_FIELD_DEFAULTS.filter(d => !existingNames.has(d.field_name));

      if (missingDefaults.length > 0) {
        const maxOrder = parsed.length > 0 ? Math.max(...parsed.map(f => f.field_order)) + 1 : 0;
        const toInsert = missingDefaults.map((d, i) => ({
          streamer_id: streamerId,
          field_name: d.field_name,
          field_label: d.field_label,
          field_type: d.field_type,
          placeholder: '',
          is_required: d.is_required,
          is_enabled: d.is_enabled,
          field_order: maxOrder + i,
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('streamer_form_fields')
          .insert(toInsert)
          .select();

        if (!insertError && inserted) {
          const allParsed = [...parsed, ...parseFields(inserted)].sort((a, b) => a.field_order - b.field_order);
          setFields(allParsed);
          setSavedFields(allParsed);
        } else {
          setFields(parsed);
          setSavedFields(parsed);
        }
      } else {
        setFields(parsed);
        setSavedFields(parsed);
      }
    }
    setIsLoading(false);
  }, [streamerId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Track changes
  useEffect(() => {
    const changed = !fieldsEqual(fields, savedFields);
    setHasChanges(changed);
    onChangeStatus?.(changed);
  }, [fields, savedFields, onChangeStatus]);

  const handleSave = async () => {
    // Find changed fields and batch update
    const updates: PromiseLike<any>[] = [];
    for (const field of fields) {
      const saved = savedFields.find(s => s.id === field.id);
      if (!saved) continue;
      if (
        field.field_label !== saved.field_label ||
        field.field_type !== saved.field_type ||
        field.placeholder !== saved.placeholder ||
        field.is_required !== saved.is_required ||
        field.is_enabled !== saved.is_enabled ||
        field.field_order !== saved.field_order
      ) {
        updates.push(
          supabase.from('streamer_form_fields').update({
            field_label: field.field_label,
            field_type: field.field_type,
            placeholder: field.placeholder,
            is_required: field.is_required,
            is_enabled: field.is_enabled,
            field_order: field.field_order,
          }).eq('id', field.id)
        );
      }
    }

    if (updates.length > 0) {
      const results = await Promise.all(updates);
      const hasError = results.some((r: any) => r.error);
      if (hasError) {
        toast({ title: t('formBuilder.failedSave'), variant: 'destructive' });
        return;
      }
    }

    // Sync saved state
    setSavedFields([...fields]);
  };

  const handleDiscard = () => {
    setFields([...savedFields]);
  };

  useImperativeHandle(ref, () => ({
    save: handleSave,
    discard: handleDiscard,
    hasChanges,
  }), [hasChanges, fields, savedFields]);

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
      const parsed = parseFields([data])[0];
      setFields(prev => [...prev, parsed]);
      setSavedFields(prev => [...prev, parsed]);
    } else {
      toast({ title: t('formBuilder.failedAdd'), variant: 'destructive' });
    }
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = async (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    setSavedFields(prev => prev.filter(f => f.id !== id));
    const { error } = await supabase
      .from('streamer_form_fields')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: t('formBuilder.failedDelete'), variant: 'destructive' });
      fetchFields();
    }
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...fields];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newFields.length) return;

    [newFields[index], newFields[swapIndex]] = [newFields[swapIndex], newFields[index]];
    const reordered = newFields.map((f, i) => ({ ...f, field_order: i }));
    setFields(reordered);
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">{t('formBuilder.title')}</CardTitle>
            <CardDescription>{t('formBuilder.desc')}</CardDescription>
          </div>
          <Button onClick={addField} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            {t('formBuilder.addField')}
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t('formBuilder.noFields')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => {
                const isCoreField = CORE_FIELD_NAMES.has(field.field_name);
                const displayType = isCoreField
                  ? (CORE_FIELD_TYPE_MAP[field.field_name] ?? field.field_type)
                  : field.field_type;
                const typeInfo = FIELD_TYPES.find(t => t.value === displayType);

                return (
                  <div
                    key={field.id}
                    className={`p-4 rounded-lg border transition-colors ${field.is_enabled ? 'bg-card border-border' : 'bg-muted/30 border-border/50 opacity-60'}`}
                  >
                    {isCoreField && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Lock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{t('formBuilder.coreField')}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{t('formBuilder.builtIn')}</Badge>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === 0} onClick={() => moveField(index, 'up')}>
                          <ChevronUp className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={index === fields.length - 1} onClick={() => moveField(index, 'down')}>
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">{t('formBuilder.label')}</Label>
                          <Input
                            value={field.field_label}
                            onChange={(e) => updateField(field.id, { field_label: e.target.value })}
                            className="h-9"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">{t('formBuilder.type')}</Label>
                          {isCoreField ? (
                            <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-border/50 bg-muted/30 text-sm text-muted-foreground">
                              {typeInfo && <typeInfo.icon className="w-3 h-3 shrink-0" />}
                              <span>{typeInfo?.label ?? displayType}</span>
                              <Lock className="w-3 h-3 ml-auto shrink-0 opacity-50" />
                            </div>
                          ) : (
                            <Select value={field.field_type} onValueChange={(value) => updateField(field.id, { field_type: value })}>
                              <SelectTrigger className="h-9">
                                <SelectValue>
                                  {(() => {
                                    const ft = FIELD_TYPES.find(ft => ft.value === field.field_type);
                                    return ft ? (
                                      <div className="flex items-center gap-2">
                                        <ft.icon className="w-3 h-3" />
                                        {ft.label}
                                      </div>
                                    ) : <span>Select type</span>;
                                  })()}
                                </SelectValue>
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
                          )}
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs">{t('formBuilder.placeholder')}</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder={t('formBuilder.placeholderHint')}
                            className="h-9"
                          />
                        </div>

                        <div className="flex items-end gap-4 pb-1">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`required-${field.id}`}
                              checked={field.is_required}
                              onCheckedChange={(checked) => updateField(field.id, { is_required: checked })}
                            />
                            <Label htmlFor={`required-${field.id}`} className="text-xs">{t('formBuilder.required')}</Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-5 shrink-0">
                        <Switch
                          checked={field.is_enabled}
                          onCheckedChange={(checked) => updateField(field.id, { is_enabled: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => !isCoreField && deleteField(field.id)}
                          disabled={isCoreField}
                          className="text-destructive hover:text-destructive disabled:opacity-30"
                          title={isCoreField ? t('formBuilder.cannotDelete') : t('formBuilder.deleteField')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
