CREATE OR REPLACE FUNCTION public.seed_default_dashboard_preset()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only run when status becomes 'approved' and no active preset exists yet
  IF NEW.status = 'approved' AND NOT EXISTS (
    SELECT 1 FROM public.streamer_presets WHERE streamer_id = NEW.id AND is_active = true
  ) THEN
    INSERT INTO public.streamer_presets (streamer_id, name, is_active, dashboard_layout)
    VALUES (
      NEW.id,
      'Default',
      true,
      '{"grid_layout":[{"h":14.5,"i":"now_playing","minH":3,"minW":6,"moved":false,"static":false,"w":12,"x":0,"y":0},{"h":1.4,"i":"search_filters","minH":1,"minW":6,"moved":false,"static":false,"w":12,"x":0,"y":14.5},{"h":20,"i":"queue","minH":6,"minW":4,"moved":false,"static":false,"w":12,"x":0,"y":15.9}],"popped_out_widgets":[],"show_when_popped_out":[],"version":3,"view_options":{"showDashboardTitle":false,"showHeader":true},"widget_configs":{"earnings":{"showBalance":true,"showPayoutStatus":true,"showRecentEarnings":true},"now_playing":{"showActionButtons":true,"showDBFS":true,"showDownload":false,"showKeyFinder":true,"showLUFS":true,"showMessage":true,"showSoundCloudEmbed":true,"showSpotifyEmbed":true,"showStemSeparation":false,"showSubmitterInsights":false,"showVisualizer":true,"textScale":85},"quick_settings":{"showLiveToggle":true,"showSubmissionsToggle":true},"search_filters":{"showSearchBar":false,"showStatusFilters":true,"showTrashFilter":true,"textScale":90}}}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_streamer_approved_seed_dashboard
  AFTER INSERT OR UPDATE ON public.streamers
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_dashboard_preset();