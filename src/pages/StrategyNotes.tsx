import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2, FileText, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function StrategyNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) fetchNotes();
  }, [user]);

  const fetchNotes = async () => {
    const { data } = await supabase
      .from("strategy_notes")
      .select("*")
      .eq("user_id", user!.id)
      .order("updated_at", { ascending: false });
    if (data) setNotes(data as Note[]);
    setLoading(false);
  };

  const handleNew = () => {
    setActiveNote(null);
    setTitle("");
    setContent("");
  };

  const handleSelect = (note: Note) => {
    setActiveNote(note);
    setTitle(note.title);
    setContent(note.content);
  };

  const handleSave = async () => {
    if (!content.trim()) { toast.error("Escreva algo antes de salvar"); return; }
    if (activeNote) {
      const { error } = await supabase.from("strategy_notes").update({ title, content }).eq("id", activeNote.id);
      if (error) { toast.error("Erro ao salvar"); return; }
      toast.success("Nota atualizada!");
    } else {
      const { error } = await supabase.from("strategy_notes").insert({ user_id: user!.id, title, content });
      if (error) { toast.error("Erro ao criar"); return; }
      toast.success("Nota criada!");
    }
    fetchNotes();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("strategy_notes").delete().eq("id", id);
    if (activeNote?.id === id) handleNew();
    fetchNotes();
    toast.success("Nota removida");
  };

  // Upload image to storage
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!user) return null;
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx 5MB)");
      return null;
    }

    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const fileName = `notes/${user.id}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from("strategy-images")
      .upload(fileName, file, { contentType: file.type });

    setUploading(false);

    if (error) {
      toast.error("Erro ao enviar imagem");
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("strategy-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  }, [user]);

  // Handle paste event for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;
        const url = await uploadImage(file);
        if (url) {
          setContent((prev) => prev + `\n![imagem](${url})\n`);
          toast.success("Imagem colada!");
        }
        return;
      }
    }
  }, [uploadImage]);

  // Handle file input
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      const url = await uploadImage(file);
      if (url) {
        setContent((prev) => prev + `\n![imagem](${url})\n`);
        toast.success("Imagem adicionada!");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [uploadImage]);

  // Handle drop event
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) {
        const url = await uploadImage(file);
        if (url) {
          setContent((prev) => prev + `\n![imagem](${url})\n`);
          toast.success("Imagem adicionada!");
        }
      }
    }
  }, [uploadImage]);

  // Render content with inline images
  const renderContent = (text: string) => {
    const parts = text.split(/(!\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/!\[.*?\]\((.*?)\)/);
      if (match) {
        return (
          <div key={i} className="my-2">
            <img
              src={match[1]}
              alt="nota"
              className="max-w-full max-h-60 rounded-lg border border-border object-contain"
              loading="lazy"
            />
          </div>
        );
      }
      if (!part) return null;
      return <span key={i} className="whitespace-pre-wrap">{part}</span>;
    });
  };


  // Check if content has images
  const hasImages = /!\[.*?\]\(.*?\)/.test(content);

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            Bloco de <span className="text-primary">Notas</span>
          </h1>
          <p className="text-sm text-muted-foreground">Escreva ou cole imagens para organizar suas estratégias</p>
        </div>
        <Button size="sm" onClick={handleNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova nota
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Notes list */}
        <div className="space-y-2">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : notes.length === 0 ? (
            <Card className="p-6 text-center border-dashed">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma nota ainda</p>
            </Card>
          ) : (
            notes.map((n) => (
              <Card
                key={n.id}
                className={`p-3 cursor-pointer transition-colors hover:bg-accent/50 ${activeNote?.id === n.id ? "border-primary bg-primary/5" : ""}`}
                onClick={() => handleSelect(n)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{n.title || "Sem título"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {n.content.replace(/!\[.*?\]\(.*?\)/g, "📷 ").substring(0, 60)}...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(n.updated_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(n.id); }}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="md:col-span-2 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da nota (ex: Estratégia Loja X)"
            className="font-medium"
          />

          <div
            className="relative"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="Escreva livremente... Cole imagens (Ctrl+V), arraste fotos ou use o botão 📷"
              className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-y font-mono text-xs"
            />
            {uploading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-md">
                <p className="text-sm text-muted-foreground animate-pulse">Enviando imagem...</p>
              </div>
            )}
          </div>

          {/* Image preview */}
          {hasImages && (
            <div className="rounded-lg border bg-card/50 p-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Pré-visualização das imagens:</p>
              <div className="space-y-1">
                {renderContent(content)}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={toggleRecording}
              className={isRecording ? "animate-pulse" : ""}
            >
              {isRecording ? <><MicOff className="h-4 w-4 mr-1" /> Parar gravação</> : <><Mic className="h-4 w-4 mr-1" /> Gravar áudio</>}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImageIcon className="h-4 w-4 mr-1" /> Adicionar foto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />

            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Salvar nota
            </Button>

            {isRecording && <span className="text-xs text-destructive animate-pulse">● Gravando...</span>}
            {uploading && <span className="text-xs text-primary animate-pulse">📷 Enviando...</span>}
          </div>

          <p className="text-[10px] text-muted-foreground">
            💡 Dica: Cole imagens com Ctrl+V ou arraste direto para o campo de texto
          </p>
        </div>
      </div>
    </div>
  );
}
