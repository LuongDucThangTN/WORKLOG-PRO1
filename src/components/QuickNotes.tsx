import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  Pin, 
  StickyNote, 
  ExternalLink 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface QuickNote {
  id: string;
  content: string;
  color: "yellow" | "blue" | "green" | "rose";
  createdAt: number;
}

interface QuickNotesProps {
  isSidebarCollapsed: boolean;
}

const COLOR_MAP = {
  yellow: {
    bg: "bg-amber-50/90 dark:bg-amber-950/20",
    border: "border-amber-200 dark:border-amber-900/40",
    text: "text-amber-950 dark:text-amber-200",
    placeholder: "placeholder:text-amber-500/50",
    dot: "bg-amber-400 hover:ring-amber-500",
    name: "Vàng chanh"
  },
  blue: {
    bg: "bg-sky-50/90 dark:bg-sky-950/20",
    border: "border-sky-200 dark:border-sky-900/40",
    text: "text-sky-950 dark:text-sky-200",
    placeholder: "placeholder:text-sky-500/50",
    dot: "bg-sky-400 hover:ring-sky-500",
    name: "Xanh dương"
  },
  green: {
    bg: "bg-emerald-50/90 dark:bg-emerald-950/20",
    border: "border-emerald-200 dark:border-emerald-900/40",
    text: "text-emerald-950 dark:text-emerald-200",
    placeholder: "placeholder:text-emerald-500/50",
    dot: "bg-emerald-400 hover:ring-emerald-500",
    name: "Lá thông"
  },
  rose: {
    bg: "bg-rose-50/90 dark:bg-rose-950/20",
    border: "border-rose-200 dark:border-rose-900/50",
    text: "text-rose-950 dark:text-rose-200",
    placeholder: "placeholder:text-rose-500/50",
    dot: "bg-rose-400 hover:ring-rose-500",
    name: "Hồng đào"
  }
};

export default function QuickNotes({ isSidebarCollapsed }: QuickNotesProps) {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [isNotesExpanded, setIsNotesExpanded] = useState(() => {
    const saved = localStorage.getItem("worklog_notes_expanded");
    return saved !== "false";
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Floating popup state when sidebar is collapsed
  const [showFloatingPopover, setShowFloatingPopover] = useState(false);

  // Initialize and load notes
  useEffect(() => {
    const saved = localStorage.getItem("worklog_quick_notes");
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error("Lỗi khi khôi phục Quick Notes:", e);
      }
    } else {
      // Seed with a default warm welcome note
      const defaultNotes: QuickNote[] = [
        {
          id: "welcome",
          content: "📌 Đây là Ghi chú nhanh! Hãy lưu lại ý tưởng hoặc công việc phát sinh tại đây độc lập bản ghi chính.",
          color: "yellow",
          createdAt: Date.now()
        }
      ];
      setNotes(defaultNotes);
      localStorage.setItem("worklog_quick_notes", JSON.stringify(defaultNotes));
    }
  }, []);

  const saveNotesToStorage = (updatedNotes: QuickNote[]) => {
    localStorage.setItem("worklog_quick_notes", JSON.stringify(updatedNotes));
  };

  const handleToggleExpanded = () => {
    const nextState = !isNotesExpanded;
    setIsNotesExpanded(nextState);
    localStorage.setItem("worklog_notes_expanded", String(nextState));
  };

  const handleAddNote = () => {
    const newNote: QuickNote = {
      id: Date.now().toString(),
      content: "",
      color: "yellow",
      createdAt: Date.now()
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveNotesToStorage(updated);
    if (!isNotesExpanded) {
      setIsNotesExpanded(true);
      localStorage.setItem("worklog_notes_expanded", "true");
    }
  };

  const handleUpdateContent = (id: string, content: string) => {
    const updated = notes.map(note => note.id === id ? { ...note, content } : note);
    setNotes(updated);
    saveNotesToStorage(updated);
  };

  const handleChangeColor = (id: string, color: "yellow" | "blue" | "green" | "rose") => {
    const updated = notes.map(note => note.id === id ? { ...note, color } : note);
    setNotes(updated);
    saveNotesToStorage(updated);
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter(note => note.id !== id);
    setNotes(updated);
    saveNotesToStorage(updated);
  };

  const handleCopyToClipboard = (id: string, content: string) => {
    if (!content.trim()) return;
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }).catch(err => {
      console.error("Lỗi copy:", err);
    });
  };

  // Render notes inside list
  const renderNotesContainer = (maxHeightClass = "max-h-[310px]") => (
    <div className={`space-y-3 overflow-y-auto pr-1 select-none scrollbar-thin dark:scrollbar-track-slate-900 scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 ${maxHeightClass}`}>
      <AnimatePresence initial={false}>
        {notes.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-6 text-xs text-slate-400 dark:text-slate-500 font-medium"
          >
            Chưa có ghi chú nào. Hãy nhấn nút để thêm ý tưởng mới!
          </motion.div>
        ) : (
          notes.map((note) => {
            const config = COLOR_MAP[note.color] || COLOR_MAP.yellow;
            return (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.15 } }}
                className={`p-3 rounded-xl border ${config.bg} ${config.border} shadow-xs relative group/note flex flex-col justify-between transition-shadow hover:shadow-md h-[115px]`}
              >
                {/* Note header actions */}
                <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-black/[0.04] dark:border-white/[0.04] cursor-default">
                  <div className="flex items-center space-x-1">
                    <Pin className="w-3 h-3 text-slate-400 rotate-[25deg]" />
                    <span className="text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider">
                      Sticky Note
                    </span>
                  </div>
                  
                  {/* Colors & actions */}
                  <div className="flex items-center space-x-1.5 opacity-40 group-hover/note:opacity-100 transition-opacity">
                    {/* Copy text */}
                    <button
                      onClick={() => handleCopyToClipboard(note.id, note.content)}
                      title="Sao chép nội dung"
                      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 cursor-pointer active:scale-90"
                    >
                      {copiedId === note.id ? (
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    
                    {/* Delete button */}
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      title="Xóa ghi chú"
                      className="p-1 rounded hover:bg-rose-500/10 text-rose-500 cursor-pointer active:scale-90"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Textarea field */}
                <textarea
                  value={note.content}
                  onChange={(e) => handleUpdateContent(note.id, e.target.value)}
                  placeholder="Ghi nhanh ý tưởng..."
                  className={`w-full flex-1 text-[11px] font-medium leading-relaxed bg-transparent resize-none border-none outline-hidden focus:ring-0 ${config.text} ${config.placeholder} overflow-y-auto hidden-scrollbar`}
                />

                {/* Card footer: Color dots selector */}
                <div className="flex items-center justify-between pt-1 border-t border-black/[0.02] dark:border-white/[0.02]">
                  <span className="text-[9px] text-slate-400 opacity-60 font-medium">
                    {copiedId === note.id ? "Đã copy!" : "Auto saved"}
                  </span>
                  
                  {/* Color chooser circles */}
                  <div className="flex items-center space-x-1 shrink-0">
                    {Object.keys(COLOR_MAP).map((col) => {
                      const colType = col as keyof typeof COLOR_MAP;
                      const isSelected = note.color === colType;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => handleChangeColor(note.id, colType)}
                          className={`w-2.5 h-2.5 rounded-full ${COLOR_MAP[colType].dot} transition-all cursor-pointer ${
                            isSelected ? "ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-slate-900" : "opacity-60 hover:opacity-100"
                          }`}
                          title={`Màu ${COLOR_MAP[colType].name}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );

  // If Sidebar is Collapsed, render compact circular menu or popover
  if (isSidebarCollapsed) {
    return (
      <div className="relative flex justify-center pb-2">
        <button
          onClick={() => setShowFloatingPopover(!showFloatingPopover)}
          className={`relative p-2.5 rounded-lg border text-slate-500 hover:text-sky-500 bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/80 transition-all cursor-pointer active:scale-95 ${
            showFloatingPopover ? "text-sky-500 border-sky-200 dark:bg-sky-950/20" : ""
          }`}
          title="Ý tưởng & Ghi chú nhanh"
        >
          <StickyNote className="w-5 h-5 animate-pulse" />
          {notes.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold rounded-full w-4 h-4 text-[9px] flex items-center justify-center border border-white dark:border-slate-950">
              {notes.length}
            </span>
          )}
        </button>

        {/* Floating popover box */}
        <AnimatePresence>
          {showFloatingPopover && (
            <>
              {/* Backscreen tap close layer */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowFloatingPopover(false)} 
              />
              
              <motion.div
                initial={{ opacity: 0, x: -10, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -15, scale: 0.95 }}
                className="absolute left-14 bottom-0 z-50 w-72 bg-white dark:bg-[#0f172a] rounded-xl border border-slate-205 dark:border-slate-800 shadow-xl p-4 space-y-3 text-left"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <StickyNote className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                      Ghi chú nhanh ({notes.length})
                    </span>
                  </div>
                  <button
                    onClick={handleAddNote}
                    className="p-1 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-all cursor-pointer active:scale-90"
                    title="Thêm ý tưởng mới"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {renderNotesContainer("max-h-[260px]")}

                <div className="text-[10px] text-slate-400 dark:text-slate-500 text-center select-none pt-0.5">
                  Tự động lưu độc lập trong thiết bị
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Expanded Sidebar layout
  return (
    <div className="mx-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
      {/* Header clickable toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleExpanded}
          className="flex items-center space-x-1.5 text-slate-405 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-[10px] uppercase tracking-wider font-mono cursor-pointer transition-colors"
        >
          <StickyNote className="w-3.5 h-3.5" />
          <span>Ghi chú nhanh ({notes.length})</span>
          {isNotesExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Quick add note button */}
        <button
          onClick={handleAddNote}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 dark:text-slate-400 transition-all cursor-pointer active:scale-90"
          title="Thêm ghi chú ý tưởng mới"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Foldable notes contents list animation container */}
      <AnimatePresence initial={false}>
        {isNotesExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            {renderNotesContainer("max-h-[320px]")}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
