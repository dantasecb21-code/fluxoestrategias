import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImageLightbox({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false);

  if (!src) return null;

  return (
    <>
      <img
        src={src}
        alt={alt || ""}
        className="rounded-lg border border-border my-3 max-w-full shadow-md cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background/95 backdrop-blur-xl border-border">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 h-8 w-8 bg-background/80 hover:bg-background"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={src}
            alt={alt || ""}
            className="w-full h-full object-contain max-h-[90vh] rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
