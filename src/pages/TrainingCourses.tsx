import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Check, X, BookOpen, Eye, EyeOff, ImagePlus, Loader2, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Course = {
  id: string;
  title: string;
  content: string;
  images: string[];
  order_index: number;
  published: boolean;
  created_at: string;
  category: string;
};

const CATEGORIES = [
  "Plataforma",
  "Precificação",
  "Cardápio",
  "Estratégia de Vendas",
  "Operação e Boas Práticas",
  "Geral",
];

export default function TrainingCourses() {
  const { role } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);
  const [editCategory, setEditCategory] = useState("Geral");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("Geral");
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const newImageRef = useRef<HTMLInputElement>(null);
  const editImageRef = useRef<HTMLInputElement>(null);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [viewingCourse, setViewingCourse] = useState<Course | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const canManage = role === "admin" || role === "strategic";

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("training_courses")
      .select("*")
      .order("order_index", { ascending: true });
    if (error) {
      toast.error("Erro ao carregar treinamentos");
    } else {
      const parsed = (data || []).map((d: any) => ({
        ...d,
        images: Array.isArray(d.images) ? d.images : [],
        category: d.category || "Geral",
      }));
      setCourses(parsed);
      // Open all categories by default
      const cats: Record<string, boolean> = {};
      parsed.forEach((c: Course) => { cats[c.category] = true; });
      setOpenCategories(prev => {
        const merged = { ...cats };
        Object.keys(prev).forEach(k => { if (k in merged) merged[k] = prev[k]; });
        return merged;
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchCourses(); }, []);

  const toggleCategory = (cat: string) => {
    setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

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

  const handlePasteImage = async (e: React.ClipboardEvent, target: "new" | "edit") => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        const url = await uploadImage(file);
        if (url) {
          if (target === "new") setNewImages(prev => [...prev, url]);
          else setEditImages(prev => [...prev, url]);
        }
        return;
      }
    }
  };

  const handleNewImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setNewImages(prev => [...prev, url]);
    e.target.value = "";
  };

  const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setEditImages(prev => [...prev, url]);
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
      category: newCategory,
    } as any);
    if (error) {
      toast.error("Erro ao criar treinamento");
    } else {
      toast.success("Treinamento criado!");
      setNewTitle(""); setNewContent(""); setNewImages([]); setNewCategory("Geral");
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
      .update({ title: editTitle.trim(), content: editContent.trim(), images: editImages, category: editCategory } as any)
      .eq("id", editingId);
    if (error) toast.error("Erro ao salvar");
    else { setEditingId(null); fetchCourses(); }
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
    setEditCategory(course.category || "Geral");
  };

  if (loading) return <div className="flex items-center justify-center py-16 text-muted-foreground">Carregando...</div>;

  const ImageGrid = ({ images, onRemove, onView }: { images: string[]; onRemove?: (i: number) => void; onView: (url: string) => void }) => (
    images.length > 0 ? (
      <div className="flex flex-wrap gap-2 mt-2">
        {images.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt={`Print ${i + 1}`} className="h-20 rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => onView(url)} />
            {onRemove && (
              <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
            )}
          </div>
        ))}
      </div>
    ) : null
  );

  // Viewing a single course
  if (viewingCourse) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewingCourse(null)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
        </div>
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl text-foreground">{viewingCourse.title}</h1>
              <span className="text-xs text-muted-foreground">{viewingCourse.category}</span>
            </div>
          </div>
          {viewingCourse.content && (
            <div className="prose prose-sm dark:prose-invert max-w-none training-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h3 className="text-base font-semibold text-foreground mt-4 mb-2">{children}</h3>,
                  h2: ({ children }) => <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5">{children}</h3>,
                  h3: ({ children }) => <p className="text-sm font-medium text-foreground mt-2 mb-1">{children}</p>,
                  p: ({ children }) => <p className="text-sm text-muted-foreground leading-relaxed mb-2">{children}</p>,
                  strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
                  ul: ({ children }) => <ul className="space-y-1 my-2 ml-1">{children}</ul>,
                  li: ({ children }) => <li className="text-sm text-muted-foreground flex gap-2 items-start"><span className="text-primary mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-primary inline-block" /><span>{children}</span></li>,
                }}
              >
                {viewingCourse.content}
              </ReactMarkdown>
            </div>
          )}
          {viewingCourse.images.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm font-medium text-muted-foreground">Prints de referência:</p>
              <div className="flex flex-wrap gap-3">
                {viewingCourse.images.map((url, i) => (
                  <img key={i} src={url} alt={`Print ${i + 1}`} className="max-h-48 rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxImg(url)} />
                ))}
              </div>
            </div>
          )}
        </Card>

        {lightboxImg && (
          <Dialog open={!!lightboxImg} onOpenChange={() => setLightboxImg(null)}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background/95 backdrop-blur-xl border-border">
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 h-8 w-8" onClick={() => setLightboxImg(null)}>
                <X className="h-4 w-4" />
              </Button>
              <img src={lightboxImg} alt="Print" className="w-full h-full object-contain max-h-[90vh] rounded-lg" />
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  // Group courses by category
  const grouped: Record<string, Course[]> = {};
  const visibleCourses = canManage ? courses : courses.filter(c => c.published);
  visibleCourses.forEach(course => {
    const cat = course.category || "Geral";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(course);
  });

  // Order categories
  const orderedCats = CATEGORIES.filter(c => grouped[c]);
  Object.keys(grouped).forEach(c => { if (!orderedCats.includes(c)) orderedCats.push(c); });

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
          <Input placeholder="Título do treinamento" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          <Select value={newCategory} onValueChange={setNewCategory}>
            <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea placeholder="Conteúdo detalhado... (cole prints com Ctrl+V)" value={newContent} onChange={e => setNewContent(e.target.value)} onPaste={e => handlePasteImage(e, "new")} rows={6} />
          <ImageGrid images={newImages} onRemove={i => setNewImages(prev => prev.filter((_, idx) => idx !== i))} onView={url => setLightboxImg(url)} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim()}><Check className="h-4 w-4 mr-1" /> Salvar</Button>
            <Button size="sm" variant="outline" onClick={() => newImageRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />} Anexar Print
            </Button>
            <input ref={newImageRef} type="file" accept="image/*" className="hidden" onChange={handleNewImageUpload} />
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setNewImages([]); }}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
          </div>
        </Card>
      )}

      {orderedCats.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum treinamento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderedCats.map(cat => (
            <Collapsible key={cat} open={openCategories[cat] !== false} onOpenChange={() => toggleCategory(cat)}>
              <CollapsibleTrigger asChild>
                <Card className="p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {openCategories[cat] !== false ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <h2 className="font-heading font-semibold text-foreground">{cat}</h2>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{grouped[cat].length}</span>
                    </div>
                  </div>
                </Card>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 mt-2 ml-2">
                  {grouped[cat].map(course => (
                    <Card key={course.id} className={`p-3 ${!course.published ? "opacity-60" : ""}`}>
                      {editingId === course.id ? (
                        <div className="space-y-3">
                          <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                          <Select value={editCategory} onValueChange={setEditCategory}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Textarea value={editContent} onChange={e => setEditContent(e.target.value)} onPaste={e => handlePasteImage(e, "edit")} rows={6} />
                          <ImageGrid images={editImages} onRemove={i => setEditImages(prev => prev.filter((_, idx) => idx !== i))} onView={url => setLightboxImg(url)} />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveEdit}><Check className="h-4 w-4 mr-1" /> Salvar</Button>
                            <Button size="sm" variant="outline" onClick={() => editImageRef.current?.click()} disabled={uploading}>
                              {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />} Anexar Print
                            </Button>
                            <input ref={editImageRef} type="file" accept="image/*" className="hidden" onChange={handleEditImageUpload} />
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X className="h-4 w-4 mr-1" /> Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 cursor-pointer" onClick={() => setViewingCourse(course)}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground text-sm">{course.title}</h3>
                              {!course.published && <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">Rascunho</span>}
                            </div>
                            {course.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{course.content.replace(/^#{1,3}\s*/gm, "").slice(0, 100)}</p>}
                          </div>
                          {canManage && (
                            <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleTogglePublish(course)} title={course.published ? "Despublicar" : "Publicar"}>
                                {course.published ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(course)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(course.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}

      {lightboxImg && (
        <Dialog open={!!lightboxImg} onOpenChange={() => setLightboxImg(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background/95 backdrop-blur-xl border-border">
            <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 h-8 w-8" onClick={() => setLightboxImg(null)}>
              <X className="h-4 w-4" />
            </Button>
            <img src={lightboxImg} alt="Print" className="w-full h-full object-contain max-h-[90vh] rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
