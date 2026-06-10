import { FilterState } from "./types";

// Convert YYYY-MM-DD to DD/MM/YYYY
export function toDisplayDate(dateStr: string): string {
  if (!dateStr) return "Chưa thiết lập";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Get boundaries for period selections
export function getPeriodBounds(period: "today" | "week" | "month" | "quarter" | "year"): { start: string; end: string } {
  const today = new Date();
  const format = (d: Date) => d.toISOString().split("T")[0];

  if (period === "today") {
    const todayStr = format(today);
    return { start: todayStr, end: todayStr };
  }

  if (period === "week") {
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    const monday = new Date(today.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: format(monday), end: format(sunday) };
  }

  if (period === "month") {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: format(firstDay), end: format(lastDay) };
  }

  if (period === "quarter") {
    const currentQuarter = Math.floor(today.getMonth() / 3);
    const firstMonthOfQuarter = currentQuarter * 3;
    const firstDay = new Date(today.getFullYear(), firstMonthOfQuarter, 1);
    const lastDay = new Date(today.getFullYear(), firstMonthOfQuarter + 3, 0);
    return { start: format(firstDay), end: format(lastDay) };
  }

  if (period === "year") {
    const firstDay = new Date(today.getFullYear(), 0, 1);
    const lastDay = new Date(today.getFullYear(), 11, 31);
    return { start: format(firstDay), end: format(lastDay) };
  }

  return { start: "", end: "" };
}

// Generate simple mock logs if db starts completely empty (for immediate high quality feel)
export function getCategoryColor(category: string): string {
  switch (category) {
    case "Báo cáo tổng hợp": 
      return "bg-blue-100/40 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/60";
    case "Hội họp & Sự kiện": 
      return "bg-purple-100/40 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/60";
    case "Rà soát hồ sơ": 
      return "bg-amber-100/40 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200/50 dark:border-amber-800/60";
    case "Nghiên cứu chuyên môn": 
      return "bg-teal-100/40 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200/50 dark:border-teal-800/60";
    case "Phối hợp tác nghiệp": 
      return "bg-pink-100/40 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200/50 dark:border-pink-800/60";
    case "Tự đào tạo": 
      return "bg-indigo-100/40 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-800/60";
    case "Giải quyết sự vụ": 
      return "bg-rose-100/40 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200/50 dark:border-rose-800/60";
    case "Công tác văn phòng": 
      return "bg-slate-100/40 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/60";
    case "Hoạt động hỗ trợ khác": 
      return "bg-emerald-100/40 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/60";
    default: 
      return "bg-slate-100/40 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/60";
  }
}

export function getPriorityBadge(priority: string): string {
  switch (priority) {
    case "Khẩn": return "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-900";
    case "Cao": return "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900";
    case "Trung bình": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900";
    default: return "bg-slate-100 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  }
}

export function getStatusBadge(status: string): string {
  switch (status) {
    case "Hoàn thành": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900";
    case "Đang thực hiện": return "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300 border-sky-200 dark:border-sky-900";
    case "Chờ phối hợp": return "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-900";
    case "Tạm dừng": return "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-800/60 dark:text-gray-300 border-gray-200";
  }
}
