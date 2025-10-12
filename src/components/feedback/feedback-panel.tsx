"use client";

import { useState } from "react";

type FeedbackStatus = "idle" | "submitting" | "success" | "error";

export function FeedbackPanel() {
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [status, setStatus] = useState<FeedbackStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      setError("Please share a quick note before sending feedback.");
      return;
    }
    setStatus("submitting");
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          rating,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to send feedback.");
      }

      setStatus("success");
      setMessage("");
      setRating(null);
      setIsFormVisible(false);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unexpected error.");
    }
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">Share feedback</h2>
          <p className="text-xs text-zinc-500">
            Tell us what&apos;s working or what you need next.
          </p>
        </div>
      </div>

      {!isFormVisible ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              setIsFormVisible(true);
              setStatus("idle");
              setError(null);
            }}
            className="inline-flex items-center justify-center rounded-md border border-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            Send feedback
          </button>
          {status === "success" ? (
            <p className="mt-2 text-sm text-emerald-600">
              Thanks! We received your latest feedback.
            </p>
          ) : null}
        </div>
      ) : (
        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-wrap items-center gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating((prev) => (prev === value ? null : value))}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition ${
                  rating === value
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-zinc-300 text-zinc-600 hover:border-emerald-400"
                }`}
                aria-pressed={rating === value}
              >
                {value}
              </button>
            ))}
            <span className="text-xs text-zinc-500">Optional rating</span>
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-500"
            >
              Message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              placeholder="Let us know how SplitNinja can help your crew…"
              className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Sending..." : "Submit feedback"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFormVisible(false);
                setError(null);
                setStatus("idle");
              }}
              className="text-sm font-medium text-zinc-500 transition hover:text-zinc-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
