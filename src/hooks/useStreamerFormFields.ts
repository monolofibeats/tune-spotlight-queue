import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface StreamerFormField {
  id: string;
  streamer_id: string;
  field_name: string;
  field_label: string;
  field_type: string;
  placeholder: string | null;
  is_required: boolean | null;
  is_enabled: boolean | null;
  field_order: number | null;
  options: unknown | null;
}

export function useStreamerFormFields(streamerId?: string) {
  const [fields, setFields] = useState<StreamerFormField[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchFields = async () => {
      if (!streamerId) {
        if (isMounted) setFields([]);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from("streamer_form_fields")
        .select("*")
        .eq("streamer_id", streamerId)
        .order("field_order");

      if (!error && data && isMounted) {
        setFields(data as StreamerFormField[]);
      }

      if (isMounted) setIsLoading(false);
    };

    void fetchFields();

    // Subscribe to realtime updates for this streamer's form fields
    if (streamerId) {
      const channel = supabase
        .channel(`form-fields-${streamerId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "streamer_form_fields",
            filter: `streamer_id=eq.${streamerId}`,
          },
          () => {
            // Refetch on any change
            void fetchFields();
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [streamerId]);

  return { fields, isLoading };
}
