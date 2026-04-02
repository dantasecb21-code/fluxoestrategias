import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Pencil, Check, X, BookOpen, Eye, EyeOff, ImagePlus, Loader2 } from "lucide-react";

type Course = {
  id: string;
  title: string;
  content: string;
  images: string[];
  order_index: number;
  published: boolean;
  created_at: string;
};

export default function TrainingCourses() {
  const { role } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const newImageRef = useRef<HTMLInputElement>(null);
  const editImageRef = useRef<HTMLInputElement>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  const canManage = role === "admin" || role === "strategic";

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("training_courses")
      .select("*")
      .order("order_index", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar treinamentos");
    } else {
      setCourses(
        (data || []).map((d: any) => ({
          ...d,
          images: Array.isArray(d.images) ? d.images : [],
        }))
      );
    }
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `training/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("strategy-images").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("strategy-images").getPublicUrl(path);
      return urlData.publicUrl;
    } catch {
      toast.error("Erro ao enviar imagem");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setNewImages((prev) => [...prev, url]);
    e.target.value = "";
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setEditImages((prev) => [...prev, url]);
    e.target.value = "";
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("training_courses").insert({
      title: newTitle.trim(),
      content: newContent.trim(),
      images: newImages,
      order_index: courses.length,
      created_by: user.id,
    } as any);
    if (error) {
      toast.error("Erro ao criar treinamento");
    } else {
      toast.success("Treinamento criado!");
      setNewTitle("");
      setNewContent("");
      setNewImages([]);
      setShowAdd(false);
      fetchCourses();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("training_courses").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir");
    else fetchCourses();
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const { error } = await supabase
      .from("training_courses")
      .update({ title: editTitle.trim(), content: editContent.trim(), images: editImages } as any)
      .eq("id", editingId);
    if (error) toast.error("Erro ao salvar");
    else {
      setEditingId(null);
      fetchCourses();
    }
  };

  const handleTogglePublish = async (course: Course) => {
    const { error } = await supabase
      .from("training_courses")
      .update({ published: !course.published } as any)
      .eq("id", course.id);
    if (error) toast.error("Erro ao atualizar");
    else fetchCourses();
  };

  const startEdit = (course: Course) => {
    setEditingId(course.id);
    setEditTitle(course.title);
    setEditContent(course.content);
    setEditImages(course.images || []);
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>;

  const ImageGrid = ({ images, onRemove, onView }: { images: string[]; onRemove?: (i: number) => void; onView: (url: string) => void }) => (
    images.length > 0 ? (
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            <img
              src={url}
              alt={`Print ${i + 1}`}
              className="h-20 rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => onView(url)}
            />
            {onRemove && (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
    ) : null
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground">Treinamentos para Gestor</h1>
            <p className="text-xs text-muted-foreground">Mini cursos sobre otimizações na plataforma</p>
          </div>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-4 w-4 mr-1" /> Novo Treinamento
          </Button>
        )}
      </div>

      {showAdd && canManage && (
        <Card className="p-4 space-y-3 border-primary/30">
          <Input
            placeholder="Título do treinamento (ex: Como criar combo de duplas Queridinhas)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
          <Textarea
            placeholder="Conteúdo detalhado do treinamento... (esse conteúdo será usado como base de conhecimento pelo Assistente)"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            rows={6}
          />
          <ImageGrid
            images={newImages}
            onRemove={(i) => setNewImages((prev) => prev.filter((_, idx) => idx !== i))}
            onView={(url) => setLightboxImg(url)}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}>
              <Check className="h-4 w-4 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => newImageRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
              Anexar Print
            </Button>
            <input ref={newImageRef} type="file" accept="image/*" className="hidden" onChange={handleNewImageUpload} />
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewImages([]); }}>
              <X className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </Card>
      )}

      {courses.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum treinamento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((course) => (
            <Card key={course.id} className={`p-4 ${!course.published ? "opacity-60" : ""}`}>
              {editingId === course.id ? (
                <div className="space-y-3">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} />
                  <ImageGrid
                    images={editImages}
                    onRemove={(i) => setEditImages((prev) => prev.filter((_, idx) => idx !== i))}
                    onView={(url) => setLightboxImg(url)}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit}><Check className="h-4 w-4 mr-1" /> Salvar</Button>
                    <Button size="sm" variant="outline" onClick={() => editImageRef.current?.click()} disabled={uploading}>
                      {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />}
                      Anexar Print
                    </Button>
                    <input ref={editImageRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} />
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground">{course.title}</h3>
                      {!course.published && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Rascunho</span>
                      )}
                    </div>
                    {course.content && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">{course.content}</p>
                    )}
                    <ImageGrid
                      images={course.images}
                      onView={(url) => setLightboxImg(url)}
                    />
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => handleTogglePublish(course)} title={course.published ? "Despublicar" : "Publicar"}>
                        {course.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => startEdit(course)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(course.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {lightboxImg && (
        <ImageLightbox src={lightboxImg} alt="Print do treinamento" onClose={() => setLightboxImg(null)} />
      )}
    </div>
  );
}
