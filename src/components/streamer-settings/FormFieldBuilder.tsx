import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Type, 
  Link2, 
  Mail, 
  Hash, 
  List,
  ToggleLeft,
  FileText,
  Music,
  Gamepad2,
  Star,
  Loader2
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

const TEMPLATES = [
  {
    id: 'music',
    name: 'Music Review',
    icon: Music,
    description: 'Song URL, Artist, Title, Platform, Message',
    fields: [
      { field_name: 'song_url', field_label: 'Song URL', field_type: 'url', placeholder: 'Paste your Spotify, SoundCloud, or YouTube link...', is_required: true },
      { field_name: 'artist_name', field_label: 'Artist Name', field_type: 'text', placeholder: 'Your artist/band name', is_required: true },
      { field_name: 'song_title', field_label: 'Song Title', field_type: 'text', placeholder: 'Name of your track', is_required: true },
      { field_name: 'platform', field_label: 'Platform', field_type: 'select', placeholder: 'Select platform', is_required: true, options: { values: ['spotify', 'soundcloud', 'youtube', 'bandcamp', 'other'] } },
      { field_name: 'message', field_label: 'Message', field_type: 'textarea', placeholder: 'Tell us about your track... (optional)', is_required: false },
    ]
  },
  {
    id: 'games',
    name: 'Game Review',
    icon: Gamepad2,
    description: 'Game Name, Platform, Genre, Link',
    fields: [
      { field_name: 'game_name', field_label: 'Game Name', field_type: 'text', placeholder: 'Name of your game', is_required: true },
      { field_name: 'game_url', field_label: 'Game Link', field_type: 'url', placeholder: 'Steam, itch.io, or website link...', is_required: true },
      { field_name: 'platform', field_label: 'Platform', field_type: 'select', placeholder: 'Select platform', is_required: true, options: { values: ['steam', 'epic', 'itch.io', 'playstation', 'xbox', 'switch', 'mobile', 'other'] } },
      { field_name: 'genre', field_label: 'Genre', field_type: 'text', placeholder: 'e.g., RPG, Puzzle, Action...', is_required: false },
      { field_name: 'description', field_label: 'Description', field_type: 'textarea', placeholder: 'Tell us about your game...', is_required: false },
    ]
  },
  {
    id: 'ratings',
    name: 'General Rating',
    icon: Star,
    description: 'Item, Category, Link, Description',
    fields: [
      { field_name: 'item_name', field_label: 'What to Rate', field_type: 'text', placeholder: 'Name of item/content to review', is_required: true },
      { field_name: 'item_url', field_label: 'Link (optional)', field_type: 'url', placeholder: 'URL to the content...', is_required: false },
      { field_name: 'category', field_label: 'Category', field_type: 'text', placeholder: 'e.g., Art, Profile, Video...', is_required: false },
      { field_name: 'description', field_label: 'Description', field_type: 'textarea', placeholder: 'Any additional context...', is_required: false },
    ]
  }
];

export function FormFieldBuilder({ streamerId }: FormFieldBuilderProps) {
  const [fields, setFields] = useState<FormField[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchFields();
  }, [streamerId]);

  const fetchFields = async () => {
    const { data, error } = await supabase
      .from('streamer_form_fields')
      .select('*')
      .eq('streamer_id', streamerId)
      .order('field_order');

    if (!error && data) {
      setFields(data.map(f => ({
        ...f,
        options: f.options as { values: string[] } | undefined
      })));
    }
    setIsLoading(false);
  };

  const applyTemplate = async (templateId: string) => {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setIsSaving(true);

    // Delete existing fields
    await supabase
      .from('streamer_form_fields')
      .delete()
      .eq('streamer_id', streamerId);

    // Insert new fields
    const newFields = template.fields.map((f, index) => ({
      streamer_id: streamerId,
      field_name: f.field_name,
      field_label: f.field_label,
      field_type: f.field_type,
      placeholder: f.placeholder,
      is_required: f.is_required,
      is_enabled: true,
      field_order: index,
      options: f.options || null,
    }));

    const { error } = await supabase
      .from('streamer_form_fields')
      .insert(newFields);

    if (error) {
      toast({ title: 'Failed to apply template', variant: 'destructive' });
    } else {
      toast({ title: `${template.name} template applied!` });
      fetchFields();
    }

    setIsSaving(false);
  };

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
      setFields([...fields, { 
        ...data, 
        options: data.options as { values: string[] } | undefined 
      }]);
    }
  };

  const updateField = async (id: string, updates: Partial<FormField>) => {
    const { error } = await supabase
      .from('streamer_form_fields')
      .update(updates)
      .eq('id', id);

    if (!error) {
      setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
    }
  };

  const deleteField = async (id: string) => {
    const { error } = await supabase
      .from('streamer_form_fields')
      .delete()
      .eq('id', id);

    if (!error) {
      setFields(fields.filter(f => f.id !== id));
    }
  };

  const reorderFields = async (newOrder: FormField[]) => {
    setFields(newOrder);
    
    // Update order in database
    for (let i = 0; i < newOrder.length; i++) {
      await supabase
        .from('streamer_form_fields')
        .update({ field_order: i })
        .eq('id', newOrder[i].id);
    }
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
      {/* Templates */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Quick Templates</CardTitle>
          <CardDescription>Start with a pre-configured form template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {TEMPLATES.map((template) => (
              <Button
                key={template.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 hover:border-primary/50"
                onClick={() => applyTemplate(template.id)}
                disabled={isSaving}
              >
                <div className="flex items-center gap-2">
                  <template.icon className="w-5 h-5 text-primary" />
                  <span className="font-medium">{template.name}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left">
                  {template.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Form Fields</CardTitle>
            <CardDescription>Drag to reorder, toggle to enable/disable</CardDescription>
          </div>
          <Button onClick={addField} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Add Field
          </Button>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No custom fields yet. Choose a template or add fields manually.</p>
            </div>
          ) : (
            <Reorder.Group axis="y" values={fields} onReorder={reorderFields} className="space-y-3">
              {fields.map((field) => (
                <Reorder.Item key={field.id} value={field}>
                  <motion.div
                    className={`p-4 rounded-lg border ${field.is_enabled ? 'bg-card border-border' : 'bg-muted/30 border-border/50 opacity-60'}`}
                    layout
                  >
                    <div className="flex items-start gap-3">
                      <div className="cursor-grab pt-2">
                        <GripVertical className="w-5 h-5 text-muted-foreground" />
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Label</Label>
                          <Input
                            value={field.field_label}
                            onChange={(e) => updateField(field.id, { field_label: e.target.value })}
                            className="h-9"
                          />
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={field.field_type}
                            onValueChange={(value) => updateField(field.id, { field_type: value })}
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
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={field.placeholder || ''}
                            onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                            placeholder="Hint text..."
                            className="h-9"
                          />
                        </div>

                        <div className="flex items-end gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`required-${field.id}`}
                              checked={field.is_required}
                              onCheckedChange={(checked) => updateField(field.id, { is_required: checked })}
                            />
                            <Label htmlFor={`required-${field.id}`} className="text-xs">Required</Label>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-6">
                        <Switch
                          checked={field.is_enabled}
                          onCheckedChange={(checked) => updateField(field.id, { is_enabled: checked })}
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
                  </motion.div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
