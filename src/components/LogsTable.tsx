import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { WorkLog, FilterState } from "../types";
import {
  toDisplayDate,
  getCategoryColor,
  getPriorityBadge,
  getStatusBadge,
} from "../utils";

const getProgressPercentage = (log: WorkLog): number => {
  if (log.status === "Hoàn thành") return 100;

  // Try to find a percentage number (e.g. 80%, 45%) in results, planned progress or content description
  const percentRegex = /(\d+)\s*%/;
  const sources = [log.resultText, log.plannedProgress, log.content];
  for (const src of sources) {
    if (src) {
      const match = src.match(percentRegex);
      if (match) {
        const value = parseInt(match[1], 10);
        if (value >= 0 && value <= 100) {
          return value;
        }
      }
    }
  }

  // Smart inference based on keywords in content or results
  const lowerContent = (log.content || "").toLowerCase();
  const lowerResult = (log.resultText || "").toLowerCase();

  if (
    lowerResult.includes("hoàn thành") ||
    lowerResult.includes("bàn giao xong") ||
    lowerResult.includes("đạt 100%")
  ) {
    return 100;
  }
  if (
    lowerResult.includes("đang soạn") ||
    lowerResult.includes("đang làm") ||
    lowerResult.includes("triển khai")
  ) {
    return 40;
  }
  if (lowerContent.includes("bắt đầu") || lowerResult.includes("chuẩn bị")) {
    return 15;
  }

  // Standard fallback ratios based on status
  switch (log.status) {
    case "Đang thực hiện":
      return 50;
    case "Chờ phối hợp":
      return 30;
    case "Tạm dừng":
      return 15;
    default:
      return 0;
  }
};
import {
  ArrowUpDown,
  Edit2,
  Trash2,
  Copy,
  Paperclip,
  Check,
  FileText,
  Search,
  CheckCircle2,
  Maximize2,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Clock,
  ChevronLeft,
  Calendar,
  Layers,
  History,
  BellRing,
  CalendarRange,
  AlertTriangle,
  Inbox,
  GitCompare,
  LayoutGrid,
  LayoutList,
} from "lucide-react";

interface LogsTableProps {
  logs: WorkLog[];
  onSelectEdit: (log: WorkLog) => void;
  onDeleteLog: (id: string) => Promise<void>;
  onDuplicateLog: (log: WorkLog) => Promise<void>;
  onUpdateStatus: (
    id: string,
    status: "Hoàn thành" | "Đang thực hiện",
  ) => Promise<void>;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  priorityFilter: string;
  setPriorityFilter: (priority: string) => void;
  isLoading?: boolean;
  filters?: FilterState;
  setFilters?: (filters: FilterState) => void;
}

export default function LogsTable({
  logs,
  onSelectEdit,
  onDeleteLog,
  onDuplicateLog,
  onUpdateStatus,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  isLoading = false,
  filters,
  setFilters,
}: LogsTableProps) {
  // Local UI parameters
  const [density, setDensity] = useState<"compact" | "comfort" | "notion">(
    "comfort",
  );
  const [sortField, setSortField] = useState<keyof WorkLog>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedRow, setSelectedRow] = useState<WorkLog | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [isContentCollapsed, setIsContentCollapsed] = useState<boolean>(true);
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState<string[]>([]);
  const [viewType, setViewType] = useState<"table" | "card">(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768 ? "card" : "table";
    }
    return "table";
  });

  // Milestone configs for Quick Filters
  const today = new Date();
  const format = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = format(today);

  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = format(yesterday);

  // This week bounds (Monday - Sunday)
  const currentDay = today.getDay();
  const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
  const monday = new Date(today.getFullYear(), today.getMonth(), diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekStart = format(monday);
  const weekEnd = format(sunday);

  // This month
  const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const monthStart = format(firstDayMonth);
  const monthEnd = format(lastDayMonth);

  // Last month
  const firstDayLastMonth = new Date(
    today.getFullYear(),
    today.getMonth() - 1,
    1,
  );
  const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const lastMonthStart = format(firstDayLastMonth);
  const lastMonthEnd = format(lastDayLastMonth);

  const milestones = [
    {
      id: "all",
      label: "Tất cả",
      start: "",
      end: "",
      dueScope: "Tất cả",
      icon: "Inbox",
      color:
        "bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100",
      activeColor:
        "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold border-slate-900 dark:border-slate-100 shadow-xs",
    },
    {
      id: "today",
      label: "Nhật ký Hôm nay",
      start: todayStr,
      end: todayStr,
      dueScope: "Tất cả",
      icon: "Clock",
      color:
        "bg-sky-50 dark:bg-sky-950/20 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/30",
      activeColor:
        "bg-sky-500 text-white dark:bg-sky-600 dark:text-white font-extrabold border-sky-500 shadow-sm ring-2 ring-sky-500/25",
    },
    {
      id: "yesterday",
      label: "Nhật ký Hôm qua",
      start: yesterdayStr,
      end: yesterdayStr,
      dueScope: "Tất cả",
      icon: "ChevronLeft",
      color:
        "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30",
      activeColor:
        "bg-blue-500 text-white dark:bg-blue-600 dark:text-white font-extrabold border-blue-500 shadow-sm ring-2 ring-blue-500/25",
    },
    {
      id: "week",
      label: "Nhật ký Tuần này",
      start: weekStart,
      end: weekEnd,
      dueScope: "Tất cả",
      icon: "Calendar",
      color:
        "bg-indigo-50 dark:bg-indigo-950/20 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30",
      activeColor:
        "bg-indigo-500 text-white dark:bg-indigo-600 dark:text-white font-extrabold border-indigo-500 shadow-sm ring-2 ring-indigo-500/25",
    },
    {
      id: "month",
      label: "Nhật ký Tháng này",
      start: monthStart,
      end: monthEnd,
      dueScope: "Tất cả",
      icon: "Layers",
      color:
        "bg-purple-50 dark:bg-purple-950/20 hover:bg-purple-100 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30",
      activeColor:
        "bg-purple-500 text-white dark:bg-purple-600 dark:text-white font-extrabold border-purple-500 shadow-sm ring-2 ring-purple-500/25",
    },
    {
      id: "lastMonth",
      label: "Tháng trước",
      start: lastMonthStart,
      end: lastMonthEnd,
      dueScope: "Tất cả",
      icon: "History",
      color:
        "bg-violet-50 dark:bg-violet-950/20 hover:bg-violet-100 text-violet-700 dark:text-violet-300 border border-violet-100 dark:border-violet-900/30",
      activeColor:
        "bg-violet-500 text-white dark:bg-violet-600 dark:text-white font-extrabold border-violet-500 shadow-sm ring-2 ring-violet-500/25",
    },
    {
      id: "dueToday",
      label: "Hạn hôm nay",
      start: "",
      end: "",
      dueScope: "Đến hạn hôm nay",
      icon: "BellRing",
      color:
        "bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 text-amber-700 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30",
      activeColor:
        "bg-amber-500 text-white dark:bg-amber-600 dark:text-white font-extrabold border-amber-500 shadow-sm ring-2 ring-amber-500/25",
    },
    {
      id: "due7Days",
      label: "Hạn 7 ngày tới",
      start: "",
      end: "",
      dueScope: "Sắp đến hạn 7 ngày",
      icon: "CalendarRange",
      color:
        "bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30",
      activeColor:
        "bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white font-extrabold border-emerald-500 shadow-sm ring-2 ring-emerald-500/25",
    },
    {
      id: "overdue",
      label: "Hạn đã Quá hạn",
      start: "",
      end: "",
      dueScope: "Quá hạn",
      icon: "AlertTriangle",
      color:
        "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30",
      activeColor:
        "bg-rose-500 text-white dark:bg-rose-600 dark:text-white font-extrabold border-rose-500 shadow-sm ring-2 ring-rose-500/25",
    },
  ];

  const getMilestoneIcon = (name: string) => {
    switch (name) {
      case "Clock":
        return <Clock className="w-3.5 h-3.5 mr-1" />;
      case "ChevronLeft":
        return <ChevronLeft className="w-3.5 h-3.5 mr-1" />;
      case "Calendar":
        return <Calendar className="w-3.5 h-3.5 mr-1" />;
      case "Layers":
        return <Layers className="w-3.5 h-3.5 mr-1" />;
      case "History":
        return <History className="w-3.5 h-3.5 mr-1" />;
      case "BellRing":
        return <BellRing className="w-3.5 h-3.5 mr-1" />;
      case "CalendarRange":
        return <CalendarRange className="w-3.5 h-3.5 mr-1" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-3.5 h-3.5 mr-1" />;
      default:
        return <Inbox className="w-3.5 h-3.5 mr-1" />;
    }
  };

  const isMilestoneActive = (m: (typeof milestones)[number]) => {
    if (!filters) return false;
    return (
      filters.start === m.start &&
      filters.end === m.end &&
      filters.dueScope === m.dueScope
    );
  };

  const isAnyFilterActive = filters
    ? filters.start !== "" ||
      filters.end !== "" ||
      filters.dueScope !== "Tất cả"
    : false;

  // Categories list for inline select header
  const inlineCategories = [
    "Tất cả",
    ...Array.from(new Set(logs.map((l) => l.category))),
  ];
  const inlinePriorities = ["Tất cả", "Khẩn", "Cao", "Trung bình", "Thấp"];
  const inlineStatuses = [
    "Tất cả",
    "Hoàn thành",
    "Đang thực hiện",
    "Chờ phối hợp",
    "Tạm dừng",
  ];

  const handleSort = (field: keyof WorkLog) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Sort logs
  const sortedLogs = [...logs].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (valA === undefined) valA = "";
    if (valB === undefined) valB = "";

    if (typeof valA === "string" && typeof valB === "string") {
      return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === "number" && typeof valB === "number") {
      return sortAsc ? valA - valB : valB - valA;
    }
    return 0;
  });

  // Calculate density classes
  const getDensityPadding = () => {
    switch (density) {
      case "compact":
        return "py-1.5 px-3 text-[11px]";
      case "notion":
        return "py-4.5 px-5 text-sm";
      default:
        return "py-3 px-4 text-xs"; // comfort default
    }
  };

  // Calculate completion percentage based on total logs and completed logs
  const totalLogs = logs.length;
  const completedLogs = logs.filter(
    (log) => log.status === "Hoàn thành",
  ).length;
  const overdueLogs = logs.filter(
    (log) =>
      log.dueDate && log.dueDate < todayStr && log.status !== "Hoàn thành",
  ).length;
  const inProgressLogs = logs.filter(
    (log) => log.status === "Đang thực hiện",
  ).length;
  const progressPercent =
    totalLogs > 0 ? Math.round((completedLogs / totalLogs) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Quick Summary & Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs print:hidden space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="space-y-1">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center">
              <CheckCircle2 className="w-4.5 h-4.5 mr-2 text-emerald-500" />
              Tổng quan tiến độ hiện tại
            </span>
            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center flex-wrap gap-2 sm:ml-6.5">
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Hoàn thành {completedLogs} việc
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="font-medium text-sky-600 dark:text-sky-400">
                Đang làm {inProgressLogs} việc
              </span>
              {overdueLogs > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="font-medium text-rose-600 dark:text-rose-400 flex items-center">
                    <AlertTriangle className="w-3 h-3 mr-0.5" />
                    {overdueLogs} việc quá hạn
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="text-right flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
              {progressPercent}%
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({completedLogs}/{totalLogs} việc)
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${
              progressPercent === 100
                ? "bg-emerald-500"
                : progressPercent >= 75
                  ? "bg-teal-500"
                  : progressPercent >= 45
                    ? "bg-sky-500"
                    : progressPercent >= 20
                      ? "bg-amber-500"
                      : "bg-rose-500"
            }`}
          />
        </div>
      </motion.div>

      {/* Quick Filter Milestone Chips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-white dark:bg-[#111827] p-5 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4 print:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center space-x-1.5">
            <span className="p-1 rounded-md bg-sky-50 dark:bg-sky-950/40 text-sky-500">
              <Calendar className="w-3.5 h-3.5" />
            </span>
            <span>Phân loại mốc thời gian nhanh:</span>
          </span>
          {isAnyFilterActive && setFilters && filters && (
            <button
              onClick={() => {
                setFilters({
                  ...filters,
                  start: "",
                  end: "",
                  dueScope: "Tất cả",
                });
              }}
              className="text-[10px] uppercase font-bold text-rose-500 hover:text-rose-600 transition-colors flex items-center space-x-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Xóa bộ lọc</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {milestones.map((m) => {
            const active = isMilestoneActive(m);
            return (
              <button
                key={m.id}
                onClick={() => {
                  if (setFilters && filters) {
                    setFilters({
                      ...filters,
                      start: m.start,
                      end: m.end,
                      dueScope: m.dueScope,
                    });
                  }
                }}
                className={`px-2.5 py-1 text-[11px] rounded-lg transition-all border flex items-center cursor-pointer ${
                  active
                    ? m.activeColor
                    : `${m.color} border-slate-200 dark:border-slate-800/80`
                }`}
              >
                {getMilestoneIcon(m.icon)}
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Table density togglers & Quick Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/80 shadow-xs"
      >
        <div className="flex items-center space-x-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Độ giãn dòng:</span>
          </span>
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-[#111827]">
            <button
              onClick={() => setDensity("compact")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                density === "compact"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Chật
            </button>
            <button
              onClick={() => setDensity("comfort")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                density === "comfort"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Vừa
            </button>
            <button
              onClick={() => setDensity("notion")}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                density === "notion"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Thoáng
            </button>
          </div>

          <div className="h-4 w-px bg-slate-250 dark:bg-slate-800 hidden sm:block" />

          {/* View Type Toggle (Mobile Card vs Table) */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-[#111827]">
            <button
              onClick={() => setViewType("table")}
              className={`px-2 py-1 flex items-center space-x-1 text-[10px] font-bold rounded-md transition-all ${
                viewType === "table"
                  ? "bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Giao diện Bảng"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Bảng</span>
            </button>
            <button
              onClick={() => setViewType("card")}
              className={`px-2 py-1 flex items-center space-x-1 text-[10px] font-bold rounded-md transition-all ${
                viewType === "card"
                  ? "bg-slate-100 dark:bg-slate-800 text-sky-600 dark:text-sky-400"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Giao diện Thẻ (tiện trên thiết bị hẹp)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Thẻ</span>
            </button>
          </div>

          <button
            onClick={() => setIsContentCollapsed(!isContentCollapsed)}
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center space-x-1.5 transition-all cursor-pointer ${
              isContentCollapsed
                ? "bg-white dark:bg-[#111827] text-slate-600 border-slate-200 hover:bg-slate-50 dark:border-slate-850 dark:text-slate-400 dark:hover:bg-slate-800/80"
                : "bg-sky-500 hover:bg-sky-600 text-white border-sky-500 shadow-sm"
            }`}
            title={
              isContentCollapsed
                ? "Mở rộng nội dung toàn bộ dòng"
                : "Thu gọn nội dung dòng để tối ưu không gian màn hình"
            }
          >
            {isContentCollapsed ? (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Xem đầy đủ</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Rút gọn</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsComparisonMode(!isComparisonMode);
              if (!isComparisonMode) {
                setSelectedCompareIds([]);
              }
            }}
            type="button"
            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center space-x-1.5 transition-all cursor-pointer ${
              isComparisonMode
                ? "bg-violet-650 hover:bg-violet-700 text-white border-violet-600 shadow-sm"
                : "bg-white dark:bg-[#111827] text-slate-600 border-slate-200 hover:bg-slate-50 dark:border-slate-855 dark:text-slate-400 dark:hover:bg-slate-800/80"
            }`}
            title="Kích hoạt chế độ chọn so sánh song song 2-3 nhật ký"
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>So sánh ({selectedCompareIds.length}/3)</span>
          </button>
        </div>

        {/* Filters Header Summary Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Priority Toggles */}
          <div className="flex items-center space-x-1 border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111827] px-1 py-1 rounded-lg">
            <span className="text-[10px] font-bold text-slate-400 px-1 uppercase tracking-wider hidden sm:inline-block">
              Lọc:
            </span>
            <button
              onClick={() =>
                setPriorityFilter(priorityFilter === "Khẩn" ? "Tất cả" : "Khẩn")
              }
              className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors flex items-center ${
                priorityFilter === "Khẩn"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30"
              }`}
              title="Chỉ hiện các công việc Khẩn"
            >
              <AlertTriangle className="w-2.5 h-2.5 mr-1" />
              Khẩn
            </button>
            <button
              onClick={() =>
                setPriorityFilter(priorityFilter === "Cao" ? "Tất cả" : "Cao")
              }
              className={`px-2.5 py-0.5 text-[10px] font-bold rounded cursor-pointer transition-colors ${
                priorityFilter === "Cao"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              }`}
              title="Chỉ hiện các công việc ưu tiên Cao"
            >
              Cao
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block mx-1" />

          {/* Category Filter dropdown */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-[#111827] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-650 dark:text-slate-400">
            <span>Nhóm:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden text-slate-850 dark:text-slate-200 cursor-pointer"
            >
              {inlineCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-[#111827] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-650 dark:text-slate-400">
            <span>Ưu tiên:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden text-slate-850 dark:text-slate-200 cursor-pointer"
            >
              {inlinePriorities.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center space-x-1.5 bg-white dark:bg-[#111827] px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-medium text-slate-650 dark:text-slate-400">
            <span>Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-bold focus:outline-hidden text-slate-850 dark:text-slate-200 cursor-pointer"
            >
              {inlineStatuses.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </motion.div>

      {/* Guide Banner for Comparison Mode */}
      <AnimatePresence>
        {isComparisonMode && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.98 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            className="bg-violet-50 dark:bg-violet-950/20 border border-violet-150 dark:border-violet-900/60 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs leading-relaxed shadow-xs"
          >
            <div className="flex items-start space-x-2.5 text-violet-850 dark:text-violet-300">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 font-bold shrink-0">
                <GitCompare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sm">
                  Chế độ so sánh tiến độ nhật ký hoàn thành
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                  Vui lòng chọn <strong>2 hoặc 3 mục nhật ký</strong> từ danh
                  sách bên dưới bằng cách bấm trực tiếp vào dòng hoặc tích nút
                  tròn để bắt đầu đối chiếu song song Nội dung, Kết quả, Ghi
                  chú.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-end md:self-center">
              {selectedCompareIds.length > 0 && (
                <button
                  onClick={() => setSelectedCompareIds([])}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-250 cursor-pointer transition-colors"
                >
                  Hủy chọn tất cả ({selectedCompareIds.length})
                </button>
              )}
              <button
                onClick={() => {
                  setIsComparisonMode(false);
                  setSelectedCompareIds([]);
                }}
                className="px-3 py-1.5 text-xs font-extrabold text-rose-600 hover:text-rose-700 bg-rose-50 dark:bg-rose-950/30 rounded-lg cursor-pointer transition-all active:scale-95 border border-rose-100 dark:border-rose-900"
              >
                Tắt Chế độ
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comparison Board widget side-by-side */}
      <AnimatePresence>
        {isComparisonMode && selectedCompareIds.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white dark:bg-[#111827] rounded-2xl border border-violet-200 dark:border-violet-900/50 overflow-hidden shadow-lg no-page-break-inside"
          >
            <div className="bg-gradient-to-r from-violet-500/10 to-indigo-500/10 p-3.5 border-b border-violet-100 dark:border-violet-900/50 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <GitCompare className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                  Khung đối chiếu tiến độ song song ({selectedCompareIds.length}{" "}
                  bản ghi nhật ký)
                </h4>
              </div>
              <button
                onClick={() => setSelectedCompareIds([])}
                className="p-1 rounded-full text-slate-450 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                title="Xoá so sánh hiện tại"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-fixed text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-800">
                    <th className="p-3 font-bold text-slate-400 w-1/4 uppercase tracking-wider text-[10px]">
                      Chỉ tiêu so sánh
                    </th>
                    {selectedCompareIds.map((id, index) => {
                      const logItem = logs.find((l) => l.id === id);
                      if (!logItem) return null;
                      return (
                        <th
                          key={id}
                          className="p-3 font-bold text-slate-755 dark:text-slate-200 w-1/4 border-l border-slate-150 dark:border-slate-850"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold truncate">
                              Bản ghi #{logItem.id} (Mục {index + 1})
                            </span>
                            <button
                              onClick={() =>
                                setSelectedCompareIds(
                                  selectedCompareIds.filter(
                                    (cid) => cid !== id,
                                  ),
                                )
                              }
                              className="text-slate-400 hover:text-rose-500 transition-colors p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Gỡ khỏi bảng"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </th>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <th className="p-3 font-medium text-slate-400 w-1/4 italic border-l border-slate-150 dark:border-slate-850 bg-slate-50/20 dark:bg-slate-900/10">
                        (Có thể tích chọn thêm 1 nhật ký nữa)
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 font-medium">
                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5">
                    <td className="p-3 font-bold text-slate-500 bg-slate-50/30 dark:bg-slate-905/10">
                      Ngày thực hiện
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 font-extrabold text-slate-800 dark:text-slate-300 border-l border-slate-150 dark:border-slate-850"
                        >
                          {logItem ? toDisplayDate(logItem.date) : ""}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5">
                    <td className="p-3 font-bold text-slate-500 bg-slate-50/30 dark:bg-slate-905/10">
                      Phần việc thuộc nhóm
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 border-l border-slate-150 dark:border-slate-850"
                        >
                          {logItem && (
                            <span
                              className={`px-2 py-0.5 text-[10px] rounded-full font-black border inline-block ${getCategoryColor(logItem.category)}`}
                            >
                              {logItem.category}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5">
                    <td className="p-3 font-bold text-slate-500 bg-slate-50/30 dark:bg-slate-905/10">
                      Trạng thái hiện tại
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 border-l border-slate-150 dark:border-slate-850"
                        >
                          {logItem && (
                            <span
                              className={`px-2 py-0 font-bold text-[10px] border inline-block ${getStatusBadge(logItem.status)}`}
                            >
                              {logItem.status}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5">
                    <td className="p-3 font-bold text-slate-500 bg-slate-50/30 dark:bg-slate-905/10">
                      Độ ưu tiên
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 border-l border-slate-150 dark:border-slate-850"
                        >
                          {logItem && (
                            <span
                              className={`px-2 py-0 font-bold text-[10px] border inline-block ${getPriorityBadge(logItem.priority)}`}
                            >
                              {logItem.priority}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5">
                    <td className="p-3 font-bold text-slate-500 bg-slate-50/30 dark:bg-slate-905/10">
                      Hạn hoàn thành
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 font-semibold text-slate-600 dark:text-slate-400 border-l border-slate-150 dark:border-slate-850"
                        >
                          {logItem?.dueDate
                            ? toDisplayDate(logItem.dueDate)
                            : "-"}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5">
                    <td className="p-3 font-bold text-slate-500 bg-slate-50/30 dark:bg-slate-905/10">
                      Tiến độ chi tiết
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      if (!logItem)
                        return (
                          <td
                            key={id}
                            className="p-3 border-l border-slate-150 dark:border-slate-850"
                          ></td>
                        );
                      const percent = getProgressPercentage(logItem);
                      return (
                        <td
                          key={id}
                          className="p-3 border-l border-slate-150 dark:border-slate-850"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  percent === 100
                                    ? "bg-emerald-500"
                                    : percent >= 75
                                      ? "bg-teal-500"
                                      : percent >= 45
                                        ? "bg-sky-500"
                                        : percent >= 20
                                          ? "bg-amber-500"
                                          : "bg-rose-500"
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                            <span className="font-extrabold font-mono text-[10px] text-slate-700 dark:text-slate-350">
                              {percent}%
                            </span>
                          </div>
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  {/* Primary compare fields requested: Nội dung, Kết quả, Ghi chú */}
                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5 select-text">
                    <td className="p-3 font-bold text-slate-800 bg-slate-100/40 dark:bg-slate-900/30 align-top">
                      Nội dung công việc
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 text-slate-800 dark:text-slate-300 border-l border-slate-150 dark:border-slate-850 align-top whitespace-pre-wrap leading-relaxed font-bold"
                        >
                          {logItem?.content || (
                            <span className="text-slate-400 italic font-normal">
                              (Không ghi chép nội dung)
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5 select-text">
                    <td className="p-3 font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-950/10 align-top">
                      Kết quả thu hoạch
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 text-emerald-700 dark:text-emerald-450 border-l border-slate-150 dark:border-slate-855 align-top whitespace-pre-wrap leading-relaxed font-semibold"
                        >
                          {logItem?.resultText || (
                            <span className="text-slate-400 italic font-normal">
                              (Chưa thu hoạch kết quả thực tế)
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-855 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5 select-text">
                    <td className="p-3 font-bold text-slate-650 bg-slate-50/30 dark:bg-slate-905/10 align-top">
                      Ghi chú nội bộ
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 text-slate-600 dark:text-slate-400 italic border-l border-slate-150 dark:border-slate-850 align-top whitespace-pre-wrap leading-relaxed"
                        >
                          {logItem?.notes || (
                            <span className="text-slate-350 dark:text-slate-600 font-normal italic">
                              (Không có ghi chú)
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  {/* Additional detailed criteria to enrich comparison */}
                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5 select-text">
                    <td className="p-3 font-bold text-slate-500 bg-slate-50/30 dark:bg-slate-905/10 align-top">
                      Mục tiêu chỉ tiêu đề ra
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 text-slate-700 dark:text-slate-350 border-l border-slate-150 dark:border-slate-850 align-top whitespace-pre-wrap leading-relaxed"
                        >
                          {logItem?.plannedProgress || (
                            <span className="text-slate-350 dark:text-slate-600 italic font-normal">
                              (Không thiết lập)
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>

                  <tr className="hover:bg-slate-50/25 dark:hover:bg-slate-900/5 select-text">
                    <td className="p-3 font-bold text-indigo-800 dark:text-indigo-400 bg-indigo-50/10 dark:bg-indigo-950/10 align-top">
                      Kế hoạch kỳ tiếp theo
                    </td>
                    {selectedCompareIds.map((id) => {
                      const logItem = logs.find((l) => l.id === id);
                      return (
                        <td
                          key={id}
                          className="p-3 text-indigo-700 dark:text-indigo-400 border-l border-slate-150 dark:border-slate-850 align-top whitespace-pre-wrap leading-relaxed"
                        >
                          {logItem?.nextPlan || (
                            <span className="text-slate-350 dark:text-slate-600 italic font-normal">
                              (Chưa thiết lập phương án)
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {selectedCompareIds.length < 3 && (
                      <td className="p-3 border-l border-slate-150 dark:border-slate-850 bg-slate-50/10 dark:bg-slate-900/5"></td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Responsive Table Grid */}
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-150 dark:border-slate-800/80 overflow-hidden shadow-sm"
      >
        {viewType === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 block md:table-row">
                  {isComparisonMode && (
                    <th className="py-2.5 px-4 block md:table-cell w-16 text-center">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                        Chọn
                      </span>
                    </th>
                  )}

                  <th className="py-2.5 px-4 block md:table-cell">
                    <button
                      onClick={() => handleSort("date")}
                      className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span>Ngày</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </th>

                  <th className="py-2.5 px-4 block md:table-cell">
                    <button
                      onClick={() => handleSort("category")}
                      className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span>Phần việc</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </th>

                  <th className="py-2.5 px-4 block md:table-cell">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Trạng thái
                    </span>
                  </th>

                  <th className="py-2.5 px-4 block md:table-cell">
                    <button
                      onClick={() => handleSort("priority")}
                      className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span>Khẩn/Cao</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </th>

                  <th className="py-2.5 px-4 block md:table-cell">
                    <button
                      onClick={() => handleSort("dueDate")}
                      className="flex items-center space-x-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                    >
                      <span>Hạn</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                  </th>

                  <th className="py-2.5 px-4 block md:table-cell w-1/3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Nội dung mô tả công việc
                    </span>
                  </th>

                  <th className="py-2.5 px-4 block md:table-cell text-right">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Thao tác
                    </span>
                  </th>
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, idx) => {
                    const paddingClass = getDensityPadding();
                    return (
                      <tr
                        key={`skeleton-${idx}`}
                        className="border-b border-slate-100 dark:border-slate-800/85 animate-pulse block md:table-row"
                      >
                        {isComparisonMode && (
                          <td
                            className={`${paddingClass} block md:table-cell text-center w-16`}
                          >
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded mx-auto w-4" />
                          </td>
                        )}
                        <td className={`${paddingClass} block md:table-cell`}>
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-16" />
                        </td>
                        <td className={`${paddingClass} block md:table-cell`}>
                          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
                        </td>
                        <td className={`${paddingClass} block md:table-cell`}>
                          <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" />
                          </div>
                        </td>
                        <td className={`${paddingClass} block md:table-cell`}>
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
                        </td>
                        <td className={`${paddingClass} block md:table-cell`}>
                          <div className="h-4 bg-slate-202 dark:bg-slate-800 rounded w-16" />
                        </td>
                        <td className={`${paddingClass} block md:table-cell`}>
                          <div className="space-y-2">
                            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
                            <div className="h-3 bg-slate-150 dark:bg-slate-800/60 rounded w-2/3" />
                          </div>
                        </td>
                        <td className={`${paddingClass} block md:table-cell`}>
                          <div className="flex items-center md:justify-end space-x-2">
                            <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                            <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                            <div className="w-7 h-7 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : sortedLogs.length === 0 ? (
                  <tr className="block md:table-row">
                    <td
                      colSpan={isComparisonMode ? 8 : 7}
                      className="text-center py-12 text-slate-400 italic block md:table-cell"
                    >
                      Không tìm thấy bản ghi nhật ký phù hợp trong khoảng lọc.
                    </td>
                  </tr>
                ) : (
                  sortedLogs.map((log) => {
                    const paddingClass = getDensityPadding();
                    const isSelected = selectedRow?.id === log.id;
                    const isCompareSelected = selectedCompareIds.includes(
                      log.id,
                    );

                    return (
                      <tr
                        key={log.id}
                        className={`border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/60 dark:hover:bg-[#162031] transition-all duration-200 hover:scale-[1.008] hover:shadow-md hover:shadow-slate-200/50 dark:hover:shadow-black/30 hover:z-10 relative block md:table-row cursor-pointer ${
                          isComparisonMode && isCompareSelected
                            ? "bg-violet-500/10 dark:bg-violet-500/5 border-l-4 border-l-violet-500"
                            : isSelected
                              ? "bg-sky-50/30 dark:bg-sky-950/10"
                              : ""
                        }`}
                        onClick={() => {
                          if (isComparisonMode) {
                            if (isCompareSelected) {
                              setSelectedCompareIds(
                                selectedCompareIds.filter(
                                  (id) => id !== log.id,
                                ),
                              );
                            } else {
                              if (selectedCompareIds.length < 3) {
                                setSelectedCompareIds([
                                  ...selectedCompareIds,
                                  log.id,
                                ]);
                              }
                            }
                          } else {
                            setSelectedRow(isSelected ? null : log);
                          }
                        }}
                      >
                        {isComparisonMode && (
                          <td
                            className={`${paddingClass} text-center block md:table-cell`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={isCompareSelected}
                                disabled={
                                  !isCompareSelected &&
                                  selectedCompareIds.length >= 3
                                }
                                onChange={() => {
                                  if (isCompareSelected) {
                                    setSelectedCompareIds(
                                      selectedCompareIds.filter(
                                        (id) => id !== log.id,
                                      ),
                                    );
                                  } else {
                                    if (selectedCompareIds.length < 3) {
                                      setSelectedCompareIds([
                                        ...selectedCompareIds,
                                        log.id,
                                      ]);
                                    }
                                  }
                                }}
                                className="w-4 h-4 text-violet-650 bg-white border-slate-300 rounded focus:ring-violet-553 dark:border-slate-705 dark:bg-[#111827] cursor-pointer"
                              />
                            </div>
                          </td>
                        )}
                        {/* Date */}
                        <td
                          className={`${paddingClass} font-semibold text-slate-700 dark:text-slate-350 block md:table-cell`}
                        >
                          {toDisplayDate(log.date)}
                        </td>

                        {/* Category */}
                        <td className={`${paddingClass} block md:table-cell`}>
                          <span
                            className={`px-2 py-0.5 text-[11px] rounded-full font-bold border ${getCategoryColor(log.category)}`}
                          >
                            {log.category}
                          </span>
                        </td>

                        {/* Status inline toggle */}
                        <td
                          className={`${paddingClass} block md:table-cell`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center space-x-2">
                            {/* Status Checkbox toggle */}
                            <button
                              onClick={() =>
                                onUpdateStatus(
                                  log.id,
                                  log.status === "Hoàn thành"
                                    ? "Đang thực hiện"
                                    : "Hoàn thành",
                                )
                              }
                              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                log.status === "Hoàn thành"
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-slate-300 dark:border-slate-700 hover:border-slate-450 text-transparent"
                              }`}
                              title={
                                log.status === "Hoàn thành"
                                  ? "Huỷ hoàn thành"
                                  : "Hoàn thành nhiệm vụ"
                              }
                            >
                              <Check className="w-3 h-3 stroke-[3]" />
                            </button>
                            <span
                              className={`px-2 py-0 rounded text-[10px] font-bold border ${getStatusBadge(log.status)}`}
                            >
                              {log.status}
                            </span>
                          </div>
                        </td>

                        {/* Priority */}
                        <td className={`${paddingClass} block md:table-cell`}>
                          <span
                            className={`px-2 py-0 rounded text-[10px] font-bold border ${getPriorityBadge(log.priority)}`}
                          >
                            {log.priority}
                          </span>
                        </td>

                        {/* Due Date */}
                        <td
                          className={`${paddingClass} block md:table-cell font-semibold text-slate-500 dark:text-slate-400`}
                        >
                          {log.dueDate ? (
                            toDisplayDate(log.dueDate)
                          ) : (
                            <span className="text-slate-350 dark:text-slate-700">
                              -
                            </span>
                          )}
                        </td>

                        {/* Content text preview & photo attachments gallery */}
                        <td
                          className={`${paddingClass} block md:table-cell transition-all duration-300 ${isContentCollapsed ? "max-w-[285px]" : "max-w-md md:max-w-xl"}`}
                        >
                          <div className="flex flex-col space-y-1.5 max-w-full">
                            <div className="flex items-start justify-between gap-1.5 w-full">
                              <p
                                className={`text-slate-800 dark:text-slate-350 font-semibold leading-relaxed text-xs ${
                                  isContentCollapsed
                                    ? "truncate block max-w-full"
                                    : "whitespace-pre-wrap break-words block w-full"
                                } ${
                                  log.status === "Hoàn thành"
                                    ? "line-through text-slate-400 dark:text-slate-500 font-normal"
                                    : ""
                                }`}
                              >
                                {log.content}
                              </p>
                              {log.attachments &&
                                log.attachments.filter(
                                  (a) => !a.startsWith("data:image/"),
                                ).length > 0 && (
                                  <Paperclip
                                    className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5"
                                    title={`${log.attachments.filter((a) => !a.startsWith("data:image/")).length} tài liệu minh chứng`}
                                  />
                                )}
                            </div>

                            {/* Beautiful Visual Progress Bar indicator */}
                            {(() => {
                              const percent = getProgressPercentage(log);
                              return (
                                <div
                                  className="flex items-center space-x-2 mt-1 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="w-16 sm:w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        percent === 100
                                          ? "bg-emerald-500"
                                          : percent >= 75
                                            ? "bg-teal-500"
                                            : percent >= 45
                                              ? "bg-sky-500"
                                              : percent >= 20
                                                ? "bg-amber-500"
                                                : "bg-rose-500"
                                      }`}
                                      style={{ width: `${percent}%` }}
                                    />
                                  </div>
                                  <span
                                    className={`text-[10px] font-bold tracking-tight inline-block shrink-0 ${
                                      percent === 100
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : percent >= 75
                                          ? "text-teal-600 dark:text-teal-400"
                                          : percent >= 45
                                            ? "text-sky-650 dark:text-sky-400"
                                            : "text-slate-500 dark:text-slate-400"
                                    }`}
                                  >
                                    Tiến độ: {percent}%
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Mini Gallery row of captured image attachments */}
                            {log.attachments &&
                              log.attachments.filter((a) =>
                                a.startsWith("data:image/"),
                              ).length > 0 && (
                                <div
                                  className="flex flex-wrap gap-1 mt-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {log.attachments
                                    .filter((a) => a.startsWith("data:image/"))
                                    .map((img, i) => (
                                      <div
                                        key={i}
                                        className="relative w-8 h-8 rounded-md border border-slate-205 dark:border-slate-800 bg-slate-100 overflow-hidden cursor-zoom-in hover:scale-110 hover:shadow-md transition-transform duration-150 shrink-0"
                                      >
                                        <img
                                          src={img}
                                          alt="Mini clip"
                                          className="w-full h-full object-cover"
                                          onClick={() => setFullImage(img)}
                                        />
                                      </div>
                                    ))}
                                </div>
                              )}
                          </div>
                        </td>

                        {/* Actions button */}
                        <td
                          className={`${paddingClass} block md:table-cell text-right`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end space-x-1.5">
                            <button
                              onClick={() => onSelectEdit(log)}
                              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-all cursor-pointer"
                              title="Sửa bản ghi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDuplicateLog(log)}
                              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer"
                              title="Nhân bản / sao chép nhanh"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteLog(log.id)}
                              className="p-1 rounded-lg text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all cursor-pointer"
                              title="Xóa vĩnh viễn"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-transparent">
            {sortedLogs.length === 0 ? (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center py-10 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl">
                <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">
                  Không tìm thấy hoặc không có nhật ký báo cáo công việc nào
                </p>
                <p className="text-xs text-slate-400 font-normal mt-1 block">
                  Hãy xoá bớt một số điều kiện bộ lọc để xem đầy đủ
                </p>
              </div>
            ) : (
              sortedLogs.map((log) => {
                const isCompleted = log.status === "Hoàn thành";
                return (
                  <div
                    key={`card-${log.id}`}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm relative group flex flex-col space-y-3"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div>
                        <div className="flex items-center space-x-2 mb-1.5">
                          <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
                            ID: {log.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase select-none ${getCategoryColor(log.category)}`}
                          >
                            {log.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm line-clamp-2">
                          {log.content}
                        </h4>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap select-none border border-current bg-opacity-10 dark:bg-opacity-20 ${getPriorityBadge(log.priority)}`}
                      >
                        {log.priority}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-md font-bold whitespace-nowrap select-none border ${getStatusBadge(log.status)}`}
                      >
                        {log.status === "Hoàn thành" ? (
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                        ) : log.status === "Chờ phối hợp" ? (
                          <Clock className="w-3 h-3 mr-1" />
                        ) : null}
                        {log.status}
                      </span>
                      <span className="flex items-center text-slate-500 font-medium ml-auto">
                        <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                        {toDisplayDate(log.date)}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 italic overflow-hidden">
                      <strong>Kết quả:</strong>{" "}
                      {log.resultText || "Đang chờ cập nhật kết quả"}
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRow(log);
                          }}
                          className="p-1.5 text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-lg transition-colors border border-sky-100 dark:border-sky-900/40"
                          title="Xem chi tiết thẻ báo cáo"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEdit(log);
                          }}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors border border-amber-100 dark:border-amber-900/40"
                          title="Sửa nhật ký"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(
                              log.id,
                              isCompleted ? "Đang thực hiện" : "Hoàn thành",
                            );
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border flex items-center space-x-1.5 transition-all w-24 justify-center ${
                            isCompleted
                              ? "bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-700 border-slate-200 dark:border-slate-700"
                              : "bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900"
                          }`}
                        >
                          {isCompleted ? "Mở lại việc" : "Hoàn thành"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </motion.div>

      {/* Accordion Row Drawer Preview Details */}
      <AnimatePresence>
        {selectedRow && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-sky-50/20 dark:bg-sky-950/5 border border-sky-100 dark:border-sky-900/40 p-6 rounded-2xl shadow-sm relative overflow-hidden"
          >
            <button
              onClick={() => setSelectedRow(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2 mb-3 gap-2">
              <div className="flex items-center space-x-2">
                <FileText className="w-4.5 h-4.5 text-sky-500" />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider">
                  Chi tiết công tác ID #{selectedRow.id}
                </h4>
              </div>

              {/* Detailed progress indicator inside slide-out Drawer */}
              {(() => {
                const percent = getProgressPercentage(selectedRow);
                return (
                  <div className="flex items-center space-x-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1 rounded-full shadow-xs">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                      Mức độ hoàn thành:
                    </span>
                    <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent === 100
                            ? "bg-emerald-500"
                            : percent >= 75
                              ? "bg-teal-500"
                              : percent >= 45
                                ? "bg-sky-500"
                                : percent >= 20
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-black ${
                        percent === 100
                          ? "text-emerald-500"
                          : percent >= 75
                            ? "text-teal-500"
                            : percent >= 45
                              ? "text-sky-500"
                              : "text-amber-500"
                      }`}
                    >
                      {percent}%
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs mb-3">
              <div>
                <span className="font-bold text-slate-400 block mb-1">
                  Mục tiêu chỉ tiêu đề ra:
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed">
                  {selectedRow.plannedProgress ||
                    "(Không thiết lập chỉ tiêu trong kỳ)"}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-1">
                  Kết quả thu hoạch:
                </span>
                <p className="text-slate-700 dark:text-slate-350 font-bold whitespace-pre-wrap leading-relaxed text-sky-700 dark:text-sky-400">
                  {selectedRow.resultText || "(Chưa thu hoạch kết quả thực tế)"}
                </p>
              </div>
              <div>
                <span className="font-bold text-slate-400 block mb-1">
                  Kế hoạch kỳ tiếp theo:
                </span>
                <p className="text-slate-700 dark:text-slate-300 font-medium whitespace-pre-wrap leading-relaxed text-indigo-700 dark:text-indigo-400">
                  {selectedRow.nextPlan || "(Chưa có phương án cụ thể)"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 text-xs">
              <div>
                <span className="font-bold text-slate-400 block mb-1">
                  Ghi chú nội bộ:
                </span>
                <p className="text-slate-600 dark:text-slate-400 italic">
                  {selectedRow.notes || "Không ghi chú"}
                </p>
              </div>

              {selectedRow.attachments &&
                selectedRow.attachments.length > 0 && (
                  <div className="space-y-3">
                    {/* Regular text files list */}
                    {selectedRow.attachments.filter(
                      (att) => !att.startsWith("data:image/"),
                    ).length > 0 && (
                      <div>
                        <span className="font-bold text-slate-400 block mb-1">
                          Tài liệu đính kèm:
                        </span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedRow.attachments
                            .filter((att) => !att.startsWith("data:image/"))
                            .map((att, i) => (
                              <span
                                key={i}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded text-[10px] text-slate-600 dark:text-slate-400 font-semibold shadow-xs"
                              >
                                {att}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Photo evidence gallery list */}
                    {selectedRow.attachments.filter((att) =>
                      att.startsWith("data:image/"),
                    ).length > 0 && (
                      <div>
                        <span className="font-bold text-slate-400 block mb-1">
                          Ảnh thực tế công việc (Camera minh chứng):
                        </span>
                        <div className="flex flex-wrap gap-2 mt-1.5 animate-fade-in">
                          {selectedRow.attachments
                            .filter((att) => att.startsWith("data:image/"))
                            .map((img, i) => (
                              <div
                                key={i}
                                className="relative w-12 h-12 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 overflow-hidden cursor-zoom-in hover:scale-105 transition-all duration-205 shadow-xs shrink-0"
                                onClick={() => setFullImage(img)}
                                title="Bấm để phóng to xem rõ ảnh"
                              >
                                <img
                                  src={img}
                                  alt="Log Captured Evidence"
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for high-res photo zoom */}
      <AnimatePresence>
        {fullImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50"
            onClick={() => setFullImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-2"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setFullImage(null)}
                className="absolute top-4 right-4 bg-slate-950/60 hover:bg-slate-950/80 text-white p-2 rounded-full z-10 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="border-b border-slate-800 pb-3 p-3 flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-400 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-sky-505" />
                  <span>Chi tiết ảnh minh chứng thực tế công việc</span>
                </span>
              </div>
              <div className="flex justify-center bg-black rounded-lg overflow-hidden p-1 max-h-[70vh]">
                <img
                  src={fullImage}
                  alt="Evidence Zoomed"
                  className="max-h-[65vh] object-contain rounded-md"
                  referrerPolicy="no-referrer"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
