import React, { useState, useEffect } from "react";
import { WorkLog, CATEGORY_OPTIONS, PRIORITY_OPTIONS, STATUS_OPTIONS } from "../types";
import { PlusCircle, Save, X, Trash, RefreshCw, Sparkles, HelpCircle, Camera, RotateCw, Image, FileText, Upload, Maximize2, Minimize2 } from "lucide-react";

interface LogFormProps {
  editLog: WorkLog | null;
  allLogs?: WorkLog[];
  onSaveLog: (logData: Partial<WorkLog>) => Promise<void>;
  onCancelEdit: () => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
  initialDate?: string;
  onDirtyChange?: (isDirty: boolean) => void;
}

export default function LogForm({
  editLog,
  allLogs = [],
  onSaveLog,
  onCancelEdit,
  isZenMode = false,
  onToggleZenMode,
  initialDate,
  onDirtyChange
}: LogFormProps) {
  // Form fields states
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [priority, setPriority] = useState<WorkLog["priority"]>("Trung bình");
  const [status, setStatus] = useState<WorkLog["status"]>("Đang thực hiện");
  const [dueDate, setDueDate] = useState("");
  const [content, setContent] = useState("");
  const [plannedProgress, setPlannedProgress] = useState("");
  const [resultText, setResultText] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachment, setNewAttachments] = useState("");

  const [draftStatus, setDraftStatus] = useState("");
  const [isSmartApplied, setIsSmartApplied] = useState(false);


  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Camera specific states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const [captureSuccess, setCaptureSuccess] = useState(false);

  // Drag & Drop specific states
  const [isDragging, setIsDragging] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const [isGeneratingTarget, setIsGeneratingTarget] = useState(false);
  const [isGeneratingResult, setIsGeneratingResult] = useState(false);

  const handleQuickSuggest = async (fieldType: "target" | "result") => {
    if (!content.trim()) {
      setInlineError("Vui lòng nhập 'Nội dung công việc' trước khi dùng tính năng gợi ý.");
      return;
    }
    
    setInlineError(null);
    if (fieldType === "target") setIsGeneratingTarget(true);
    if (fieldType === "result") setIsGeneratingResult(true);

    try {
      const response = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: content, fieldType })
      });

      if (!response.ok) {
        throw new Error("Lỗi phản hồi từ máy chủ.");
      }

      const data = await response.json();
      if (data.suggestion) {
        if (fieldType === "target") {
          setPlannedProgress(data.suggestion);
        } else {
          setResultText(data.suggestion);
        }
      }
    } catch (err: any) {
      setInlineError(err.message || "Đã xảy ra lỗi khi tạo gợi ý.");
    } finally {
      if (fieldType === "target") setIsGeneratingTarget(false);
      if (fieldType === "result") setIsGeneratingResult(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFileList(e.dataTransfer.files);
    }
  };

  const processFileList = (files: FileList) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setAttachments(prev => [...prev, event.target!.result as string]);
          }
        };
        reader.readAsDataURL(file);
      } else {
        // Just set the name for general files
        setAttachments(prev => [...prev, file.name]);
      }
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFileList(e.target.files);
      e.target.value = "";
    }
  };

  const startCamera = async (currentFacing = facingMode) => {
    setCameraError(null);
    setIsCameraActive(true);
    
    // Stop any existing streams first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    try {
      const constraints = {
        video: {
          facingMode: currentFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Không nhận diện được camera hoặc quyền truy cập camera bị chặn.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  };

  const toggleFacingMode = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    if (isCameraActive) {
      startCamera(nextFacing);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      // Use logical video size
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw matching video aspects
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        
        // Add photo as base64 string to attachments
        setAttachments(prev => [...prev, dataUrl]);
        setCaptureSuccess(true);
        setTimeout(() => setCaptureSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to capture photo", err);
      setCameraError("Không thể chụp ảnh từ luồng camera này.");
    }
  };

  // Clean stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Parse draft from localStorage or populate on Edit
  useEffect(() => {
    if (editLog) {
      const draftKey = `worklog_draft_${editLog.id}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setDate(parsed.date || editLog.date);
          setCategory(parsed.category || editLog.category);
          setPriority(parsed.priority || editLog.priority);
          setStatus(parsed.status || editLog.status);
          setDueDate(parsed.dueDate ?? editLog.dueDate ?? "");
          setContent(parsed.content ?? editLog.content);
          setPlannedProgress(parsed.plannedProgress ?? editLog.plannedProgress ?? "");
          setResultText(parsed.resultText ?? editLog.resultText ?? "");
          setNextPlan(parsed.nextPlan ?? editLog.nextPlan ?? "");
          setNotes(parsed.notes ?? editLog.notes ?? "");
          setAttachments(parsed.attachments || editLog.attachments || []);
          setDraftStatus("Đã khôi phục bản nháp đang sửa");
        } catch (e) {
          localStorage.removeItem(draftKey);
          populateFromEditLog();
        }
      } else {
        populateFromEditLog();
      }
    } else {
      // Look for autosaved draft
      const draft = localStorage.getItem("worklog_draft");
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setDate(initialDate || parsed.date || new Date().toISOString().split("T")[0]);
          setCategory(parsed.category || CATEGORY_OPTIONS[0]);
          setPriority(parsed.priority || "Trung bình");
          setStatus(parsed.status || "Đang thực hiện");
          setDueDate(parsed.dueDate || "");
          setContent(parsed.content || "");
          setPlannedProgress(parsed.plannedProgress || "");
          setResultText(parsed.resultText || "");
          setNextPlan(parsed.nextPlan || "");
          setNotes(parsed.notes || "");
          setAttachments(parsed.attachments || []);
          setDraftStatus("Đã khôi phục bản nháp chưa lưu");
        } catch (e) {
          localStorage.removeItem("worklog_draft");
          resetForm();
        }
      } else {
        resetForm();
      }
    }
    setIsSmartApplied(false);
  }, [editLog, initialDate]);

  const populateFromEditLog = () => {
    if (!editLog) return;
    setDate(editLog.date);
    setCategory(editLog.category);
    setPriority(editLog.priority);
    setStatus(editLog.status);
    setDueDate(editLog.dueDate || "");
    setContent(editLog.content);
    setPlannedProgress(editLog.plannedProgress || "");
    setResultText(editLog.resultText || "");
    setNextPlan(editLog.nextPlan || "");
    setNotes(editLog.notes || "");
    setAttachments(editLog.attachments || []);
    setDraftStatus("");
  };

  // Autosave draft on text change
  useEffect(() => {
    const timer = setTimeout(() => {
      const isContentDirty = content.trim() || plannedProgress.trim() || resultText.trim() || nextPlan.trim() || notes.trim() || attachments.length > 0;
      if (isContentDirty) {
        const draftObj = {
          date, category, priority, status, dueDate, content, plannedProgress, resultText, nextPlan, notes, attachments
        };
        const draftKey = editLog ? `worklog_draft_${editLog.id}` : "worklog_draft";
        try {
          localStorage.setItem(draftKey, JSON.stringify(draftObj));
          const time = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
          setDraftStatus(`Tự động lưu nháp lúc ${time}`);
        } catch (e) {
          console.warn("Could not save draft. LocalStorage might be full.", e);
        }
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [date, category, priority, status, dueDate, content, plannedProgress, resultText, nextPlan, notes, attachments, editLog]);

  // Track dirty state of the form and handle window/beforeunload events
  useEffect(() => {
    let isDirty = false;
    if (editLog) {
      isDirty = (
        date !== editLog.date ||
        category !== editLog.category ||
        priority !== editLog.priority ||
        status !== editLog.status ||
        (dueDate || "") !== (editLog.dueDate || "") ||
        content !== editLog.content ||
        (plannedProgress || "") !== (editLog.plannedProgress || "") ||
        (resultText || "") !== (editLog.resultText || "") ||
        (nextPlan || "") !== (editLog.nextPlan || "") ||
        (notes || "") !== (editLog.notes || "") ||
        JSON.stringify(attachments) !== JSON.stringify(editLog.attachments || [])
      );
    } else {
      isDirty = (
        content.trim() !== "" ||
        plannedProgress.trim() !== "" ||
        resultText.trim() !== "" ||
        nextPlan.trim() !== "" ||
        notes.trim() !== "" ||
        attachments.length > 0
      );
    }

    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Bạn có nội dung chưa lưu trong biểu mẫu. Bạn có chắc chắn muốn rời đi?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (onDirtyChange) {
        onDirtyChange(false);
      }
    };
  }, [date, category, priority, status, dueDate, content, plannedProgress, resultText, nextPlan, notes, attachments, editLog, onDirtyChange]);

  // Clear draft
  const handleClearDraft = () => {
    if (editLog) {
      localStorage.removeItem(`worklog_draft_${editLog.id}`);
      populateFromEditLog();
      setDraftStatus("Đã khôi phục dữ liệu gốc");
    } else {
      localStorage.removeItem("worklog_draft");
      resetForm();
      setDraftStatus("Đã cấu hình lại từ đầu");
    }
    setTimeout(() => setDraftStatus(""), 2000);
  };

  const resetForm = () => {
    setDate(initialDate || new Date().toISOString().split("T")[0]);
    setCategory(CATEGORY_OPTIONS[0]);
    setPriority("Trung bình");
    setStatus("Đang thực hiện");
    setDueDate("");
    setContent("");
    setPlannedProgress("");
    setResultText("");
    setNextPlan("");
    setNotes("");
    setAttachments([]);
    stopCamera();
  };



  // Compute Quick Suggestions (most recent / frequent 4 unique contents in current class)
  useEffect(() => {
    if (!allLogs || allLogs.length === 0) {
      setQuickSuggestions([]);
      return;
    }
    
    // Filter by selected category, only suitable length
    const categoryContents = allLogs
      .filter(log => log.category === category && log.content && log.content.trim())
      .map(log => log.content.trim());

    // Deduplicate and take top 4
    const unique = Array.from(new Set<string>(categoryContents))
      .filter((text: string) => text.length >= 3 && text.length <= 150)
      .slice(0, 4);

    setQuickSuggestions(unique);
  }, [allLogs, category]);

  // Compute Live Autocomplete/Filtered Suggestions during typing
  useEffect(() => {
    if (!content.trim() || !allLogs || allLogs.length === 0) {
      setFilteredSuggestions([]);
      return;
    }

    const typedValue = content.trim().toLowerCase();
    
    // Filter matching category
    const categoryContents = allLogs
      .filter(log => log.category === category && log.content && log.content.trim())
      .map(log => log.content.trim());

    const unique = Array.from(new Set<string>(categoryContents))
      .filter((text: string) => {
        const isMatched = text.toLowerCase().includes(typedValue);
        const isExactSame = text.toLowerCase() === content.trim().toLowerCase();
        return isMatched && !isExactSame && text.length >= 3 && text.length <= 250;
      })
      .slice(0, 5); // Limit dropdown size to top 5

    setFilteredSuggestions(unique);
  }, [content, category, allLogs]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
      } else if (e.key === "Enter") {
        if (activeSuggestionIndex >= 0 && activeSuggestionIndex < filteredSuggestions.length) {
          e.preventDefault();
          selectSuggestion(filteredSuggestions[activeSuggestionIndex]);
        }
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
      }
    }
  };

  const selectSuggestion = (selectedText: string) => {
    setContent(selectedText);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);

    // Apply smart categorization/priorities if needed based on the selected text too!
    const lower = selectedText.toLowerCase();
    if (lower.split(/\b/, 30).some(word => ["họp", "meeting", "giao ban", "hội thảo", "sự kiện"].includes(word))) {
      setCategory("Hội họp & Sự kiện");
      setPriority("Trung bình");
    } else if (lower.includes("báo cáo") || lower.includes("tổng hợp") || lower.includes("số liệu") || lower.includes("thống kê")) {
      setCategory("Báo cáo tổng hợp");
      setPriority("Cao");
    } else if (lower.includes("rà soát") || lower.includes("hồ sơ") || lower.includes("thẩm định") || lower.includes("kiểm tra")) {
      setCategory("Rà soát hồ sơ");
      setPriority("Trung bình");
    } else if (lower.includes("nghiên cứu") || lower.includes("chuyên đề") || lower.includes("đề án") || lower.includes("đọc tài liệu")) {
      setCategory("Nghiên cứu chuyên môn");
    } else if (lower.includes("đôn đốc") || lower.includes("gấp") || lower.includes("khẩn") || lower.includes("hỏa tốc")) {
      setPriority("Khẩn");
    }
    setIsSmartApplied(true);
  };

  // Smart suggestions logic on content change (Vietnamese keyword matchers)
  const handleContentChange = (val: string) => {
    setContent(val);
    if (editLog || isSmartApplied) return; // Ignore on editing or already manually confirmed

    const lower = val.toLowerCase();
    
    // Check keyword patterns to propose dynamic category & priority
    if (lower.split(/\b/, 30).some(word => ["họp", "meeting", "giao ban", "hội thảo", "sự kiện"].includes(word))) {
      setCategory("Hội họp & Sự kiện");
      setPriority("Trung bình");
    } else if (lower.includes("báo cáo") || lower.includes("tổng hợp") || lower.includes("số liệu") || lower.includes("thống kê")) {
      setCategory("Báo cáo tổng hợp");
      setPriority("Cao");
    } else if (lower.includes("rà soát") || lower.includes("hồ sơ") || lower.includes("thẩm định") || lower.includes("kiểm tra")) {
      setCategory("Rà soát hồ sơ");
      setPriority("Trung bình");
    } else if (lower.includes("nghiên cứu") || lower.includes("chuyên đề") || lower.includes("đề án") || lower.includes("đọc tài liệu")) {
      setCategory("Nghiên cứu chuyên môn");
    } else if (lower.includes("đôn đốc") || lower.includes("gấp") || lower.includes("khẩn") || lower.includes("hỏa tốc")) {
      setPriority("Khẩn");
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setInlineError("Nội dung mục tiêu công việc không được bỏ trống.");
      return;
    }
    setInlineError(null);

    const payload: Partial<WorkLog> = {
      date,
      category,
      priority,
      status,
      dueDate: dueDate || "",
      content,
      plannedProgress,
      resultText,
      nextPlan,
      notes,
      attachments
    };

    if (editLog) {
      payload.id = editLog.id;
    }

    await onSaveLog(payload);

    // Clean up cache on successful save
    if (editLog) {
      localStorage.removeItem(`worklog_draft_${editLog.id}`);
    } else {
      localStorage.removeItem("worklog_draft");
    }
    
    resetForm();
    setIsSmartApplied(false);
  };

  // Add attachment helper
  const addAttachment = () => {
    if (!newAttachment.trim()) return;
    if (!attachments.includes(newAttachment.trim())) {
      setAttachments([...attachments, newAttachment.trim()]);
    }
    setNewAttachments("");
  };

  // Remove attachment helper
  const removeAttachment = (attName: string) => {
    setAttachments(attachments.filter(a => a !== attName));
  };

  return (
    <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200">
            {editLog ? "Hiệu chỉnh Nhật ký" : "Ghi nhận Nhật ký Mới"}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {editLog ? `Đang chỉnh sửa bản ghi ID #${editLog.id}` : "Tự động sao lưu và bảo vệ tiến độ soạn thảo."}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onToggleZenMode && (
            <button
              type="button"
              onClick={onToggleZenMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all duration-200 cursor-pointer ${
                isZenMode
                  ? "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900 shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:border-slate-700"
              }`}
              title={isZenMode ? "Thoát chế độ tập trung" : "Mở chế độ tập trung (Zen Mode) để nhập liệu dài"}
            >
              {isZenMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Tập trung (Zen Mode: ON)</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Chế độ Tập trung (Zen)</span>
                </>
              )}
            </button>
          )}

          {draftStatus && (
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-500 font-medium border border-slate-100 dark:border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{draftStatus}</span>
              <button 
                type="button" 
                onClick={handleClearDraft}
                className="text-rose-500 hover:text-rose-600 font-bold ml-1.5 hover:underline cursor-pointer"
                title=" Đặt lại form nhập"
              >
                Đặt lại
              </button>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {inlineError && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900 text-rose-700 dark:text-rose-400 p-2.5 rounded-lg text-xs font-bold leading-relaxed flex items-center space-x-2 animate-in fade-in duration-150">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
            <span>{inlineError}</span>
          </div>
        )}
        {/* Row 1: Date & Category & Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Ngày Thực Hiện
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Nhóm Công Việc (Category)
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setIsSmartApplied(true); // Don't override user selection
              }}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-sky-500"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Priority & Status & Due date */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Độ Khẩn Cấp
            </label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value as any);
                setIsSmartApplied(true);
              }}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-sky-500"
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Trạng Thái Đạt Được
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-sky-500"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Hạn Hoàn Thành</span>
              {dueDate && (
                <button 
                  type="button" 
                  onClick={() => setDueDate("")} 
                  className="text-[10px] text-rose-500 hover:text-rose-600 font-bold hover:underline"
                >
                  Xóa hạn
                </button>
              )}
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Textarea 1: Content */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center space-x-1.5">
            <span>Nội dung công việc</span>
            <span className="text-red-500">*</span>
            {!editLog && !isSmartApplied && (
              <span className="text-[10px] text-sky-500 font-normal flex items-center space-x-0.5 normal-case">
                <Sparkles className="w-3 h-3" />
                <span>Gợi ý loại & độ ưu tiên tự động</span>
              </span>
            )}
          </label>
          
          <div className="relative">
            <textarea
              required
              rows={isZenMode ? 7 : 3}
              placeholder="Mô tả tóm tắt nội dung chính đang thực hiện hoặc triển khai..."
              value={content}
              onChange={(e) => {
                handleContentChange(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Short delay to allow clicking a suggestion before hiding
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              onKeyDown={handleKeyDown}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            />

            {/* Live Autocomplete suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-[#1f2937] border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-50 overflow-hidden max-h-48 overflow-y-auto">
                <p className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 uppercase tracking-wider flex items-center justify-between">
                  <span>Khớp lịch sử cùng danh mục ({filteredSuggestions.length})</span>
                  <span className="text-[9px] lowercase font-normal italic">Ấn mũi tên ↑↓ & Enter để chọn</span>
                </p>
                {filteredSuggestions.map((item, idx) => {
                  const isActive = idx === activeSuggestionIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault(); // Prevents loss of focus causing blur to close modal before click registers
                        selectSuggestion(item);
                      }}
                      onMouseEnter={() => setActiveSuggestionIndex(idx)}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-start space-x-2 transition-colors border-b border-slate-50 dark:border-slate-800/40 last:border-none ${
                        isActive 
                          ? "bg-sky-550/10 text-sky-600 dark:text-sky-400" 
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850"
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${isActive ? "text-sky-500 animate-pulse" : "text-slate-300 dark:text-slate-600"}`} />
                      <span className="truncate">{item}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Suggestion Chips below input for immediate reuse */}
          {content.trim().length < 4 && quickSuggestions.length > 0 && (
            <div className="mt-2 space-y-1.5 animate-fadeIn">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                <span>Nội dung phổ biến gần đây trong danh mục: <strong className="text-slate-600 dark:text-slate-300">{category}</strong></span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => selectSuggestion(item)}
                    className="px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-900/40 hover:bg-sky-50 dark:hover:bg-sky-950/35 hover:text-sky-650 dark:hover:text-sky-400 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-800 hover:border-sky-200 dark:hover:border-sky-900 rounded-lg text-left transition-all cursor-pointer truncate max-w-xs md:max-w-md shadow-2xs hover:shadow-xs"
                    title={item}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}

          {onToggleZenMode && !isZenMode && (content.length > 50 || resultText.length > 50) && (
            <div className="mt-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-amber-800 dark:text-amber-400 gap-2">
              <span className="flex items-center space-x-1.5 font-medium">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Nội dung đang dài, kích hoạt <strong>Chế độ Tập trung (Zen Mode)</strong> để làm việc thoải mái, tránh xao nhãng?</span>
              </span>
              <button
                type="button"
                onClick={onToggleZenMode}
                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md font-bold cursor-pointer transition-all shrink-0 text-[10px]"
              >
                Bật Zen Mode
              </button>
            </div>
          )}
        </div>

        {/* Textareas Split: Planned targets VS Achieved results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Chỉ tiêu đề ra trong kỳ</span>
              <button
                type="button"
                onClick={() => handleQuickSuggest("target")}
                disabled={isGeneratingTarget || !content.trim()}
                className="text-[10px] flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100/50 hover:bg-sky-50 text-slate-500 hover:text-sky-600 dark:bg-slate-800/50 dark:hover:bg-sky-950/30 dark:hover:text-sky-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Gợi ý tự động (AI) dựa trên Tiêu đề công việc"
              >
                <Sparkles className={`w-3 h-3 ${isGeneratingTarget ? "animate-spin text-sky-500" : ""}`} />
                <span>Gợi ý nhanh</span>
              </button>
            </label>
            <textarea
              rows={isZenMode ? 5 : 2}
              placeholder="Ví dụ: Hoàn tất 80%, giải trình số liệu kịp thời..."
              value={plannedProgress}
              onChange={(e) => setPlannedProgress(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>

          {" "}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider flex items-center justify-between">
              <span>Kết quả đạt được thực tế</span>
              <button
                type="button"
                onClick={() => handleQuickSuggest("result")}
                disabled={isGeneratingResult || !content.trim()}
                className="text-[10px] flex items-center space-x-1 px-2 py-0.5 rounded-full bg-slate-100/50 hover:bg-sky-50 text-slate-500 hover:text-sky-600 dark:bg-slate-800/50 dark:hover:bg-sky-950/30 dark:hover:text-sky-400 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Gợi ý tự động (AI) dựa trên Tiêu đề công việc"
              >
                <Sparkles className={`w-3 h-3 ${isGeneratingResult ? "animate-spin text-sky-500" : ""}`} />
                <span>Gợi ý nhanh</span>
              </button>
            </label>
            <textarea
              rows={isZenMode ? 5 : 2}
              placeholder="Đã soạn thảo văn bản thô, nhận bàn giao số liệu,..."
              value={resultText}
              onChange={(e) => setResultText(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Textareas 3: Next Plan & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Biện pháp giải quyết kì tới
            </label>
            <textarea
              rows={2}
              placeholder="Trình ký dự thảo, họp nhóm thống nhất..."
              value={nextPlan}
              onChange={(e) => setNextPlan(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Ghi chú nội bộ
            </label>
            <textarea
              rows={2}
              placeholder="Phòng ban phối hợp, các lý do trì hoãn..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Attachments list section */}
        <div className="border border-slate-100 dark:border-slate-800 rounded-lg p-3 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Tài liệu Minh chứng đính kèm
            </label>
            <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
              {/* Hidden native browser camera capture input */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="camera-capture-input"
                onChange={handleFileInputChange}
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => document.getElementById("camera-capture-input")?.click()}
                className="px-2.5 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-bold rounded-lg flex items-center space-x-1 shadow-xs cursor-pointer transition-all border border-emerald-500"
                title="Sử dụng API Camera của trình duyệt để chụp ảnh nhanh và đính kèm trực tiếp"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Đính kèm ảnh</span>
              </button>

              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-2.5 py-1 text-[10px] bg-sky-550 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold rounded-lg flex items-center space-x-1 shadow-xs cursor-pointer transition-all border border-sky-400"
                  title="Kích hoạt Webcam máy tính trực quan để chụp ảnh"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Kích hoạt Webcam</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2.5 py-1 text-[10px] bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/40 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-400 font-bold rounded-lg flex items-center space-x-1 cursor-pointer transition-all border border-rose-200 dark:border-rose-900"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Đóng Webcam</span>
                </button>
              )}
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-uploader")?.click()}
            className={`border-2 border-dashed rounded-xl p-4 mb-3 text-center cursor-pointer transition-all duration-200 select-none ${
              isDragging
                ? "border-sky-500 bg-sky-50/50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 animate-pulse"
                : "border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-800 bg-white dark:bg-[#111827] text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 shadow-xs"
            }`}
          >
            <input
              type="file"
              multiple
              id="file-uploader"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-1">
              <Upload className={`w-5 h-5 mb-1 ${isDragging ? "text-sky-550" : "text-slate-400"}`} />
              <p className="text-xs font-bold">Kéo thả ảnh/tài liệu minh chứng vào đây</p>
              <p className="text-[10px] text-slate-400">Hoặc nhấp chuột để chọn tệp tin từ thiết bị</p>
            </div>
          </div>

          {/* Camera preview video stream box */}
          {isCameraActive && (
            <div className="mb-4 p-3 bg-slate-950 rounded-xl relative overflow-hidden flex flex-col items-center border border-slate-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md h-52 object-cover rounded-lg border border-slate-800 bg-black"
                style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
              />
              {cameraError && (
                <p className="text-rose-400 text-[11px] font-bold mt-2 text-center">{cameraError}</p>
              )}
              {captureSuccess && (
                <div className="absolute top-5 bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-md animate-bounce shadow-md">
                  🎉 Đã chụp & Đính kèm ảnh thành công!
                </div>
              )}
              
              <div className="flex items-center space-x-4 mt-3">
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-full transition-all cursor-pointer"
                  title="Đổi camera trước/sau"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="w-12 h-12 bg-white hover:bg-slate-100 border-4 border-sky-500 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-md transform hover:scale-105 active:scale-95"
                  title="Chụp ảnh minh chứng"
                >
                  <span className="w-7 h-7 bg-rose-500 rounded-full block border border-slate-300"></span>
                </button>
                <div className="w-8"></div> {/* Spacer balance */}
              </div>
              <p className="text-[10px] text-slate-400 italic mt-2 text-center select-none">
                Mẹo: Hướng camera vào hồ sơ/kết quả thực tế rồi bấm nút Đỏ để chụp nhanh.
              </p>
            </div>
          )}

          <div className="flex space-x-2 mb-2">
            <input
              type="text"
              placeholder="Hoặc điền thủ công tên tệp tin (Ví dụ: CV_05_HĐ.pdf)"
              value={newAttachment}
              onChange={(e) => setNewAttachments(e.target.value)}
              className="flex-1 text-xs bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
            <button
              type="button"
              onClick={addAttachment}
              className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center"
            >
              Thêm
            </button>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2.5 pt-1.5">
              {attachments.map((att, idx) => {
                const isImage = att.startsWith("data:image/");
                return (
                  <div 
                    key={idx} 
                    className={`relative group inline-flex items-center border rounded-lg transition-all ${
                      isImage 
                        ? "w-14 h-14 border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xs" 
                        : "bg-sky-50 dark:bg-sky-950/20 text-sky-700 dark:text-sky-400 border-sky-105 dark:border-sky-900/50 px-2 py-0.5 text-[11px] font-medium"
                    }`}
                  >
                    {isImage ? (
                      <>
                        <img 
                          src={att} 
                          alt="Captured evidence preview" 
                          className="w-full h-full object-cover rounded-lg" 
                        />
                        <button 
                          type="button" 
                          onClick={() => removeAttachment(att)}
                          className="absolute -top-1.5 -right-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-full p-0.5 shadow-xs transition-opacity cursor-pointer"
                          title="Xóa ảnh"
                        >
                          <X className="w-2.5 h-2.5 stroke-[3]" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="truncate max-w-[155px] font-semibold">{att}</span>
                        <button 
                          type="button" 
                          onClick={() => removeAttachment(att)}
                          className="text-rose-500 hover:text-rose-600 font-bold focus:outline-hidden ml-1.5 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Buttons submission */}
        <div className="flex justify-end space-x-2 pt-2">
          {editLog && (
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(`worklog_draft_${editLog.id}`);
                onCancelEdit();
              }}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer"
            >
              Đóng chỉnh sửa
            </button>
          )}
          
          <button
            type="submit"
            className="bg-sky-500 hover:bg-sky-600 active:bg-sky-600 text-white px-5 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm cursor-pointer"
          >
            {editLog ? (
              <>
                <Save className="w-4 h-4" />
                <span>Cập nhật Nhật ký</span>
              </>
            ) : (
              <>
                <PlusCircle className="w-4 h-4" />
                <span>Lưu vào Nhật ký</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
