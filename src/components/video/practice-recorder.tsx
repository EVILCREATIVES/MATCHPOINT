"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const STROKES = [
  { value: "forehand", label: "Forehand" },
  { value: "backhand", label: "Backhand" },
  { value: "serve", label: "Serve" },
  { value: "volley", label: "Volley" },
  { value: "return", label: "Return" },
  { value: "other", label: "Other" },
] as const;

const REP_DURATION_S = 10;
const COUNTDOWN_S = 3;
const REST_BETWEEN_REPS_S = 2;

type Phase = "idle" | "countdown" | "recording" | "uploading" | "rest" | "done" | "error";

interface TakeStatus {
  takeNumber: number;
  videoId?: string;
  state: "queued" | "uploading" | "uploaded" | "failed";
  error?: string;
}

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  for (const t of candidates) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

export function PracticeRecorder() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);

  const [strokeType, setStrokeType] = useState("forehand");
  const [reps, setReps] = useState(3);
  const [notes, setNotes] = useState("");

  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [phaseMessage, setPhaseMessage] = useState<string>("");
  const [currentRep, setCurrentRep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [takes, setTakes] = useState<TakeStatus[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);

  // ── Camera setup ──
  async function startCamera() {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setPermission("granted");
    } catch (err) {
      setPermission("denied");
      setPermissionError(
        err instanceof Error ? err.message : "Camera access denied"
      );
    }
  }

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      stopCamera();
    };
  }, []);

  function sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async function recordOneClip(): Promise<Blob> {
    const stream = streamRef.current;
    if (!stream) throw new Error("Camera not started");

    const mimeType = pickMimeType();
    if (!mimeType) throw new Error("This browser cannot record video.");

    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });

    recorder.start();

    // Live countdown from REP_DURATION_S → 0.
    for (let s = REP_DURATION_S; s > 0; s--) {
      if (cancelledRef.current) break;
      setSecondsLeft(s);
      await sleep(1000);
    }
    setSecondsLeft(0);

    if (recorder.state !== "inactive") recorder.stop();
    await stopped;

    const blob = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];
    return blob;
  }

  async function uploadClip(
    sessId: string,
    takeNumber: number,
    blob: Blob,
    mimeType: string
  ): Promise<{ id: string }> {
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const fd = new FormData();
    fd.append(
      "file",
      new File([blob], `take-${takeNumber}.${ext}`, { type: mimeType })
    );
    fd.append("strokeType", strokeType);
    fd.append("sessionId", sessId);
    fd.append("takeNumber", String(takeNumber));
    if (notes) fd.append("notes", notes);

    const res = await fetch("/api/videos", { method: "POST", body: fd });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`);
    return json;
  }

  async function startSession() {
    setFatalError(null);
    setTakes(
      Array.from({ length: reps }, (_, i) => ({
        takeNumber: i + 1,
        state: "queued",
      }))
    );

    // 1. Create the session row server-side.
    let sessId: string;
    try {
      const res = await fetch("/api/practice-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strokeType,
          plannedReps: reps,
          notes: notes || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Failed (${res.status})`);
      sessId = json.id;
      setSessionId(sessId);
    } catch (err) {
      setFatalError(err instanceof Error ? err.message : "Failed to start session");
      setPhase("error");
      return;
    }

    cancelledRef.current = false;

    for (let i = 1; i <= reps; i++) {
      if (cancelledRef.current) break;
      setCurrentRep(i);

      // Countdown
      setPhase("countdown");
      for (let s = COUNTDOWN_S; s > 0; s--) {
        if (cancelledRef.current) break;
        setSecondsLeft(s);
        setPhaseMessage(`Rep ${i} of ${reps} — get ready`);
        await sleep(1000);
      }
      if (cancelledRef.current) break;

      // Record
      setPhase("recording");
      setPhaseMessage(`Rep ${i} of ${reps} — recording`);
      let blob: Blob;
      try {
        blob = await recordOneClip();
      } catch (err) {
        setFatalError(err instanceof Error ? err.message : "Recording failed");
        setPhase("error");
        return;
      }

      // Upload (in background — don't block the next rep).
      const mimeType = pickMimeType();
      const takeNumber = i;
      setTakes((prev) =>
        prev.map((t) =>
          t.takeNumber === takeNumber ? { ...t, state: "uploading" } : t
        )
      );
      void uploadClip(sessId, takeNumber, blob, mimeType)
        .then((res) => {
          setTakes((prev) =>
            prev.map((t) =>
              t.takeNumber === takeNumber
                ? { ...t, state: "uploaded", videoId: res.id }
                : t
            )
          );
        })
        .catch((err) => {
          setTakes((prev) =>
            prev.map((t) =>
              t.takeNumber === takeNumber
                ? {
                    ...t,
                    state: "failed",
                    error: err instanceof Error ? err.message : "Upload failed",
                  }
                : t
            )
          );
        });

      // Rest before next rep.
      if (i < reps) {
        setPhase("rest");
        for (let s = REST_BETWEEN_REPS_S; s > 0; s--) {
          if (cancelledRef.current) break;
          setSecondsLeft(s);
          setPhaseMessage(`Rest — next rep in ${s}s`);
          await sleep(1000);
        }
      }
    }

    setPhase("done");
    setPhaseMessage(
      cancelledRef.current ? "Session cancelled" : "Recording complete — analysis in progress"
    );

    // Push to results page after a short delay so any in-flight uploads can hand off ids.
    if (!cancelledRef.current) {
      setTimeout(() => {
        router.push(`/dashboard/practice/${sessionId ?? sessId}`);
        router.refresh();
      }, 1200);
    }
  }

  function cancelSession() {
    cancelledRef.current = true;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch {
        /* noop */
      }
    }
    setPhase("idle");
    setPhaseMessage("");
    setSecondsLeft(0);
    setCurrentRep(0);
  }

  const recording = phase !== "idle" && phase !== "done" && phase !== "error";

  return (
    <div className="space-y-4">
      {/* Camera preview */}
      <div className="relative rounded-lg overflow-hidden bg-black aspect-video max-h-[60vh]">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {permission !== "granted" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white p-6 gap-3">
            <p className="text-sm opacity-80">
              Camera access is required to record practice clips.
            </p>
            <button
              type="button"
              onClick={startCamera}
              className="rounded-md bg-white text-black font-medium px-4 py-2 text-sm"
            >
              Enable camera
            </button>
            {permissionError && (
              <p className="text-xs text-rose-300">{permissionError}</p>
            )}
          </div>
        )}

        {/* Overlay: countdown / rec dot / rest */}
        {permission === "granted" && phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className="text-white text-9xl font-bold tabular-nums">
              {secondsLeft || "GO"}
            </span>
          </div>
        )}
        {permission === "granted" && phase === "recording" && (
          <>
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-white text-xs font-medium">REC</span>
            </div>
            <div className="absolute top-3 right-3 bg-black/60 rounded-md px-3 py-1">
              <span className="text-white text-sm font-semibold tabular-nums">
                0:{String(secondsLeft).padStart(2, "0")}
              </span>
            </div>
          </>
        )}
        {permission === "granted" && phase === "rest" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-white text-2xl font-semibold">
              {phaseMessage}
            </span>
          </div>
        )}
        {permission === "granted" && phase === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
            <span className="text-3xl font-bold">✓ Done</span>
            <span className="text-sm opacity-80">{phaseMessage}</span>
          </div>
        )}
      </div>

      {/* Controls */}
      {!recording && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Stroke</label>
            <select
              value={strokeType}
              onChange={(e) => setStrokeType(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            >
              {STROKES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Reps (1–20)
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={reps}
              onChange={(e) =>
                setReps(Math.max(1, Math.min(20, parseInt(e.target.value || "1", 10))))
              }
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Each rep
            </label>
            <input
              disabled
              value={`${REP_DURATION_S}s + ${COUNTDOWN_S}s countdown`}
              className="w-full h-9 rounded-md border bg-muted px-3 text-sm text-muted-foreground"
            />
          </div>
          <div className="sm:col-span-3 space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Notes for the AI coach (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="What are you working on? E.g. 'driving through contact', 'staying low'."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      )}

      {fatalError && (
        <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950/30 rounded-md px-3 py-2">
          {fatalError}
        </p>
      )}

      <div className="flex items-center gap-2">
        {!recording ? (
          <button
            type="button"
            onClick={startSession}
            disabled={permission !== "granted"}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            Start session ({reps} {reps === 1 ? "rep" : "reps"})
          </button>
        ) : (
          <button
            type="button"
            onClick={cancelSession}
            className="rounded-md border border-rose-300 text-rose-700 px-4 py-2 text-sm font-medium hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/30"
          >
            Cancel
          </button>
        )}
        {recording && phaseMessage && (
          <span className="text-sm text-muted-foreground">{phaseMessage}</span>
        )}
      </div>

      {/* Take progress strip */}
      {takes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Takes — {takes.filter((t) => t.state === "uploaded").length} / {takes.length} uploaded
          </p>
          <div className="flex flex-wrap gap-1.5">
            {takes.map((t) => {
              const cls =
                t.state === "queued"
                  ? "bg-muted text-muted-foreground"
                  : t.state === "uploading"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                    : t.state === "uploaded"
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200";
              return (
                <span
                  key={t.takeNumber}
                  title={t.error ?? t.state}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded ${cls}`}
                >
                  #{t.takeNumber} · {t.state}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
