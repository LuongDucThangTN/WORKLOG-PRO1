import React, { useState } from "react";
import { WorkLog } from "../types";
import { toDisplayDate } from "../utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Plus, 
  Check, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  CheckCircle2,
  Sparkles,
  Flag,
  HelpCircle,
  Layers,
  CalendarDays,
  CalendarRange
} from "lucide-react";

interface CalendarTabProps {
  logs: WorkLog[];
  onAddLog: (logData: Partial<WorkLog>) => Promise<void>;
  onUpdateLogStatus: (id: string, status: "Hoàn thành" | "Đang thực hiện") => Promise<void>;
  onSelectLogForEdit: (log: WorkLog) => void;
  onQuickCreateLogOnDate?: (dateStr: string) => void;
}

export default function CalendarTab({
  logs,
  onAddLog,
  onUpdateLogStatus,
  onSelectLogForEdit,
  onQuickCreateLogOnDate
}: CalendarTabProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split("T")[0]);
  
  // Custom states for view modes and filters
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // Quick task state options
  const [quickContent, setQuickContent] = useState("");
  const [quickCategory, setQuickCategory] = useState("Báo cáo tổng hợp");
  const [quickPriority, setQuickPriority] = useState<"Thấp" | "Trung bình" | "Cao" | "Khẩn">("Trung bình");
  const [isDeadline, setIsDeadline] = useState<boolean>(false);
  
  // Agenda search string
  const [agendaSearch, setAgendaSearch] = useState("");

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Month labels
  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  // Dynamic values of categories
  const categoriesList = ["all", ...Array.from(new Set(logs.map(log => log.category)))];

  // Boundaries calculation for Month Grid
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  
  // Starting day index (0 = Sun, 1 = Mon ... 6 = Sat)
  let startDayIndex = firstDayOfMonth.getDay(); 
  // Convert starting index to Monday as first column (0 = Mon, 1 = Tue ... 6 = Sun)
  startDayIndex = startDayIndex === 0 ? 6 : startDayIndex - 1;

  const totalDaysInMonth = lastDayOfMonth.getDate();

  // Create array of days representing the grid for MONTH VIEW
  const daysGrid: (Date | null)[] = [];
  for (let i = 0; i < startDayIndex; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    daysGrid.push(new Date(year, month, d));
  }

  // Calculate WEEK VIEW days based on the currently selected date
  const getWeekDays = (baseDateStr: string): Date[] => {
    const baseDate = new Date(baseDateStr);
    const dayOfWeek = baseDate.getDay(); // 0 = Sun, 1 = Mon ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(baseDate);
    monday.setDate(baseDate.getDate() + distanceToMonday);
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(monday);
      currentDay.setDate(monday.getDate() + i);
      weekDays.push(currentDay);
    }
    return weekDays;
  };

  const currentWeekDays = getWeekDays(selectedDateStr);

  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentDate(new Date(year, month - 1, 1));
    } else {
      setCurrentDate(new Date(year, month + 1, 1));
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    const baseDate = new Date(selectedDateStr);
    const offset = direction === "prev" ? -7 : 7;
    baseDate.setDate(baseDate.getDate() + offset);
    const finalDateStr = baseDate.toISOString().split("T")[0];
    setSelectedDateStr(finalDateStr);
    setCurrentDate(new Date(baseDate.getFullYear(), baseDate.getMonth(), 1));
  };

  const navigateToToday = () => {
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateStr(today.toISOString().split("T")[0]);
  };

  // Safe checks if a log meets current status and category filters
  const matchesFilters = (log: WorkLog) => {
    if (categoryFilter !== "all" && log.category !== categoryFilter) {
      return false;
    }
    if (statusFilter === "pending" && log.status === "Hoàn thành") {
      return false;
    }
    if (statusFilter === "done" && log.status !== "Hoàn thành") {
      return false;
    }
    return true;
  };

  // Group logs by date for visual cues on calendar cells, respecting filters
  const logsCountByDate: Record<string, { total: number; done: number; pending: number; filteredTotal: number }> = {};
  
  logs.forEach(log => {
    const dStr = log.date;
    const isLogMatched = matchesFilters(log);

    if (!logsCountByDate[dStr]) {
      logsCountByDate[dStr] = { total: 0, done: 0, pending: 0, filteredTotal: 0 };
    }
    logsCountByDate[dStr].total += 1;
    if (isLogMatched) {
      logsCountByDate[dStr].filteredTotal += 1;
    }
    if (log.status === "Hoàn thành") {
      logsCountByDate[dStr].done += 1;
    } else {
      logsCountByDate[dStr].pending += 1;
    }

    // Include due dates as part of count
    if (log.dueDate && log.status !== "Hoàn thành") {
      const dueStr = log.dueDate;
      if (!logsCountByDate[dueStr]) {
        logsCountByDate[dueStr] = { total: 0, done: 0, pending: 0, filteredTotal: 0 };
      }
      // Increment pending count specifically under due tasks
    }
  });

  // Filter logs for selected day
  const selectedDayLogsFiltered = logs.filter(log => {
    const isOnDay = log.date === selectedDateStr;
    const matchesSearch = agendaSearch.trim() === "" || 
      log.content.toLowerCase().includes(agendaSearch.toLowerCase()) ||
      log.category.toLowerCase().includes(agendaSearch.toLowerCase());
    return isOnDay && matchesFilters(log) && matchesSearch;
  });

  const selectedDayDueLogsFiltered = logs.filter(log => {
    const isDueOnDay = log.dueDate === selectedDateStr && log.status !== "Hoàn thành";
    const matchesSearch = agendaSearch.trim() === "" || 
      log.content.toLowerCase().includes(agendaSearch.toLowerCase()) ||
      log.category.toLowerCase().includes(agendaSearch.toLowerCase());
    return isDueOnDay && matchesFilters(log) && matchesSearch;
  });

  // Calculate day metrics
  const totalDayLogs = logs.filter(l => l.date === selectedDateStr).length;
  const completedDayLogs = logs.filter(l => l.date === selectedDateStr && l.status === "Hoàn thành").length;
  const completionRate = totalDayLogs > 0 ? Math.round((completedDayLogs / totalDayLogs) * 100) : 0;

  // Handle quick inline creation on selected date
  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickContent.trim()) return;

    await onAddLog({
      date: selectedDateStr,
      content: quickContent,
      category: quickCategory,
      priority: quickPriority,
      status: "Đang thực hiện",
      dueDate: isDeadline ? selectedDateStr : ""
    });
    setQuickContent("");
  };

  const weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const weekdaysFull = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"];

  return (
    <div className="space-y-6">
      
      {/* Dynamic Filter Controls Section */}
      <div className="bg-white dark:bg-[#111827] px-5 py-4 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-sky-50 dark:bg-sky-950/40 rounded-lg text-sky-500">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Bộ lọc hiển thị lịch</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Xem phân phối công tác theo trạng thái và nhóm hoạt động</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Segmented Control */}
          <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                statusFilter === "pending"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Chưa xong
            </button>
            <button
              onClick={() => setStatusFilter("done")}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                statusFilter === "done"
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Hoàn thành
            </button>
          </div>

          {/* Category Dropdown Selection */}
          <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-700 dark:text-slate-300 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Mọi nhóm danh mục</option>
              {categoriesList.filter(c => c !== "all").map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Calendar Grid Section */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex flex-col">
          
          {/* Calendar Nav Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4 gap-3">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="w-5.5 h-5.5 text-sky-500 shrink-0" />
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg leading-tight">
                  {viewMode === "month" ? `${monthNames[month]} ${year}` : `Tuần hiện tại`}
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold mt-0.5">
                  {viewMode === "month" ? "Chế độ xem lịch tháng" : "Chế độ xem lịch tuần chi tiết"}
                  <span className="text-sky-500 dark:text-sky-400 normal-case ml-2 font-bold">• Nhấp đúp chuột (Double-click) để tạo mới công việc nhanh</span>
                </p>
              </div>
            </div>

            {/* View switcher and Nav buttons */}
            <div className="flex items-center space-x-3.5 self-end sm:self-auto">
              {/* Segmented View Mode Switcher */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200/55 dark:border-slate-800/80 shadow-inner">
                <button
                  onClick={() => setViewMode("month")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer text-xs ${
                    viewMode === "month"
                      ? "bg-white dark:bg-slate-800 text-sky-500 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                  }`}
                  title="Lịch theo tháng"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="inline-block">Tháng</span>
                </button>
                <button
                  onClick={() => setViewMode("week")}
                  className={`px-3 py-1.5 rounded-md transition-all flex items-center space-x-1.5 cursor-pointer text-xs ${
                    viewMode === "week"
                      ? "bg-white dark:bg-slate-800 text-sky-500 shadow-sm font-bold"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                  }`}
                  title="Lịch theo tuần"
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span className="inline-block">Tuần</span>
                </button>
              </div>

              {/* Prev/Next Navigation Controls */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => viewMode === "month" ? navigateMonth("prev") : navigateWeek("prev")}
                  className="p-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                  title={viewMode === "month" ? "Tháng trước" : "Tuần trước"}
                >
                  <ChevronLeft className="w-5.5 h-5.5" />
                </button>
                
                <button
                  onClick={navigateToToday}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-450 border border-sky-100 dark:border-sky-900/50 cursor-pointer"
                >
                  Hôm nay
                </button>

                <button
                  onClick={() => viewMode === "month" ? navigateMonth("next") : navigateWeek("next")}
                  className="p-1 px-1.5 rounded-lg border border-slate-200 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-pointer"
                  title={viewMode === "month" ? "Tháng sau" : "Tuần sau"}
                >
                  <ChevronRight className="w-5.5 h-5.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 7 Columns Day Names Header */}
          <div className="grid grid-cols-7 text-center font-bold text-xs text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-100 dark:border-slate-900 pb-1.5">
            {weekdays.map((day, idx) => {
              const isSunday = idx === 6;
              const isSaturday = idx === 5;
              return (
                <div 
                  key={idx} 
                  className={`py-1 ${
                    isSunday 
                      ? "text-rose-500/90 font-black dark:text-rose-400" 
                      : isSaturday 
                      ? "text-sky-605 font-extrabold dark:text-sky-400" 
                      : ""
                  }`}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* MONTH VIEW CALENDAR GRID */}
          {viewMode === "month" && (
            <div className="grid grid-cols-7 gap-2 flex-1 min-h-[400px]">
              {daysGrid.map((day, idx) => {
                if (day === null) {
                  return (
                    <div 
                      key={`empty-${idx}`} 
                      className="bg-slate-50/30 dark:bg-slate-950/5 rounded-xl border border-transparent"
                    />
                  );
                }

                const dayStr = day.toISOString().split("T")[0];
                const isSelected = selectedDateStr === dayStr;
                const isToday = new Date().toISOString().split("T")[0] === dayStr;
                const isSunday = day.getDay() === 0;
                const isSaturday = day.getDay() === 6;
                
                const counts = logsCountByDate[dayStr] || { total: 0, done: 0, pending: 0, filteredTotal: 0 };
                const dayLogs = logs.filter(l => l.date === dayStr);
                const isAllCompleted = counts.total > 0 && counts.done === counts.total;
                
                return (
                  <button
                    key={dayStr}
                    onClick={() => setSelectedDateStr(dayStr)}
                    onDoubleClick={() => {
                      if (onQuickCreateLogOnDate) {
                        onQuickCreateLogOnDate(dayStr);
                      }
                    }}
                    title="Nhấp đúp chuột để tạo nhanh công việc cho ngày này"
                    className={`p-2 rounded-xl border flex flex-col justify-between text-left h-[72px] transition-all relative cursor-pointer hover:shadow-md hover:scale-[1.03] group ${
                      isSelected 
                        ? "bg-sky-50/50 dark:bg-sky-950/20 border-sky-400 dark:border-sky-600 shadow-sky-100/50 dark:shadow-none ring-2 ring-sky-400/20" 
                        : isToday 
                        ? "bg-indigo-50/20 dark:bg-slate-900 border-indigo-300 dark:border-slate-700 shadow-slate-200/50 dark:shadow-none" 
                        : isSunday
                        ? "bg-rose-50/10 dark:bg-rose-950/5 border-slate-100 dark:border-slate-900"
                        : "bg-white dark:bg-[#111827] border-slate-150 dark:border-slate-800/80 hover:border-slate-350 dark:hover:border-slate-600"
                    }`}
                  >
                    {/* Day number & today marker */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded-md leading-none ${
                        isSelected 
                          ? "bg-sky-500 text-white" 
                          : isToday 
                          ? "bg-indigo-500 text-white" 
                          : isSunday
                          ? "text-rose-500 dark:text-rose-400"
                          : isSaturday
                          ? "text-sky-500 dark:text-sky-400"
                          : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {day.getDate()}
                      </span>
                      
                      {/* Fully complete status banner */}
                      {isAllCompleted && (
                        <div className="w-3.5 h-3.5 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center border border-emerald-300 dark:border-emerald-800 shrink-0">
                          <Check className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    {/* Task performance indicators inside month cells */}
                    <div className="w-full mt-2 space-y-1">
                      {counts.filteredTotal > 0 ? (
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-1 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full block ${isAllCompleted ? "bg-emerald-500" : "bg-sky-500"}`}></span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 scale-90 origin-left truncate font-medium">
                              {counts.filteredTotal} việc
                            </span>
                          </div>
                          
                          {counts.pending > 0 && (
                            <div className="flex items-center space-x-0.5 text-amber-500 shrink-0">
                              <span className="text-[8px] font-black">{counts.pending}</span>
                              <Clock className="w-2.5 h-2.5 ml-0.5 stroke-[2.5]" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-2 w-full"></div>
                      )}
                      
                      {/* Interactive Progress Ribbon under the cells */}
                      {counts.total > 0 && (
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isAllCompleted ? "bg-emerald-500" : "bg-sky-550"}`}
                            style={{ width: `${Math.round((counts.done / counts.total) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* WEEK VIEW CALENDAR GRID - ENTERPRISE QUALITY */}
          {viewMode === "week" && (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3.5 flex-1 min-h-[400px]">
              {currentWeekDays.map((day, idx) => {
                const dayStr = day.toISOString().split("T")[0];
                const isSelected = selectedDateStr === dayStr;
                const isToday = new Date().toISOString().split("T")[0] === dayStr;
                const isSunday = day.getDay() === 0;
                const isSaturday = day.getDay() === 6;
                
                const counts = logsCountByDate[dayStr] || { total: 0, done: 0, pending: 0, filteredTotal: 0 };
                const dayFilteredLogs = logs.filter(l => l.date === dayStr && matchesFilters(l));
                const isAllCompleted = counts.total > 0 && counts.done === counts.total;

                return (
                  <div
                    key={dayStr}
                    onClick={() => setSelectedDateStr(dayStr)}
                    onDoubleClick={() => {
                      if (onQuickCreateLogOnDate) {
                        onQuickCreateLogOnDate(dayStr);
                      }
                    }}
                    title="Nhấp đúp chuột để tạo nhanh công việc cho ngày này"
                    className={`p-3 rounded-xl border flex flex-col text-left h-auto min-h-[380px] transition-all relative cursor-pointer hover:shadow-lg ${
                      isSelected 
                        ? "bg-sky-50/20 dark:bg-sky-950/15 border-sky-400 dark:ring-1 dark:ring-sky-700 shadow-md shadow-slate-100 dark:shadow-none" 
                        : isToday 
                        ? "bg-slate-50/50 dark:bg-slate-900 border-indigo-400 shadow-xs" 
                        : isSunday
                        ? "bg-rose-50/10 dark:bg-rose-950/5 border-slate-150 dark:border-slate-900"
                        : "bg-white dark:bg-[#111827] border-slate-150 dark:border-slate-855 hover:border-slate-350 dark:hover:border-slate-600"
                    }`}
                  >
                    {/* Header of Column Day */}
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-2 w-full">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest uppercase">
                          {weekdaysFull[idx]}
                        </span>
                        <span className={`text-base font-black ${
                          isToday 
                            ? "text-indigo-500 dark:text-indigo-400" 
                            : isSunday 
                            ? "text-rose-500" 
                            : "text-slate-800 dark:text-slate-200"
                        }`}>
                          {day.getDate()}/{day.getMonth() + 1}
                        </span>
                      </div>

                      {/* Header metrics */}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                        isAllCompleted 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                          : counts.total > 0
                          ? "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                          : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      }`}>
                        {counts.total} việc
                      </span>
                    </div>

                    {/* Progress Bar Ribbon on Column */}
                    {counts.total > 0 && (
                      <div className="mb-2">
                        <div className="flex justify-between items-center text-[8.5px] text-slate-400 dark:text-slate-500 font-bold mb-1">
                          <span>Xử lý</span>
                          <span>{counts.done}/{counts.total}</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${isAllCompleted ? "bg-emerald-500" : "bg-sky-500"}`}
                            style={{ width: `${Math.round((counts.done / counts.total) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tasks list preview непосредственно в ячейке недели */}
                    <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[290px] pr-0.5">
                      {dayFilteredLogs.length === 0 ? (
                        <p className="text-[10px] text-slate-400 italic text-center py-6">Không có việc</p>
                      ) : (
                        dayFilteredLogs.map(log => (
                          <div 
                            key={log.id}
                            className={`p-1.5 rounded-lg border text-[10px] transition-all flex flex-col space-y-0.5 ${
                              log.status === "Hoàn thành"
                                ? "bg-slate-50 dark:bg-slate-900/60 border-slate-100 text-slate-400 line-through"
                                : "bg-white dark:bg-slate-850 hover:border-slate-305 hover:bg-slate-50 border-slate-200 text-slate-700 dark:text-slate-350"
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectLogForEdit(log);
                            }}
                          >
                            <span className="font-extrabold uppercase tracking-tight text-[8px] text-sky-500 truncate leading-none">
                              {log.category}
                            </span>
                            <span className="font-medium truncate block leading-tight">
                              {log.content}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Day Agenda Sidebar */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex-1 flex flex-col justify-between min-h-[580px]">
            <div>
              {/* Sidebar Header with compact Date info */}
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-sky-500 block mb-0.5">Tiến độ ngày chọn</span>
                <h4 className="font-black text-slate-800 dark:text-slate-200 text-base leading-tight">
                  {toDisplayDate(selectedDateStr)}
                </h4>
              </div>

              {/* Graphical Circular/Bar performance metric of selected day */}
              {totalDayLogs > 0 && (
                <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-2.5 rounded-xl mb-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-550 block">Hiệu suất hoàn thành</span>
                    <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                      Đạt {completedDayLogs} / {totalDayLogs} đầu việc ({completionRate}%)
                    </span>
                  </div>
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${completionRate === 100 ? 'bg-emerald-500' : 'bg-sky-500'}`}
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Agenda search bar */}
              <div className="relative mb-3.5">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm việc trong ngày..."
                  value={agendaSearch}
                  onChange={(e) => setAgendaSearch(e.target.value)}
                  className="w-full text-xs bg-slate-50 hover:bg-slate-100/40 dark:bg-slate-900 dark:hover:bg-slate-900/80 border border-slate-200 dark:border-slate-800/80 pl-9 pr-3 py-2 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 transition-all"
                />
              </div>

              {/* List agenda items */}
              <div className="space-y-3 overflow-y-auto max-h-[240px] pr-1">
                
                {/* Due tasks listed first */}
                {selectedDayDueLogsFiltered.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block mb-1">
                      ⚠️ Tác vụ đến hạn hôm nay ({selectedDayDueLogsFiltered.length})
                    </span>
                    {selectedDayDueLogsFiltered.map(log => (
                      <div key={`due-${log.id}`} className="p-3 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 rounded-xl text-xs flex justify-between items-start transition-all hover:border-amber-450">
                        <div className="space-y-1 flex-1 min-w-0 mr-2">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-extrabold text-[9px] uppercase text-amber-600 dark:text-amber-400 block truncate">{log.category}</span>
                            <span className="inline-block w-1 h-1 rounded-full bg-amber-300"></span>
                            <span className="text-[8.5px] font-bold text-amber-500">Độ ưu tiên: {log.priority}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{log.content}</p>
                        </div>
                        <button 
                          onClick={() => onUpdateLogStatus(log.id, "Hoàn thành")}
                          className="bg-amber-100 hover:bg-amber-150 dark:bg-amber-900/40 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-250 p-1 rounded-md transition-colors cursor-pointer shrink-0"
                          title="Đánh dấu hoàn thành ngay"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Normal diary entries lists */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                    📝 Nhật ký trong ngày ({selectedDayLogsFiltered.length})
                  </span>
                  
                  {selectedDayLogsFiltered.length === 0 && selectedDayDueLogsFiltered.length === 0 && (
                    <div className="text-center py-8 bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                      <HelpCircle className="w-8 h-8 text-slate-300 dark:text-slate-650 mx-auto mb-2" />
                      <p className="text-[11px] text-slate-400 italic">
                        Không tìm thấy sự kiện nào khớp hoặc chưa khởi tạo nhiệm vụ.
                      </p>
                    </div>
                  )}

                  {selectedDayLogsFiltered.map(log => {
                    const isDone = log.status === "Hoàn thành";
                    return (
                      <div 
                        key={log.id} 
                        className="p-3 bg-slate-50 dark:bg-slate-900/40 hover:bg-sky-50/40 dark:hover:bg-sky-950/10 border border-slate-100 dark:border-slate-800/60 rounded-xl transition-all hover:scale-[1.01] hover:border-slate-300"
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          {/* Toggle complete checkbox */}
                          <button
                            onClick={() => onUpdateLogStatus(log.id, isDone ? "Đang thực hiện" : "Hoàn thành")}
                            className={`mt-0.5 w-4.5 h-4.5 rounded-lg border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                              isDone
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-300 hover:border-sky-500 text-transparent"
                            }`}
                          >
                            <Check className="w-3.2 h-3.2 stroke-[3.5]" />
                          </button>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className={`text-[9px] uppercase font-black tracking-wider ${
                                isDone ? "text-emerald-500" : "text-sky-500"
                              }`}>
                                {log.category}
                              </span>
                              
                              <span className="text-[8.5px] font-bold text-slate-400 dark:text-slate-500">
                                ({log.priority})
                              </span>
                            </div>

                            <p 
                              onClick={() => onSelectLogForEdit(log)} 
                              className={`text-xs mt-0.5 leading-relaxed font-bold cursor-pointer hover:text-sky-600 dark:hover:text-sky-400 select-all ${
                                isDone 
                                  ? "line-through text-slate-400 dark:text-slate-500 font-normal" 
                                  : "text-slate-700 dark:text-slate-300"
                              }`}
                              title="Ấn để hiệu chỉnh hoặc xem chi tiết"
                            >
                              {log.content}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick entry form at sidebar bottom */}
            <form onSubmit={handleQuickAdd} className="border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-2 bg-white dark:bg-[#111827]">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                ⚡ Tạo nhanh nhật ghi ngày này
              </span>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Gói nhanh tên công việc chi tiết..."
                  value={quickContent}
                  onChange={(e) => setQuickContent(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 transition-colors"
                />
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Category Option */}
                  <select
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-2 rounded-lg text-slate-600 dark:text-slate-400 focus:outline-hidden text-[11px] font-extrabold"
                  >
                    <option value="Báo cáo tổng hợp">Báo cáo</option>
                    <option value="Hội họp & Sự kiện">Hội họp</option>
                    <option value="Rà soát hồ sơ">Rà soát</option>
                    <option value="Nghiên cứu chuyên môn">Nghiên cứu</option>
                    <option value="Phối hợp tác nghiệp">Phối hợp</option>
                    <option value="Công tác văn phòng">Văn phòng</option>
                  </select>

                  {/* Priority Option */}
                  <select
                    value={quickPriority}
                    onChange={(e) => setQuickPriority(e.target.value as "Thấp" | "Trung bình" | "Cao" | "Khẩn")}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 py-1.5 px-2 rounded-lg text-slate-600 dark:text-slate-400 focus:outline-hidden text-[11px] font-extrabold"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Khẩn">Khẩn</option>
                  </select>
                </div>

                {/* Deadline state options and submission */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDeadline}
                      onChange={(e) => setIsDeadline(e.target.checked)}
                      className="w-3.5 h-3.5 rounded text-sky-500 border-slate-300 focus:ring-sky-500 focus:outline-hidden"
                    />
                    <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 select-none">
                      Đặt hạn chót hôm nay
                    </span>
                  </label>

                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span>Lưu nhanh</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
