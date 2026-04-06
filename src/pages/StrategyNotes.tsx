import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mic, MicOff, Plus, Save, Trash2, FileText } from "lucide-react";
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
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  // Speech Recognition
  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognitionRef.current = recognition;

    let finalTranscript = "";

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim = transcript;
        }
      }
      setContent((prev) => {
        const base = prev.endsWith("\n") || prev === "" ? prev : prev + "\n";
        return base + finalTranscript + (interim ? interim : "");
      });
    };

    recognition.onerror = () => {
      setIsRecording(false);
      toast.error("Erro no reconhecimento de voz");
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    setIsRecording(true);
    toast.success("Gravando... Fale agora!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-foreground">
            Bloco de <span className="text-primary">Notas</span>
          </h1>
          <p className="text-sm text-muted-foreground">Escreva ou grave áudios para organizar suas estratégias livremente</p>
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
                    <p className="text-xs text-muted-foreground truncate">{n.content.substring(0, 60)}...</p>
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

          <div className="relative">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Escreva livremente sua estratégia aqui... ou use o microfone para gravar 🎙️"
              className="min-h-[300px] resize-y"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={isRecording ? "destructive" : "outline"}
              size="sm"
              onClick={toggleRecording}
              className={isRecording ? "animate-pulse" : ""}
            >
              {isRecording ? <><MicOff className="h-4 w-4 mr-1" /> Parar gravação</> : <><Mic className="h-4 w-4 mr-1" /> Gravar áudio</>}
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-4 w-4 mr-1" /> Salvar nota
            </Button>
            {isRecording && <span className="text-xs text-destructive animate-pulse">● Gravando...</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
