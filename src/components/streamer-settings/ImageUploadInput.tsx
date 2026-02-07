import { useRef, useState } from "react";
import { Camera, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ImageVariant = "avatar" | "banner";

interface ImageUploadInputProps {
  streamerId: string;
  variant: ImageVariant;
  value: string;
  onChange: (url: string) => void;
}

const MAX_SIZE_MB: Record<ImageVariant, number> = {
  avatar: 2,
  banner: 6,
};

export function ImageUploadInput({ streamerId, variant, value, onChange }: ImageUploadInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const label = variant === "avatar" ? "Avatar" : "Banner";
  const help = variant === "avatar" ? "Square image (max 2MB)" : "Wide image (max 6MB)";

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
      return;
    }

    const maxBytes = MAX_SIZE_MB[variant] * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: "File too large",
        description: `Please upload an image smaller than ${MAX_SIZE_MB[variant]}MB.`,
        variant: "destructive",
      });
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filePath = `streamers/${streamerId}/${variant}-${Date.now()}.${ext}`;

    setIsUploading(true);
    try {
      const { error: uploadError } = await supabase.storage
        .from("stream-media")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("stream-media").getPublicUrl(filePath);
      onChange(urlData.publicUrl);

      toast({ title: `${label} uploaded`, description: "Click Save Changes to make it live." });
    } catch (e) {
      console.error("Image upload failed:", e);
      toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Label className="text-sm">{label}</Label>
          <p className="text-xs text-muted-foreground">{help}</p>
        </div>

        {value ? (
          <Button type="button" variant="ghost" size="sm" className="gap-2" onClick={() => onChange("")}
            disabled={isUploading}
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </Button>
        ) : (
          <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handlePick} disabled={isUploading}
          >
            <Camera className="w-4 h-4" />
            Upload
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.currentTarget.value = "";
        }}
      />

      <button
        type="button"
        onClick={handlePick}
        className="relative w-full overflow-hidden rounded-xl border border-dashed border-border/60 bg-card/40 hover:bg-card/60 transition-colors"
      >
        {variant === "avatar" ? (
          <div className="p-4 flex items-center justify-center">
            {value ? (
              <img
                src={value}
                alt="Avatar preview"
                className="w-24 h-24 rounded-full object-cover border border-border"
                loading="lazy"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border border-border flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-6 h-6" />
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            {value ? (
              <img
                src={value}
                alt="Banner preview"
                className="w-full h-28 md:h-32 rounded-lg object-cover border border-border"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-28 md:h-32 rounded-lg border border-border flex items-center justify-center text-muted-foreground">
                <div className="flex items-center gap-2 text-sm">
                  <ImageIcon className="w-5 h-5" />
                  Click to upload banner
                </div>
              </div>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </div>
          </div>
        )}
      </button>
    </div>
  );
}
