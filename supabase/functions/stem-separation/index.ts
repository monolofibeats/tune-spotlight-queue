import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LALAL_BASE = "https://www.lalal.ai/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const LALAL_API_KEY = Deno.env.get("LALAL_AI_API_KEY");
  if (!LALAL_API_KEY) {
    return new Response(JSON.stringify({ error: "LALAL_AI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, submission_id, stem_types, job_id } = await req.json();

    // ── ACTION: start ──
    // Fetches the audio file, uploads to LALAL.AI, starts split tasks for each stem type
    if (action === "start") {
      if (!submission_id || !stem_types || !Array.isArray(stem_types) || stem_types.length === 0) {
        return new Response(JSON.stringify({ error: "submission_id and stem_types[] required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get submission's audio file
      const { data: submission, error: subErr } = await supabaseAdmin
        .from("submissions")
        .select("audio_file_url, artist_name, song_title")
        .eq("id", submission_id)
        .single();

      if (subErr || !submission?.audio_file_url) {
        return new Response(JSON.stringify({ error: "Submission not found or no audio file" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Download audio from Supabase storage
      let audioBuffer: ArrayBuffer;
      const filePath = submission.audio_file_url;

      if (filePath.startsWith("http")) {
        const resp = await fetch(filePath);
        if (!resp.ok) throw new Error("Failed to download audio from URL");
        audioBuffer = await resp.arrayBuffer();
      } else {
        const { data: fileData, error: dlErr } = await supabaseAdmin.storage
          .from("song-files")
          .download(filePath);
        if (dlErr || !fileData) throw new Error("Failed to download audio from storage");
        audioBuffer = await fileData.arrayBuffer();
      }

      // Upload to LALAL.AI
      const fileName = `${submission.artist_name} - ${submission.song_title}.mp3`;
      const uploadResp = await fetch(`${LALAL_BASE}/upload/`, {
        method: "POST",
        headers: {
          "X-License-Key": LALAL_API_KEY,
          "Content-Type": "application/octet-stream",
          "Content-Disposition": `attachment; filename=${encodeURIComponent(fileName)}`,
        },
        body: new Uint8Array(audioBuffer),
      });

      if (!uploadResp.ok) {
        const errText = await uploadResp.text();
        console.error("LALAL upload error:", uploadResp.status, errText);
        return new Response(JSON.stringify({ error: "Failed to upload to LALAL.AI", details: errText }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const uploadData = await uploadResp.json();
      const sourceId = uploadData.id;

      // Start split tasks for each stem type
      const jobs: { id: string; stem_type: string; task_id: string }[] = [];

      for (const stemType of stem_types) {
        // Create DB record first
        const { data: job, error: jobErr } = await supabaseAdmin
          .from("stem_separation_jobs")
          .insert({
            submission_id,
            stem_type: stemType,
            status: "processing",
            lalal_source_id: sourceId,
          })
          .select("id")
          .single();

        if (jobErr) {
          console.error("Failed to create job record:", jobErr);
          continue;
        }

        // Start split task on LALAL.AI
        const splitResp = await fetch(`${LALAL_BASE}/split/stem_separator/`, {
          method: "POST",
          headers: {
            "X-License-Key": LALAL_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source_id: sourceId,
            presets: {
              stem: stemType,
              extraction_level: "deep_extraction",
              splitter: "perseus",
            },
          }),
        });

        if (!splitResp.ok) {
          const errText = await splitResp.text();
          console.error(`LALAL split error for ${stemType}:`, splitResp.status, errText);
          await supabaseAdmin
            .from("stem_separation_jobs")
            .update({ status: "error", error_message: errText })
            .eq("id", job.id);
          continue;
        }

        const splitData = await splitResp.json();
        const taskId = splitData.task_id;
        console.log(`Split started for ${stemType}, task_id:`, taskId);

        // Update job with task ID
        await supabaseAdmin
          .from("stem_separation_jobs")
          .update({ lalal_task_id: taskId })
          .eq("id", job.id);

        jobs.push({ id: job.id, stem_type: stemType, task_id: taskId });
      }

      return new Response(JSON.stringify({ source_id: sourceId, jobs }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: check ──
    // Polls LALAL.AI for task status, updates DB, downloads completed stems to storage
    if (action === "check") {
      // Get all processing jobs for this submission
      const { data: processingJobs, error: jobsErr } = await supabaseAdmin
        .from("stem_separation_jobs")
        .select("*")
        .eq("submission_id", submission_id)
        .eq("status", "processing");

      if (jobsErr || !processingJobs || processingJobs.length === 0) {
        return new Response(JSON.stringify({ jobs: [], all_done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const taskIds = processingJobs
        .map((j) => j.lalal_task_id)
        .filter(Boolean) as string[];

      if (taskIds.length === 0) {
        return new Response(JSON.stringify({ jobs: processingJobs, all_done: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check status on LALAL.AI
      const checkResp = await fetch(`${LALAL_BASE}/check/`, {
        method: "POST",
        headers: {
          "X-License-Key": LALAL_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task_ids: taskIds }),
      });

      if (!checkResp.ok) {
        const errText = await checkResp.text();
        console.error("LALAL check error:", errText);
        return new Response(JSON.stringify({ error: "Failed to check LALAL.AI status" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const checkData = await checkResp.json();
      const results = checkData.result || {};

      for (const job of processingJobs) {
        if (!job.lalal_task_id) continue;
        const taskResult = results[job.lalal_task_id];
        if (!taskResult) continue;

        if (taskResult.status === "success") {
          const tracks = taskResult.result?.tracks || [];
          const stemTrack = tracks.find((t: any) => t.type === "stem");
          const backTrack = tracks.find((t: any) => t.type === "back");

          // Download stem and back tracks, upload to our storage
          let stemStorageUrl = null;
          let backStorageUrl = null;

          if (stemTrack?.url) {
            try {
              const stemResp = await fetch(stemTrack.url);
              if (stemResp.ok) {
                const stemBuffer = await stemResp.arrayBuffer();
                const stemPath = `stems/${submission_id}/${job.stem_type}_stem.mp3`;
                const { error: upErr } = await supabaseAdmin.storage
                  .from("song-files")
                  .upload(stemPath, new Uint8Array(stemBuffer), {
                    contentType: "audio/mpeg",
                    upsert: true,
                  });
                if (!upErr) stemStorageUrl = stemPath;
              }
            } catch (e) {
              console.error("Failed to download stem track:", e);
            }
          }

          if (backTrack?.url) {
            try {
              const backResp = await fetch(backTrack.url);
              if (backResp.ok) {
                const backBuffer = await backResp.arrayBuffer();
                const backPath = `stems/${submission_id}/${job.stem_type}_back.mp3`;
                const { error: upErr } = await supabaseAdmin.storage
                  .from("song-files")
                  .upload(backPath, new Uint8Array(backBuffer), {
                    contentType: "audio/mpeg",
                    upsert: true,
                  });
                if (!upErr) backStorageUrl = backPath;
              }
            } catch (e) {
              console.error("Failed to download back track:", e);
            }
          }

          await supabaseAdmin
            .from("stem_separation_jobs")
            .update({
              status: "completed",
              progress: 100,
              stem_url: stemStorageUrl,
              back_url: backStorageUrl,
            })
            .eq("id", job.id);
        } else if (taskResult.status === "progress") {
          await supabaseAdmin
            .from("stem_separation_jobs")
            .update({ progress: taskResult.progress || 0 })
            .eq("id", job.id);
        } else if (taskResult.status === "error" || taskResult.status === "server_error") {
          const errorMsg =
            typeof taskResult.error === "string"
              ? taskResult.error
              : taskResult.error?.detail || "Unknown error";
          await supabaseAdmin
            .from("stem_separation_jobs")
            .update({ status: "error", error_message: errorMsg })
            .eq("id", job.id);
        }
      }

      // Return updated jobs
      const { data: updatedJobs } = await supabaseAdmin
        .from("stem_separation_jobs")
        .select("*")
        .eq("submission_id", submission_id)
        .order("created_at", { ascending: true });

      const allDone = (updatedJobs || []).every(
        (j) => j.status === "completed" || j.status === "error"
      );

      return new Response(JSON.stringify({ jobs: updatedJobs, all_done: allDone }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── ACTION: minutes_left ──
    if (action === "minutes_left") {
      const resp = await fetch(`${LALAL_BASE}/limits/minutes_left/`, {
        method: "POST",
        headers: { "X-License-Key": LALAL_API_KEY },
      });
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stem-separation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
