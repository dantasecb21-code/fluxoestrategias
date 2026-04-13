import { Badge } from "@/components/ui/badge";

export type Platform = "99food" | "ifood" | "keeta";

export const PLATFORM_LABELS: Record<Platform, string> = {
  "99food": "99Food",
  ifood: "iFood",
  keeta: "Keeta",
};

export const PLATFORM_OPTIONS: Platform[] = ["99food", "ifood", "keeta"];

export function PlatformBadge({ platform }: { platform: string }) {
  if (platform === "ifood") {
    return (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] py-0 px-1.5 h-4 leading-none">
        iFood
      </Badge>
    );
  }
  if (platform === "keeta") {
    return (
      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] py-0 px-1.5 h-4 leading-none">
        Keeta
      </Badge>
    );
  }
  return (
    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] py-0 px-1.5 h-4 leading-none">
      99Food
    </Badge>
  );
}
