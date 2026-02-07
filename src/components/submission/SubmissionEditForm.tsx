import { useState } from 'react';
import { Save, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SubmissionEditFormProps {
  submission: {
    id: string;
    song_url: string;
    artist_name: string;
    song_title: string;
    message: string | null;
    email: string | null;
  };
  onSave: (id: string, updates: {
    song_url: string;
    artist_name: string;
    song_title: string;
    message: string | null;
    email: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

export function SubmissionEditForm({ submission, onSave, onCancel }: SubmissionEditFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    song_url: submission.song_url,
    artist_name: submission.artist_name,
    song_title: submission.song_title,
    message: submission.message || '',
    email: submission.email || '',
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(submission.id, {
        song_url: formData.song_url,
        artist_name: formData.artist_name,
        song_title: formData.song_title,
        message: formData.message || null,
        email: formData.email || null,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 pt-2" onClick={(e) => e.stopPropagation()}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Artist Name</Label>
          <Input
            value={formData.artist_name}
            onChange={(e) => setFormData({ ...formData, artist_name: e.target.value })}
            className="h-8 text-sm"
            placeholder="Artist name"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Song Title</Label>
          <Input
            value={formData.song_title}
            onChange={(e) => setFormData({ ...formData, song_title: e.target.value })}
            className="h-8 text-sm"
            placeholder="Song title"
          />
        </div>
      </div>
      
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Song URL</Label>
        <Input
          value={formData.song_url}
          onChange={(e) => setFormData({ ...formData, song_url: e.target.value })}
          className="h-8 text-sm"
          placeholder="https://..."
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Email</Label>
        <Input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="h-8 text-sm"
          placeholder="contact@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Message</Label>
        <Textarea
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
          className="text-sm min-h-[60px]"
          placeholder="Optional message..."
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Save className="w-3 h-3 mr-1" />
          )}
          Save Changes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
