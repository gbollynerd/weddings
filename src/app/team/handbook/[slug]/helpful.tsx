"use client";
import * as React from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/components/ui/interactive";
import { cn } from "@/lib/utils";

export function Helpful({ slug }: { slug: string }) {
  const toast = useToast();
  const [v, setV] = React.useState<"up" | "down" | null>(null);
  React.useEffect(() => { try { setV((localStorage.getItem("hb:" + slug) as "up" | "down") ?? null); } catch {} }, [slug]);
  const vote = (x: "up" | "down") => { setV(x); try { localStorage.setItem("hb:" + slug, x); } catch {} toast({ tone: "success", title: "Thanks for the feedback" }); };
  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 rounded-2xl bg-canvas p-4 text-sm">
      <span className="flex-1 text-midnight-700">Was this article helpful?</span>
      {(["up", "down"] as const).map((x) => {
        const I = x === "up" ? ThumbsUp : ThumbsDown;
        return <button key={x} onClick={() => vote(x)} aria-pressed={v === x} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5", v === x ? "border-midnight-900 bg-midnight-900 text-white" : "border-line bg-white text-midnight-700 hover:bg-midnight-50")}><I className="size-4" />{x === "up" ? "Yes" : "No"}</button>;
      })}
    </div>
  );
}
