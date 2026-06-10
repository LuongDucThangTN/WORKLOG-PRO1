import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  WorkLog,
  STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  CATEGORY_OPTIONS,
} from "../types";
import { getCategoryColor } from "../utils";
import {
  Search,
  Plus,
  Calendar,
  Paperclip,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Circle,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  ChevronsRight,
  Filter,
  Eye,
  Camera,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface KanbanTabProps {
  logs: WorkLog[];
  userName?: string;
  userAvatar?: string;
  onUpdateLogStatus: (id: string, status: WorkLog["status"]) => void;
  onSelectEdit: (log: WorkLog) => void;
  onDeleteLog: (id: string) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export default function KanbanTab({
  logs,
  userName = "User",
  userAvatar = "",
  onUpdateLogStatus,
  onSelectEdit,
  onDeleteLog,
  isZenMode,
  onToggleZenMode,
}: KanbanTabProps) {
  // Local filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("Tất cả");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [selectedCardDetails, setSelectedCardDetails] =
    useState<WorkLog | null>(null);

  // Drag states
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<
    WorkLog["status"] | null
  >(null);

  // Filter logs locally based on search query, priority, category
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPriority =
      priorityFilter === "Tất cả" || log.priority === priorityFilter;
    const matchesCategory =
      categoryFilter === "Tất cả" || log.category === categoryFilter;

    return matchesSearch && matchesPriority && matchesCategory;
  });

  // Helpers
  const getPriorityColor = (priority: WorkLog["priority"]) => {
    switch (priority) {
      case "Khẩn":
        return "bg-rose-500/10 text-rose-500 border-rose-500/20";
      case "Cao":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "Trung bình":
        return "bg-sky-500/10 text-sky-500 border-sky-500/20";
      case "Thấp":
        return "bg-slate-500/10 text-slate-500 border-slate-500/20";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusIcon = (status: WorkLog["status"]) => {
    switch (status) {
      case "Hoàn thành":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "Đang thực hiện":
        return <Clock className="w-4 h-4 text-sky-500 animate-pulse" />;
      case "Chờ phối hợp":
        return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case "Tạm dừng":
        return <Circle className="w-4 h-4 text-rose-500" />;
      default:
        return <Circle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusColumnClass = (status: WorkLog["status"]) => {
    switch (status) {
      case "Hoàn thành":
        return "border-emerald-500/20 bg-emerald-500/5";
      case "Đang thực hiện":
        return "border-sky-500/20 bg-sky-500/5";
      case "Chờ phối hợp":
        return "border-amber-500/20 bg-amber-500/5";
      case "Tạm dừng":
        return "border-rose-500/20 bg-rose-500/5";
    }
  };

  // Drag & drop triggers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    // Use timeout so the drag ghost image remains solid while the source element fades
    setTimeout(() => {
      setDraggingCardId(id);
    }, 0);
  };

  const handleDragEnd = () => {
    setDraggingCardId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (
    e: React.DragEvent,
    targetStatus: WorkLog["status"],
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== targetStatus) {
      setDragOverColumn(targetStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent, status: WorkLog["status"]) => {
    e.preventDefault();
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: WorkLog["status"]) => {
    e.preventDefault();
    setDragOverColumn(null);
    const idStr =
      e.dataTransfer.getData("text/plain") ||
      (draggingCardId ? draggingCardId : "");
    if (idStr) {
      onUpdateLogStatus(idStr, targetStatus);
    }
    setDraggingCardId(null);
  };

  // Status step shifts
  const getNextStatus = (
    current: WorkLog["status"],
  ): WorkLog["status"] | null => {
    const idx = STATUS_OPTIONS.indexOf(current);
    if (idx < STATUS_OPTIONS.length - 1) {
      return STATUS_OPTIONS[idx + 1];
    }
    return null;
  };

  const getPrevStatus = (
    current: WorkLog["status"],
  ): WorkLog["status"] | null => {
    const idx = STATUS_OPTIONS.indexOf(current);
    if (idx > 0) {
      return STATUS_OPTIONS[idx - 1];
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Search and control panels */}
      <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[300px]">
          {/* Text search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm kiếm nhanh công việc trên bảng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 pl-9 pr-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Code category filter */}
          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="Tất cả">Tất cả Nhóm Công việc</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Options filter */}
          <div className="relative">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="Tất cả">Tất cả Độ ưu tiên</option>
              {PRIORITY_OPTIONS.map((pr) => (
                <option key={pr} value={pr}>
                  Ưu tiên: {pr}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-4 select-none">
          {onToggleZenMode && (
            <button
              onClick={onToggleZenMode}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer ${
                isZenMode
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
              title={isZenMode ? "Thu nhỏ" : "Mở rộng (Fullscreen)"}
            >
              {isZenMode ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {isZenMode ? "Thu nhỏ" : "Mở rộng"}
              </span>
            </button>
          )}

          <div className="text-right text-[11px] text-slate-400 font-semibold">
            Hiển thị:{" "}
            <span className="text-sky-500 font-extrabold">
              {filteredLogs.length}
            </span>{" "}
            / {logs.length} công việc
          </div>
        </div>
      </div>

      {/* Grid columns - Kanban Board Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start select-none">
        {STATUS_OPTIONS.map((statusColumn) => {
          const columnCards = filteredLogs.filter(
            (log) => log.status === statusColumn,
          );
          const isDragOver = dragOverColumn === statusColumn;
          return (
            <div
              key={statusColumn}
              onDragOver={(e) => handleDragOver(e, statusColumn)}
              onDragLeave={(e) => handleDragLeave(e, statusColumn)}
              onDrop={(e) => handleDrop(e, statusColumn)}
              className={`rounded-2xl border p-4 flex flex-col min-h-[500px] max-h-[70vh] transition-all duration-200 ${
                isDragOver
                  ? "ring-2 ring-sky-500 scale-[1.01] bg-slate-50 dark:bg-slate-800/80 shadow-md"
                  : getStatusColumnClass(statusColumn)
              } ${!isDragOver ? "border-slate-200 dark:border-slate-850" : "border-sky-500/30"}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 dark:border-slate-800/80 pb-2">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(statusColumn)}
                  <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {statusColumn}
                  </h3>
                </div>
                <span className="bg-slate-205 dark:bg-slate-800 text-[10px] font-black text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full">
                  {columnCards.length}
                </span>
              </div>

              {/* Column Content Area */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                <AnimatePresence>
                  {columnCards.length > 0 ? (
                    columnCards.map((log) => {
                      const nextStatus = getNextStatus(log.status);
                      const prevStatus = getPrevStatus(log.status);
                      const imageAttachments =
                        log.attachments?.filter((att) =>
                          att.startsWith("data:image/"),
                        ) || [];
                      const isDraggingThis = draggingCardId === log.id;

                      return (
                        <motion.div
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.2 }}
                          key={log.id}
                          draggable
                          onDragStart={(e: React.DragEvent<HTMLDivElement>) =>
                            handleDragStart(e, log.id)
                          }
                          onDragEnd={handleDragEnd}
                          className={`bg-white dark:bg-[#111827] border border-slate-150 dark:border-slate-805 rounded-xl p-3.5 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing group relative border-l-4 ${
                            isDraggingThis
                              ? "opacity-40 scale-95 ring-2 ring-sky-500 shadow-none z-50"
                              : ""
                          }`}
                          style={{
                            borderLeftColor:
                              log.priority === "Khẩn"
                                ? "#f43f5e"
                                : log.priority === "Cao"
                                  ? "#f97316"
                                  : log.priority === "Trung bình"
                                    ? "#0ea5e9"
                                    : "#64748b",
                          }}
                        >
                          {/* Task Priority & Date Row */}
                          <div className="flex justify-between items-center mb-1.5 gap-2">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-sm border ${getPriorityColor(log.priority)}`}
                            >
                              {log.priority}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{log.date}</span>
                            </span>
                          </div>

                          {/* Task Content text */}
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed mb-2 group-hover:text-sky-505 transition-colors">
                            {log.content}
                          </h4>

                          {/* Category tag */}
                          <div
                            className={`text-[10px] font-bold truncate px-2 py-0.5 rounded-full inline-block max-w-full border ${getCategoryColor(log.category)}`}
                          >
                            {log.category}
                          </div>

                          {/* Assignee Avatar */}
                          <div className="flex items-center space-x-1.5 mt-2.5 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                            {userAvatar ? (
                              <img
                                src={userAvatar}
                                alt="Assignee avatar"
                                className="w-5 h-5 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 flex items-center justify-center text-[10px] font-bold border border-sky-200 dark:border-sky-800">
                                {userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate flex-1">
                              {userName}
                            </span>
                          </div>

                          {/* Micro Mini Image Previews inside the Kanban Card */}
                          {imageAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 mb-1">
                              {imageAttachments.slice(0, 3).map((img, idx) => (
                                <div
                                  key={idx}
                                  className="w-8 h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-100 overflow-hidden relative shadow-xs"
                                >
                                  <img
                                    src={img}
                                    alt="Evidence block"
                                    className="w-full h-full object-cover"
                                  />
                                  {idx === 2 && imageAttachments.length > 3 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[8px] font-black text-white">
                                      +{imageAttachments.length - 2}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Details summary icons */}
                          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 mt-2.5 pt-2">
                            <div className="flex items-center space-x-2 text-slate-400">
                              {log.attachments?.length > 0 && (
                                <span
                                  className="text-[10px] flex items-center space-x-0.5"
                                  title={`${log.attachments.length} đính kèm`}
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span className="font-bold">
                                    {log.attachments.length}
                                  </span>
                                </span>
                              )}
                              {log.notes && (
                                <span className="text-[10px] inline-block font-medium truncate max-w-[100px] text-slate-400 dark:text-slate-500 italic">
                                  Có ghi chú
                                </span>
                              )}
                            </div>

                            {/* Quick action buttons on card */}
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => setSelectedCardDetails(log)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md transition-all cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onSelectEdit(log)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-md transition-all cursor-pointer"
                                title="Chỉnh sửa công việc"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteLog(log.id)}
                                className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded-md transition-all cursor-pointer"
                                title="Xóa công việc"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Mobile & tablet friendly Status Column Arrow Shifters */}
                          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/80 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800/80 mt-2 gap-1">
                            <button
                              type="button"
                              disabled={!prevStatus}
                              onClick={() =>
                                prevStatus &&
                                onUpdateLogStatus(log.id, prevStatus)
                              }
                              className={`p-1 rounded-sm text-slate-400 transition-all ${
                                prevStatus
                                  ? "hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-sky-500 cursor-pointer"
                                  : "opacity-30 cursor-not-allowed"
                              }`}
                              title={
                                prevStatus
                                  ? `Chuyển về trạng thái: ${prevStatus}`
                                  : "Không thể lùi nữa"
                              }
                            >
                              <ArrowLeft className="w-3 h-3" />
                            </button>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest text-center select-none truncate">
                              Dời cột
                            </span>
                            <button
                              type="button"
                              disabled={!nextStatus}
                              onClick={() =>
                                nextStatus &&
                                onUpdateLogStatus(log.id, nextStatus)
                              }
                              className={`p-1 rounded-sm text-slate-400 transition-all ${
                                nextStatus
                                  ? "hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-sky-505 cursor-pointer"
                                  : "opacity-30 cursor-not-allowed"
                              }`}
                              title={
                                nextStatus
                                  ? `Chuyển sang trạng thái: ${nextStatus}`
                                  : "Đã hoàn thành tối đa"
                              }
                            >
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-4 text-center mt-3 py-8"
                    >
                      <p className="text-[10px] text-slate-400 italic">
                        Không tìm thấy công việc phù hợp
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal for detailed card display */}
      {selectedCardDetails && (
        <div
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in"
          onClick={() => setSelectedCardDetails(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-slate-800 dark:text-slate-100 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedCardDetails(null)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 p-1.5 rounded-full transition-all cursor-pointer"
            >
              <Eye className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${getPriorityColor(selectedCardDetails.priority)}`}
              >
                Độ ưu tiên: {selectedCardDetails.priority}
              </span>
              <h3 className="text-base font-black text-slate-850 dark:text-slate-100 mt-2.5">
                {selectedCardDetails.content}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-bold mb-1">
                  Nhóm Công việc:
                </span>
                <span
                  className={`px-2 py-0.5 text-[11px] rounded-full font-bold border inline-block ${getCategoryColor(selectedCardDetails.category)}`}
                >
                  {selectedCardDetails.category}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">
                  Ngày báo cáo:
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedCardDetails.date}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-bold">
                  Trạng thái xử lý:
                </span>
                <span className="font-semibold text-sky-500 flex items-center space-x-1">
                  {getStatusIcon(selectedCardDetails.status)}
                  <span>{selectedCardDetails.status}</span>
                </span>
              </div>
              {selectedCardDetails.dueDate && (
                <div>
                  <span className="text-rose-400 block font-bold">
                    Hạn hoàn thành:
                  </span>
                  <span className="font-bold text-rose-500">
                    {selectedCardDetails.dueDate}
                  </span>
                </div>
              )}
            </div>

            {selectedCardDetails.plannedProgress && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Kế hoạch chỉ tiêu theo tiến độ
                </span>
                <p className="text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedCardDetails.plannedProgress}
                </p>
              </div>
            )}

            {selectedCardDetails.resultText && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Kết quả thực tế đạt được
                </span>
                <p className="text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedCardDetails.resultText}
                </p>
              </div>
            )}

            {selectedCardDetails.nextPlan && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Kế hoạch tiếp theo / Phương án phòng ngừa
                </span>
                <p className="text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {selectedCardDetails.nextPlan}
                </p>
              </div>
            )}

            {selectedCardDetails.notes && (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider mb-1">
                  Ghi chú & Lý do trì hoãn
                </span>
                <p className="text-xs bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg text-slate-750 dark:text-slate-400 whitespace-pre-wrap">
                  {selectedCardDetails.notes}
                </p>
              </div>
            )}

            {selectedCardDetails.attachments &&
              selectedCardDetails.attachments.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                  <span className="text-slate-400 block text-[11px] font-bold uppercase tracking-wider mb-2">
                    Tài liệu, ảnh minh chứng:
                  </span>

                  {/* Image Attachments */}
                  {selectedCardDetails.attachments.filter((a) =>
                    a.startsWith("data:image/"),
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {selectedCardDetails.attachments
                        .filter((a) => a.startsWith("data:image/"))
                        .map((img, i) => (
                          <div
                            key={i}
                            className="relative w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden shrink-0"
                          >
                            <img
                              src={img}
                              alt="Evidence element zoomed"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                    </div>
                  )}

                  {/* File Name Attachments */}
                  {selectedCardDetails.attachments.filter(
                    (a) => !a.startsWith("data:image/"),
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCardDetails.attachments
                        .filter((a) => !a.startsWith("data:image/"))
                        .map((attName, i) => (
                          <span
                            key={i}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 px-2.5 py-1 rounded text-[10px] text-slate-600 dark:text-slate-450 font-bold shadow-xs"
                          >
                            {attName}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
              )}

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
              <button
                onClick={() => {
                  onSelectEdit(selectedCardDetails);
                  setSelectedCardDetails(null);
                }}
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Chỉnh sửa nhật ký
              </button>
              <button
                onClick={() => setSelectedCardDetails(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
