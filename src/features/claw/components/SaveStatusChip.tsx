"use client";

import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import CloudDoneRoundedIcon from "@mui/icons-material/CloudDoneRounded";
import CloudOffRoundedIcon from "@mui/icons-material/CloudOffRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import { N } from "@/design/neon";

export type SaveStatus = "saving" | "saved" | "offline" | "unsaved";

const COPY: Record<SaveStatus, { short: string; long: string }> = {
  saving: { short: "Saving", long: "Saving your toys" },
  saved: { short: "Saved", long: "Toys saved" },
  offline: { short: "Offline", long: "Offline: toys will save when you're back online" },
  unsaved: { short: "Not saved", long: "Playing offline: this level won't be saved" },
};

/**
 * Where the player's toys stand with the server. `pending` is how many writes
 * are still queued; they are retried automatically.
 */
export default function SaveStatusChip({ status, pending = 0, compact, onRetry }: { status: SaveStatus; pending?: number; compact?: boolean; onRetry?: () => void }) {
  const copy = COPY[status];
  const icon =
    status === "saving" ? <CircularProgress size={14} sx={{ color: N.delivery }} /> : status === "saved" ? <CloudDoneRoundedIcon /> : status === "offline" ? <CloudUploadRoundedIcon /> : <CloudOffRoundedIcon />;
  const color = status === "saved" ? N.brand : status === "saving" ? N.delivery : N.sun;
  return (
    <Chip
      size="small"
      icon={icon}
      role="status"
      aria-label={pending > 0 ? `${copy.long} (${pending} waiting)` : copy.long}
      label={`${compact ? copy.short : copy.long}${pending > 0 ? ` · ${pending}` : ""}`}
      onClick={status === "offline" && onRetry ? onRetry : undefined}
      sx={{ bgcolor: N.bgRaise, color: N.text, border: `1px solid ${color}80`, "& .MuiChip-icon": { color } }}
    />
  );
}
