import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { WorkLog, Stats, CATEGORY_OPTIONS } from "../types";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  BookOpen,
  Calendar,
  LayoutDashboard,
  Printer,
  FileDown,
  GripVertical,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Tag,
  Timer,
  Plus,
  Minus,
  Info,
  Sparkles,
  Maximize2,
  Minimize2,
} from "lucide-react";
import PrintPreview from "./PrintPreview";

interface DashboardTabProps {
  logs: WorkLog[];
  stats: Stats;
  agencyName?: string;
  approverTitle?: string;
  agencyLogo?: string;
  isLoading?: boolean;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export default function DashboardTab({
  logs,
  stats,
  agencyName,
  approverTitle,
  agencyLogo = "",
  isLoading = false,
  isZenMode,
  onToggleZenMode,
}: DashboardTabProps) {
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Drag and drop layout items definitions
  const DEFAULT_KPI_CARDS = [
    {
      id: "total",
      label: "Tổng đầu việc",
      icon: "BookOpen",
      color: "bg-blue-50 dark:bg-blue-950/30 text-blue-500",
      rawKey: "totalEntries",
    },
    {
      id: "done",
      label: "Đã hoàn thành",
      icon: "CheckCircle2",
      color: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500",
      rawKey: "doneEntries",
    },
    {
      id: "carrying",
      label: "Đang thực hiện",
      icon: "Clock",
      color: "bg-sky-50 dark:bg-sky-950/30 text-sky-500",
      rawKey: "carryingEntries",
    },
    {
      id: "overdue",
      label: "Việc quá hạn",
      icon: "AlertTriangle",
      color: "bg-rose-50 dark:bg-rose-950/30 text-rose-500",
      rawKey: "overdueEntries",
    },
    {
      id: "dueSoon",
      label: "Hạn 7 ngày tới",
      icon: "Calendar",
      color: "bg-amber-50 dark:bg-amber-950/30 text-amber-500",
      rawKey: "dueSoonEntries",
    },
    {
      id: "highPriority",
      label: "Độ ưu tiên cao",
      icon: "Flame",
      color: "bg-red-50 dark:bg-red-950/30 text-red-500",
      rawKey: "highPriorityEntries",
    },
    {
      id: "hours",
      label: "Tổng giờ công ước tính",
      icon: "Timer",
      color: "bg-violet-50 dark:bg-violet-950/30 text-violet-500",
      rawKey: "estimatedHours",
    },
  ];

  const DEFAULT_WIDGET_SECTIONS = [
    { id: "statusPie", label: "Cơ cấu Trạng thái", colSpan: "lg:col-span-6" },
    {
      id: "categoryPie",
      label: "Tỷ lệ Phân bổ Nhóm việc",
      colSpan: "lg:col-span-6",
    },
    {
      id: "weeklyStats",
      label: "Hiệu suất Tuần (Hoàn thành vs Tồn đọng)",
      colSpan: "lg:col-span-12",
    },
    {
      id: "categoryBar",
      label: "Biểu đồ cột Nhóm việc",
      colSpan: "lg:col-span-12",
    },
    {
      id: "completionTrendLine",
      label: "Xu hướng Hoàn thành",
      colSpan: "lg:col-span-12",
    },
    {
      id: "timelineLine",
      label: "Tần suất hoạt động",
      colSpan: "lg:col-span-12",
    },
  ];

  const [kpiCards, setKpiCards] = useState(() => {
    const saved = localStorage.getItem("dashboard_kpi_order_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Verify if parsed array is up to date, otherwise migration logic to add "hours"
          const ids = parsed.map((k: any) => k.id);
          if (!ids.includes("hours")) {
            parsed.push({
              id: "hours",
              label: "Tổng giờ công ước tính",
              icon: "Timer",
              color: "bg-violet-50 dark:bg-violet-950/30 text-violet-500",
              rawKey: "estimatedHours",
            });
          }
          // Remove potential outdated ids
          return parsed.filter((k: any) =>
            DEFAULT_KPI_CARDS.some((d) => d.id === k.id),
          );
        }
      } catch (e) {}
    }
    return DEFAULT_KPI_CARDS;
  });

  const [fallbackHours, setFallbackHours] = useState(() => {
    const saved = localStorage.getItem("dashboard_fallback_hours");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            Khẩn: Number(parsed["Khẩn"] ?? 8),
            Cao: Number(parsed["Cao"] ?? 6),
            "Trung bình": Number(parsed["Trung bình"] ?? 4),
            Thấp: Number(parsed["Thấp"] ?? 2),
          };
        }
      } catch (e) {}
    }
    return { Khẩn: 8, Cao: 6, "Trung bình": 4, Thấp: 2 };
  });

  const [enableTextParsing, setEnableTextParsing] = useState(() => {
    const saved = localStorage.getItem("dashboard_enable_text_parsing");
    return saved !== "false";
  });

  const [plannedQuota, setPlannedQuota] = useState(() => {
    const saved = localStorage.getItem("dashboard_planned_hours_quota");
    return saved ? Number(saved) : 120;
  });

  const [configTab, setConfigTab] = useState<
    "categories" | "widgets" | "workHours"
  >("categories");

  const [hiddenKpiIds, setHiddenKpiIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("dashboard_hidden_kpis");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [hiddenWidgetIds, setHiddenWidgetIds] = useState<string[]>(() => {
    const saved = localStorage.getItem("dashboard_hidden_widgets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return [];
  });

  const [weeklyRange, setWeeklyRange] = useState<"all" | "4weeks">("4weeks");

  const [widgetSections, setWidgetSections] = useState(() => {
    const saved = localStorage.getItem("dashboard_widgets_order_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Automatic migration to add completionTrendLine for existing users
          const ids = parsed.map((w: any) => w.id);
          if (!ids.includes("completionTrendLine")) {
            parsed.push({
              id: "completionTrendLine",
              label: "Xu hướng Hoàn thành",
              colSpan: "lg:col-span-12",
            });
          }
          if (!ids.includes("weeklyStats")) {
            parsed.push({
              id: "weeklyStats",
              label: "Hiệu suất Tuần (Hoàn thành vs Tồn đọng)",
              colSpan: "lg:col-span-12",
            });
          }
          // Filter to only exist in standard sections
          return parsed.filter((w: any) =>
            DEFAULT_WIDGET_SECTIONS.some((d) => d.id === w.id),
          );
        }
      } catch (e) {}
    }
    return DEFAULT_WIDGET_SECTIONS;
  });

  const [draggedKpiId, setDraggedKpiId] = useState<string | null>(null);
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);

  // States for important categories customizable list
  const [importantCategories, setImportantCategories] = useState<string[]>(
    () => {
      const saved = localStorage.getItem("dashboard_important_categories_v2");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed;
          }
        } catch (e) {}
      }
      return [
        "Nghiệp vụ Hành chính",
        "Dự án & Triển khai",
        "Đào tạo & Phát triển",
        "Báo cáo tổng hợp",
      ];
    },
  );

  const [categoryMode, setCategoryMode] = useState<"group" | "filter" | "all">(
    () => {
      const saved = localStorage.getItem("dashboard_category_summary_mode_v2");
      if (saved === "group" || saved === "filter" || saved === "all") {
        return saved;
      }
      return "group";
    },
  );

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const resetLayout = () => {
    setKpiCards(DEFAULT_KPI_CARDS);
    setWidgetSections(DEFAULT_WIDGET_SECTIONS);
    setImportantCategories([
      "Nghiệp vụ Hành chính",
      "Dự án & Triển khai",
      "Đào tạo & Phát triển",
      "Báo cáo tổng hợp",
    ]);
    setCategoryMode("group");
    setFallbackHours({ Khẩn: 8, Cao: 6, "Trung bình": 4, Thấp: 2 });
    setEnableTextParsing(true);
    setPlannedQuota(120);
    setConfigTab("categories");
    setHiddenKpiIds([]);
    setHiddenWidgetIds([]);
    localStorage.removeItem("dashboard_kpi_order_v2");
    localStorage.removeItem("dashboard_widgets_order_v2");
    localStorage.removeItem("dashboard_important_categories_v2");
    localStorage.removeItem("dashboard_category_summary_mode_v2");
    localStorage.removeItem("dashboard_fallback_hours");
    localStorage.removeItem("dashboard_enable_text_parsing");
    localStorage.removeItem("dashboard_planned_hours_quota");
    localStorage.removeItem("dashboard_hidden_kpis");
    localStorage.removeItem("dashboard_hidden_widgets");
  };

  const handleKpiDragStart = (e: React.DragEvent, id: string) => {
    setDraggedKpiId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleKpiDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedKpiId === targetId) return;
    const draggedIdx = kpiCards.findIndex((k: any) => k.id === draggedKpiId);
    const targetIdx = kpiCards.findIndex((k: any) => k.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const updated = [...kpiCards];
    const [removed] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, removed);
    setKpiCards(updated);
    localStorage.setItem("dashboard_kpi_order_v2", JSON.stringify(updated));
  };

  const handleKpiDragEnd = () => {
    setDraggedKpiId(null);
  };

  const handleWidgetDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidgetId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleWidgetDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (draggedWidgetId === targetId) return;
    const draggedIdx = widgetSections.findIndex(
      (w: any) => w.id === draggedWidgetId,
    );
    const targetIdx = widgetSections.findIndex((w: any) => w.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) return;

    const updated = [...widgetSections];
    const [removed] = updated.splice(draggedIdx, 1);
    updated.splice(targetIdx, 0, removed);
    setWidgetSections(updated);
    localStorage.setItem("dashboard_widgets_order_v2", JSON.stringify(updated));
  };

  const handleWidgetDragEnd = () => {
    setDraggedWidgetId(null);
  };

  const getKpiIcon = (iconName: string) => {
    switch (iconName) {
      case "BookOpen":
        return <BookOpen className="w-5 h-5" />;
      case "CheckCircle2":
        return <CheckCircle2 className="w-5 h-5" />;
      case "Clock":
        return <Clock className="w-5 h-5" />;
      case "AlertTriangle":
        return <AlertTriangle className="w-5 h-5" />;
      case "Calendar":
        return <Calendar className="w-5 h-5" />;
      case "Flame":
        return <Flame className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const downloadWordReport = () => {
    const todayStr = new Date().toLocaleDateString("vi-VN");
    const titleName =
      agencyName || "HỆ THỐNG QUẢN LÝ NHẬT KÝ & BÁO CÁO CÔNG TÁC";
    const approverName = approverTitle || "Cán bộ điều hành";

    // Prepare Category Table rows representation
    const categoriesRows = Object.entries(stats.categoriesCount)
      .map(
        ([name, value]) => `
      <tr>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left;">${name}</td>
        <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${value} đầu việc</td>
      </tr>
    `,
      )
      .join("");

    // Prepare Status Table rows representation
    const statusRows = Object.entries(stats.statusCount)
      .map(([name, value]) => {
        let color = "#475569";
        if (name === "Hoàn thành") color = "#10b981";
        else if (name === "Đang thực hiện") color = "#0ea5e9";
        else if (name === "Chờ phối hợp") color = "#f59e0b";
        else if (name === "Tạm dừng") color = "#ef4444";
        return `
        <tr>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left;">
            <span style="color: ${color}; font-weight: bold;">●</span> ${name}
          </td>
          <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold;">${value} đầu việc</td>
        </tr>
      `;
      })
      .join("");

    // Prepare detailed logs table rows
    const logsRows = logs
      .map((log, index) => {
        let statusColor = "#444";
        let statusBg = "#f1f5f9";
        if (log.status === "Hoàn thành") {
          statusColor = "#15803d";
          statusBg = "#f0fdf4";
        } else if (log.status === "Đang thực hiện") {
          statusColor = "#0369a1";
          statusBg = "#f0f9ff";
        } else if (log.status === "Chờ phối hợp") {
          statusColor = "#b45309";
          statusBg = "#fffbeb";
        } else if (log.status === "Tạm dừng") {
          statusColor = "#b91c1c";
          statusBg = "#fef2f2";
        }

        return `
        <tr style="page-break-inside: avoid;">
          <td style="padding: 8px; border: 1px solid #475569; text-align: center; font-size: 10pt;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #475569; text-align: center; font-size: 10pt;">${log.date.split("-").reverse().join("/")}</td>
          <td style="padding: 8px; border: 1px solid #475569; font-size: 10pt;" class="${log.status === "Hoàn thành" ? "completed" : ""}">
            <div style="font-weight: bold; margin-bottom: 4px; color: #0f172a;">${log.content}</div>
            ${log.plannedProgress ? `<div style="font-size: 8.5pt; color: #475569;"><span style="font-weight: bold;">Chỉ tiêu:</span> ${log.plannedProgress}</div>` : ""}
            ${log.resultText ? `<div style="font-size: 8.5pt; color: #0284c7;"><span style="font-weight: bold; color: #475569;">Đạt được:</span> ${log.resultText}</div>` : ""}
            ${log.nextPlan ? `<div style="font-size: 8.5pt; color: #22c55e;"><span style="font-weight: bold; color: #475569;">Kế hoạch kế tiếp:</span> ${log.nextPlan}</div>` : ""}
            ${log.notes ? `<div style="font-size: 8.5pt; color: #64748b; font-style: italic;"><span style="font-weight: bold; color: #475569;">Ghi chú:</span> ${log.notes}</div>` : ""}
          </td>
          <td style="padding: 8px; border: 1px solid #475569; text-align: center; font-size: 9.5pt;">${log.category}</td>
          <td style="padding: 8px; border: 1px solid #475569; text-align: center; font-size: 9.5pt;">
            <span style="font-weight: ${log.priority === "Khẩn" || log.priority === "Cao" ? "bold" : "normal"}; color: ${log.priority === "Khẩn" ? "#ef4444" : log.priority === "Cao" ? "#f97316" : "#475569"}">
              ${log.priority}
            </span>
          </td>
          <td style="padding: 8px; border: 1px solid #475569; text-align: center; font-size: 9.5pt;">${log.dueDate ? log.dueDate.split("-").reverse().join("/") : "Chưa lập"}</td>
          <td style="padding: 8px; border: 1px solid #475569; text-align: center; font-size: 9.5pt;">
            <span style="background-color: ${statusBg}; color: ${statusColor}; padding: 3px 6px; border-radius: 4px; font-weight: bold; font-size: 8.5pt; border: 1px solid ${statusColor}40;">
              ${log.status}
            </span>
          </td>
        </tr>
      `;
      })
      .join("");

    const documentHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>Bao Cao Tien Do Cong Viec</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
            <w:DoNotOptimizeForBrowser/>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { 
            font-family: 'Times New Roman', Times, serif; 
            line-height: 1.5; 
            color: #000000; 
            margin: 1in; 
          }
          .title-agency {
            text-transform: uppercase;
            font-size: 11pt;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .title-date {
            font-size: 10.5pt;
            font-style: italic;
            color: #475569;
          }
          h1 {
            text-align: center;
            font-size: 16pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 30px;
            margin-bottom: 25px;
            color: #000000;
          }
          h2 {
            font-size: 13pt;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 25px;
            margin-bottom: 12px;
            border-bottom: 1.5pt solid #000000;
            padding-bottom: 4px;
            color: #000000;
          }
          h3 {
            font-size: 11.5pt;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 8px;
            color: #000000;
          }
          p {
            margin: 0 0 8px 0;
            font-size: 11pt;
          }
          .kpi-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .kpi-table td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            font-size: 10.5pt;
            width: 33.33%;
          }
          .stats-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .logs-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          .logs-table th {
            border: 1px solid #475569;
            background-color: #f1f5f9;
            padding: 8px;
            font-size: 10pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
          }
          .completed {
            text-decoration: line-through;
            color: #64748b;
          }
          .signature-section {
            margin-top: 40px;
            width: 100%;
          }
          .signature-section td {
            border: none;
            text-align: center;
            width: 50%;
            font-size: 11pt;
          }
        </style>
      </head>
      <body>
        <!-- Header Company and Date metadata -->
        <table style="width: 100%; border: none; margin-bottom: 20px;">
          <tr style="border: none;">
            <td style="border: none; width: 50%; text-align: left; vertical-align: top;">
              <div class="title-agency">${titleName}</div>
              <div style="font-size: 9.5pt; color: #475569;">Trình điều hành Phân tích & Giám sát Tiến độ</div>
            </td>
            <td style="border: none; width: 50%; text-align: right; vertical-align: top;">
              <div class="title-date">Ngày tạo: ${todayStr}</div>
              <div style="font-size: 9.5pt; color: #475569;">Danh mục xuất khẩu Word chính thống</div>
            </td>
          </tr>
        </table>

        <!-- Report general Title -->
        <h1>BÁO CÁO THỐNG KÊ TIẾN ĐỘ & HIỆU SUẤT CÔNG VIỆC</h1>
        
        <!-- Summary details -->
        <p style="text-align: center; font-style: italic; margin-bottom: 30px;">
          Căn cứ trên dữ liệu nhật ký tác vụ hoạt động ghi nhận trực tuyến.
        </p>

        <!-- I. MAIN HIGHLIGHT CHANNELS -->
        <h2>I. CHỈ SỐ HOẠT ĐỘNG CHỦ CHỐT (KPI)</h2>
        <table class="kpi-table">
          <tr>
            <td>
              <div style="color: #64748b; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Tổng số đầu việc</div>
              <div style="font-size: 16pt; font-weight: bold; color: #1e3a8a;">${stats.totalEntries}</div>
              <div style="font-size: 8.5pt; color: #64748b; margin-top: 2px;">Đã ghi chép toàn hệ thống</div>
            </td>
            <td>
              <div style="color: #64748b; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Đã hoàn thành</div>
              <div style="font-size: 16pt; font-weight: bold; color: #15803d;">${stats.doneEntries}</div>
              <div style="font-size: 8.5pt; color: #15803d; margin-top: 2px;">Tỷ lệ: ${stats.totalEntries > 0 ? Math.round((stats.doneEntries / stats.totalEntries) * 100) : 0}%</div>
            </td>
            <td>
              <div style="color: #64748b; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Đang thực hiện</div>
              <div style="font-size: 16pt; font-weight: bold; color: #0369a1;">${stats.carryingEntries}</div>
              <div style="font-size: 8.5pt; color: #0369a1; margin-top: 2px;">Tác vụ đang triển khai active</div>
            </td>
          </tr>
          <tr>
            <td>
              <div style="color: #64748b; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Việc quá hạn</div>
              <div style="font-size: 16pt; font-weight: bold; color: #b91c1c;">${stats.overdueEntries}</div>
              <div style="font-size: 8.5pt; color: #b91c1c; margin-top: 2px;">Cần chú trọng rà soát ngay</div>
            </td>
            <td>
              <div style="color: #64748b; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Hạn trong 7 ngày</div>
              <div style="font-size: 16pt; font-weight: bold; color: #b45309;">${stats.dueSoonEntries}</div>
              <div style="font-size: 8.5pt; color: #b45309; margin-top: 2px;">Có rủi ro quá hạn sớm</div>
            </td>
            <td>
              <div style="color: #64748b; font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px;">Độ ưu tiên cao/Khẩn</div>
              <div style="font-size: 16pt; font-weight: bold; color: #be123c;">${stats.highPriorityEntries}</div>
              <div style="font-size: 8.5pt; color: #be123c; margin-top: 2px;">Ưu tiên sắp xếp tối cao</div>
            </td>
          </tr>
        </table>

        <!-- II. STRUCTURAL SUMMARY ANALYSIS -->
        <h2>II. CƠ CẤU PHÂN BỔ CÔNG VIỆC</h2>
        
        <table style="width: 100%; border: none; margin-bottom: 15px;">
          <tr style="border: none;">
            <td style="border: none; width: 48%; vertical-align: top; padding-right: 4%;">
              <h3>1. Theo nhóm danh mục:</h3>
              <table class="stats-table">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 9.5pt;">Dự án / Danh mục</th>
                    <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 9.5pt;">Số nhiệm vụ</th>
                  </tr>
                </thead>
                <tbody>
                  ${categoriesRows || "<tr><td colspan='2' style='text-align: center; padding: 10px;'>Không có dữ liệu</td></tr>"}
                </tbody>
              </table>
            </td>
            <td style="border: none; width: 48%; vertical-align: top;">
              <h3>2. Theo trạng thái xử lý:</h3>
              <table class="stats-table">
                <thead>
                  <tr style="background-color: #f8fafc;">
                    <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: left; font-size: 9.5pt;">Trạng thái</th>
                    <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center; font-size: 9.5pt;">Số đầu việc</th>
                  </tr>
                </thead>
                <tbody>
                  ${statusRows || "<tr><td colspan='2' style='text-align: center; padding: 10px;'>Không có dữ liệu</td></tr>"}
                </tbody>
              </table>
            </td>
          </tr>
        </table>

        <!-- III. DETAILED LIST -->
        <h2>III. CHI TIẾT DANH SÁCH NHẬT KÝ VÀ TIẾN ĐỘ</h2>
        <table class="logs-table">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 12%;">Thời điểm</th>
              <th style="width: 45%;">Nội dung chi tiết & Kết quả thực tế</th>
              <th style="width: 13%;">Danh mục</th>
              <th style="width: 8%;">Khẩn</th>
              <th style="width: 10%;">Hạn xử lý</th>
              <th style="width: 12%;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${logsRows || "<tr><td colspan='7' style='text-align: center; padding: 20px;'>Không có dữ liệu chi tiết nào được ghi nhận.</td></tr>"}
          </tbody>
        </table>

        <!-- Signature approvals -->
        <table class="signature-section">
          <tr>
            <td>
              <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 60px;">CÁN BỘ LẬP BÁO CÁO</div>
              <div style="font-style: italic; color: #64748b;">(Ký và ghi rõ họ tên)</div>
            </td>
            <td>
              <div style="font-weight: bold; text-transform: uppercase;">NGƯỜI DUYỆT BÁO CÁO</div>
              <div style="font-size: 9.5pt; font-weight: normal; margin-bottom: 50px;">Chức vụ: ${approverName}</div>
              <div style="font-style: italic; color: #64748b;">(Ký và đóng dấu nếu có)</div>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Convert into a real Blob format and trigger user download
    const blob = new Blob(["\ufeff" + documentHtml], {
      type: "application/msword;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_cao_nhat_ky_cong_viec_${new Date().toISOString().split("T")[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Prep status pie data
  const pieData = Object.entries(stats.statusCount).map(([name, value]) => ({
    name,
    value,
  }));

  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    value,
    name,
    percent,
  }: any) => {
    if (percent < 0.05) return null; // Hide labels for very small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-[10px] font-bold"
        style={{ textShadow: "0px 1px 2px rgba(0,0,0,0.8)" }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const COLORS = {
    "Hoàn thành": "#10b981", // Emerald
    "Đang thực hiện": "#0ea5e9", // Sky
    "Chờ phối hợp": "#f59e0b", // Amber
    "Tạm dừng": "#ef4444", // Rose
  };

  const DEFAULT_COLORS = [
    "#3b82f6",
    "#a855f7",
    "#ec4899",
    "#14b8a6",
    "#64748b",
  ];

  const CATEGORY_COLORS = [
    "#3b82f6",
    "#a855f7",
    "#ec4899",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#14b8a6",
    "#64748b",
  ];

  // Prep category pie data & bar data with dynamic important categories configuration
  const { categoryPieData, barData } = React.useMemo(() => {
    const rawEntries = Object.entries(stats.categoriesCount);

    if (categoryMode === "all" || importantCategories.length === 0) {
      // Normal full list
      const pie = rawEntries.map(([name, value]) => ({
        name,
        value,
        isImportant: importantCategories.includes(name),
      }));
      const bar = rawEntries.map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        fullName: name,
        "Số đầu việc": value,
        isImportant: importantCategories.includes(name),
      }));
      return { categoryPieData: pie, barData: bar };
    }

    if (categoryMode === "filter") {
      // Show ONLY important categories
      const filtered = rawEntries.filter(([name]) =>
        importantCategories.includes(name),
      );
      const pie = filtered.map(([name, value]) => ({
        name,
        value,
        isImportant: true,
      }));
      const bar = filtered.map(([name, value]) => ({
        name: name.length > 15 ? name.substring(0, 15) + "..." : name,
        fullName: name,
        "Số đầu việc": value,
        isImportant: true,
      }));
      return { categoryPieData: pie, barData: bar };
    }

    // Default mode: "group" (Group other categories into a single block "Danh mục khác")
    const importantSet = new Set(importantCategories);
    const importantList: {
      name: string;
      value: number;
      isImportant: boolean;
    }[] = [];
    let othersSum = 0;

    rawEntries.forEach(([name, value]) => {
      if (importantSet.has(name)) {
        importantList.push({ name, value, isImportant: true });
      } else {
        othersSum += value;
      }
    });

    // Sort showing important ones descending by value
    importantList.sort((a, b) => b.value - a.value);

    // If there are other categories with positive sum, add "Danh mục khác"
    if (othersSum > 0) {
      importantList.push({
        name: "Danh mục khác (nhóm còn lại)",
        value: othersSum,
        isImportant: false,
      });
    }

    const bar = importantList.map((item) => ({
      name:
        item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name,
      fullName: item.name,
      "Số đầu việc": item.value,
      isImportant: item.isImportant,
    }));

    return { categoryPieData: importantList, barData: bar };
  }, [stats.categoriesCount, importantCategories, categoryMode]);

  // Prep estimated work hours calculation standard
  const calculatedWorkHours = React.useMemo(() => {
    let totalHours = 0;
    let parsedCount = 0;
    let parsedSum = 0;
    let fallbackCount = 0;
    let fallbackSum = 0;

    const categoryHours: Record<string, number> = {};

    logs.forEach((log) => {
      let logHours: number | null = null;

      if (enableTextParsing) {
        // Look into content, resultText, plannedProgress, notes
        const textFields = [
          log.content,
          log.resultText,
          log.plannedProgress,
          log.notes,
        ].filter(Boolean);
        for (const f of textFields) {
          // Scan for patterns like "5h", "2.5h", "8 giờ", "5 hr", etc.
          const match = f.match(
            /(?:^|\s|Danh|dành|mất|trong|--|:)(\d+(?:[.,]\d+)?)\s*(?:h|g|hour|hours|hr|hrs|giờ|giờ)\b/i,
          );
          if (match) {
            const numStr = match[1].replace(",", ".");
            const val = parseFloat(numStr);
            if (!isNaN(val) && val > 0 && val <= 24) {
              logHours = val;
              break;
            }
          }
        }
      }

      const category = log.category || "Hoạt động hỗ trợ khác";

      if (logHours !== null) {
        parsedCount++;
        parsedSum += logHours;
        totalHours += logHours;
        categoryHours[category] = (categoryHours[category] || 0) + logHours;
      } else {
        fallbackCount++;
        const priority = log.priority || "Trung bình";
        const defaultVal =
          fallbackHours[priority as keyof typeof fallbackHours] ?? 4;
        fallbackSum += defaultVal;
        totalHours += defaultVal;
        categoryHours[category] = (categoryHours[category] || 0) + defaultVal;
      }
    });

    return {
      totalHours,
      parsedCount,
      parsedSum,
      fallbackCount,
      fallbackSum,
      categoryHours,
    };
  }, [logs, fallbackHours, enableTextParsing]);

  // Helper to extract localized Vietnamese week boundaries and format nicely
  const getWeekRangeAndLabel = React.useCallback((dateStr: string) => {
    const parts = dateStr.split("-");
    if (parts.length !== 3) {
      return { mondayKey: "", rangeLabel: "Chưa rõ" };
    }
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) {
      return { mondayKey: "", rangeLabel: "Chưa rõ" };
    }

    const dayOfWeek = date.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const pad = (num: number) => String(num).padStart(2, "0");

    const formatShort = (d: Date) =>
      `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
    const formatFull = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    return {
      mondayKey: formatFull(monday),
      rangeLabel: `Tuần ${formatShort(monday)} - ${formatShort(sunday)}`,
    };
  }, []);

  // Prep weekly performance metrics (Completed vs Pending tasks)
  const weeklyStatsData = React.useMemo(() => {
    const weekGroups: Record<
      string,
      { rangeLabel: string; "Hoàn thành": number; "Tồn đọng": number }
    > = {};

    logs.forEach((log) => {
      if (!log.date) return;
      const { mondayKey, rangeLabel } = getWeekRangeAndLabel(log.date);
      if (!mondayKey) return;

      if (!weekGroups[mondayKey]) {
        weekGroups[mondayKey] = {
          rangeLabel,
          "Hoàn thành": 0,
          "Tồn đọng": 0,
        };
      }

      if (log.status === "Hoàn thành") {
        weekGroups[mondayKey]["Hoàn thành"]++;
      } else {
        weekGroups[mondayKey]["Tồn đọng"]++;
      }
    });

    const sortedKeys = Object.keys(weekGroups).sort();
    const result = sortedKeys.map((key) => ({
      name: weekGroups[key].rangeLabel,
      "Hoàn thành": weekGroups[key]["Hoàn thành"],
      "Tồn đọng": weekGroups[key]["Tồn đọng"],
      "Tổng số": weekGroups[key]["Hoàn thành"] + weekGroups[key]["Tồn đọng"],
    }));

    return weeklyRange === "4weeks" ? result.slice(-4) : result.slice(-12);
  }, [logs, getWeekRangeAndLabel, weeklyRange]);

  // Prep timeline metrics (group by date)
  const dateGroups: Record<string, number> = {};
  // Sort dates
  const sortedDates = [...logs].map((l) => l.date).sort();
  sortedDates.forEach((dateStr) => {
    dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
  });

  const timelineData = Object.entries(dateGroups)
    .map(([date, count]) => {
      const parts = date.split("-");
      const label = `${parts[2]}/${parts[1]}`;
      return {
        label,
        "Tần suất ghi": count,
      };
    })
    .slice(-15); // Show last 15 active days

  // Prep completion trend metrics (completed items by date)
  const completionDateGroups: Record<string, number> = {};
  // pre-fill dates from sortedDates to align timelines seamlessly
  sortedDates.forEach((dateStr) => {
    completionDateGroups[dateStr] = 0;
  });
  // count completed per day of month
  logs.forEach((log) => {
    if (log.status === "Hoàn thành" && log.date) {
      completionDateGroups[log.date] =
        (completionDateGroups[log.date] || 0) + 1;
    }
  });

  const completionTrendData = Object.entries(completionDateGroups)
    .map(([date, count]) => {
      const parts = date.split("-");
      const label = `${parts[2]}/${parts[1]}`;
      return {
        label,
        "Hoàn thành": count,
      };
    })
    .slice(-15);

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "statusPie":
        return (
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between h-[360px] no-page-break-inside relative group">
            {/* Grip handle and label */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 print:hidden pointer-events-none">
              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-semibold">
                Giữ, kéo thả để đổi vị trí
              </span>
              <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing" />
            </div>
            <h3 className="text-sm font-bold text-slate-705 dark:text-slate-300 pr-10 flex items-center space-x-1.5">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing print:hidden inline lg:hidden shrink-0" />
              <span>Cơ cấu Trạng thái Xử lý Công việc</span>
            </h3>

            <div className="h-56 w-full flex items-center justify-center print-chart-container">
              {isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3 animate-pulse">
                  <div className="w-24 h-24 rounded-full border-8 border-slate-100 dark:border-slate-800 border-t-sky-400 dark:border-t-sky-600 animate-spin" />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    Đang phân tích trạng thái...
                  </span>
                </div>
              ) : pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            COLORS[entry.name as keyof typeof COLORS] ||
                            DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        background: "#0b1220",
                        color: "#fff",
                        borderColor: "#334155",
                      }}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(value) => (
                        <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400">
                  Không có dữ liệu công việc
                </p>
              )}
            </div>
          </div>
        );
      case "categoryPie":
        return (
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between h-[360px] no-page-break-inside relative group">
            {/* Grip handle and label */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 print:hidden pointer-events-none">
              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-semibold">
                Giữ, kéo thả để đổi vị trí
              </span>
              <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing" />
            </div>
            <h3 className="text-sm font-bold text-slate-705 dark:text-slate-300 pr-10 flex items-center space-x-1.5 flex-wrap">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing print:hidden inline lg:hidden shrink-0" />
              <span>Tỷ lệ Phân bổ theo Nhóm Công việc</span>
              {importantCategories.length > 0 && categoryMode !== "all" && (
                <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold bg-violet-100/60 dark:bg-violet-950/40 px-1.5 py-0.5 rounded print:hidden ml-1.5">
                  Ưu tiên {importantCategories.length} mục
                </span>
              )}
            </h3>

            <div className="h-56 w-full flex items-center justify-center print-chart-container">
              {isLoading ? (
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3 animate-pulse">
                  <div className="w-24 h-24 rounded-full border-8 border-slate-100 dark:border-slate-800 border-t-purple-400 dark:border-t-purple-600 animate-spin" />
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    Đang tính tỉ lệ phân bổ...
                  </span>
                </div>
              ) : categoryPieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomizedLabel}
                    >
                      {categoryPieData.map((entry: any, index) => {
                        let fill =
                          CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                        if (
                          entry.name &&
                          entry.name.includes("Danh mục khác")
                        ) {
                          fill = "#94a3b8"; // Slate gray for fallback group
                        }
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        background: "#0b1220",
                        color: "#fff",
                        borderColor: "#334155",
                      }}
                      formatter={(value) => [`${value} công việc`, "Số lượng"]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(value) => {
                        const truncated =
                          value.length > 15
                            ? value.substring(0, 15) + "..."
                            : value;
                        return (
                          <span
                            className="text-xs text-slate-600 dark:text-slate-400 font-medium"
                            title={value}
                          >
                            {truncated}
                          </span>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-slate-400">
                  Không có dữ liệu công việc
                </p>
              )}
            </div>
          </div>
        );
      case "categoryBar":
        return (
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between h-[360px] no-page-break-inside relative group">
            {/* Grip handle and label */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 print:hidden pointer-events-none">
              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-semibold">
                Giữ, kéo thả để đổi vị trí
              </span>
              <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing" />
            </div>
            <h3 className="text-sm font-bold text-slate-705 dark:text-slate-300 pr-10 flex items-center space-x-1.5 flex-wrap">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing print:hidden inline shrink-0" />
              <span>Phân bố theo Nhóm Công việc</span>
              {importantCategories.length > 0 && categoryMode !== "all" && (
                <span className="text-[9px] text-violet-600 dark:text-violet-400 font-bold bg-violet-100/60 dark:bg-violet-950/40 px-1.5 py-0.5 rounded print:hidden ml-1.5">
                  Ưu tiên {importantCategories.length} mục
                </span>
              )}
            </h3>

            <div className="h-64 w-full print-chart-container">
              {isLoading ? (
                <div className="w-full h-full flex items-end justify-between px-6 pt-6 pb-2 animate-pulse">
                  <div className="w-8 bg-slate-205 dark:bg-slate-800 rounded-t-lg h-[40%]" />
                  <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-[75%]" />
                  <div className="w-8 bg-slate-205 dark:bg-slate-800 rounded-t-lg h-[55%]" />
                  <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-[90%]" />
                  <div className="w-8 bg-slate-205 dark:bg-slate-800 rounded-t-lg h-[30%]" />
                  <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-[65%]" />
                  <div className="w-8 bg-slate-205 dark:bg-slate-800 rounded-t-lg h-[50%]" />
                  <div className="w-8 bg-slate-200 dark:bg-slate-800 rounded-t-lg h-[81%]" />
                </div>
              ) : barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                      className="dark:stroke-slate-800"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      className="dark:axis-line-slate-800"
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        background: "#0b1220",
                        color: "#fff",
                        borderColor: "#334155",
                      }}
                      cursor={{ fill: "rgba(224, 242, 254, 0.2)" }}
                      formatter={(value) => [`${value} công việc`, "Số lượng"]}
                      labelFormatter={(label, items) => {
                        const item = items[0]?.payload as any;
                        return item ? item.fullName : label;
                      }}
                    />
                    <Bar dataKey="Số đầu việc" radius={[4, 4, 0, 0]}>
                      {barData.map((entry: any, index) => {
                        let barColor = "#38bdf8"; // standard blue
                        if (
                          entry.fullName &&
                          entry.fullName.includes("Danh mục khác")
                        ) {
                          barColor = "#94a3b8"; // Slate gray for other group
                        } else if (entry.isImportant) {
                          barColor = "#6366f1"; // Indigo violet for important
                        }
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-slate-400">
                    Không có dữ liệu công việc
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case "weeklyStats":
        return (
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 flex flex-col justify-between h-[390px] no-page-break-inside relative group shadow-xs hover:shadow-md transition-shadow">
            {/* Grip handle and label */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 print:hidden pointer-events-none">
              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-semibold">
                Giữ, kéo thả để đổi vị trí
              </span>
              <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-black text-slate-750 dark:text-slate-200 flex items-center space-x-2">
                <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-600 cursor-grab active:cursor-grabbing print:hidden inline shrink-0" />
                <span>Hiệu suất &amp; So sánh Tiến độ theo Tuần</span>
              </h3>

              <div className="flex bg-slate-105/90 dark:bg-slate-800/80 rounded-lg p-1 max-w-max shrink-0 print:hidden border border-slate-200/50 dark:border-slate-700/40">
                <button
                  type="button"
                  onClick={() => setWeeklyRange("4weeks")}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                    weeklyRange === "4weeks"
                      ? "bg-white dark:bg-[#111827] text-violet-650 dark:text-violet-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  4 tuần gần nhất
                </button>
                <button
                  type="button"
                  onClick={() => setWeeklyRange("all")}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                    weeklyRange === "all"
                      ? "bg-white dark:bg-[#111827] text-violet-650 dark:text-violet-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-750 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  Tất cả các tuần
                </button>
              </div>
            </div>

            <div className="h-64 w-full print-chart-container mt-2">
              {isLoading ? (
                <div className="w-full h-full flex items-end justify-between px-6 pt-6 pb-2 animate-pulse">
                  <div className="w-6 bg-slate-205 dark:bg-slate-800 rounded-t h-[40%]" />
                  <div className="w-6 bg-slate-200 dark:bg-slate-800 rounded-t h-[60%]" />
                  <div className="w-6 bg-slate-205 dark:bg-slate-800 rounded-t h-[75%]" />
                  <div className="w-6 bg-slate-200 dark:bg-slate-800 rounded-t h-[90%]" />
                  <div className="w-6 bg-slate-205 dark:bg-slate-800 rounded-t h-[30%]" />
                </div>
              ) : weeklyStatsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={weeklyStatsData}
                    margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                      className="dark:stroke-slate-800"
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "#64748b", fontSize: 9 }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      className="dark:axis-line-slate-800"
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        background: "#0b1220",
                        color: "#fff",
                        borderColor: "#334155",
                      }}
                      cursor={{ fill: "rgba(241, 245, 249, 0.15)" }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <span className="text-xs text-slate-650 dark:text-slate-350 font-semibold">
                          {value}
                        </span>
                      )}
                    />
                    <Bar
                      dataKey="Hoàn thành"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      name="Đã hoàn thành"
                      maxBarSize={30}
                    />
                    <Bar
                      dataKey="Tồn đọng"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      name="Còn tồn đọng"
                      maxBarSize={30}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-slate-400 italic">
                    Không tìm thấy dữ liệu hoạt động theo tuần
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case "completionTrendLine":
        return (
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 no-page-break-inside relative group flex flex-col justify-between h-[360px]">
            {/* Grip handle and label */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 print:hidden pointer-events-none">
              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-semibold">
                Giữ, kéo thả để đổi vị trí
              </span>
              <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing" />
            </div>
            <h3 className="text-sm font-bold text-slate-705 dark:text-slate-300 pr-10 mb-4 flex items-center space-x-1.5">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing print:hidden inline shrink-0" />
              <span>
                Xu hướng Hoàn thành Công việc theo Từng ngày (Nhịp độ hoạt động)
              </span>
            </h3>
            <div className="h-56 w-full print-chart-container">
              {isLoading ? (
                <div className="h-full w-full flex flex-col justify-between py-2 animate-pulse">
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="relative w-full h-32 flex items-center pr-12">
                    <svg
                      className="absolute inset-x-0 bottom-0 w-full h-24 text-slate-205 dark:text-slate-850"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,60 Q120,40 240,60 T480,20 T720,80 T960,10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray="5,5"
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between px-2 text-[10px] text-slate-400">
                    <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-10" />
                  </div>
                </div>
              ) : completionTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={completionTrendData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                      strokeOpacity={0.5}
                      className="dark:stroke-slate-800"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                    />
                    <YAxis
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        background: "#0b1220",
                        color: "#fff",
                        borderColor: "#334155",
                      }}
                      formatter={(value) => [
                        `${value} công việc hoàn thành`,
                        "Số lượng",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="Hoàn thành"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        stroke: "#34d399",
                        strokeWidth: 1.5,
                        fill: "#fff",
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-slate-400">
                    Không có dữ liệu công việc hoàn thành.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      case "timelineLine":
        return (
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 no-page-break-inside relative group flex flex-col justify-between h-[360px]">
            {/* Grip handle and label */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 print:hidden pointer-events-none">
              <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md font-semibold">
                Giữ, kéo thả để đổi vị trí
              </span>
              <GripVertical className="w-4 h-4 text-slate-400 dark:text-slate-500 cursor-grab active:cursor-grabbing" />
            </div>
            <h3 className="text-sm font-bold text-slate-705 dark:text-slate-300 pr-10 mb-4 flex items-center space-x-1.5">
              <GripVertical className="w-4 h-4 text-slate-300 dark:text-slate-700 cursor-grab active:cursor-grabbing print:hidden inline shrink-0" />
              <span>
                Tần suất Ghi nhận Nhật ký Hoạt động (15 ngày gần nhất)
              </span>
            </h3>
            <div className="h-56 w-full print-chart-container">
              {isLoading ? (
                <div className="h-full w-full flex flex-col justify-between py-2 animate-pulse">
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="h-px bg-slate-100 dark:bg-slate-805 w-full" />
                  <div className="relative w-full h-32 flex items-center pr-12">
                    <svg
                      className="absolute inset-x-0 bottom-0 w-full h-24 text-slate-200 dark:text-slate-800"
                      preserveAspectRatio="none"
                    >
                      <path
                        d="M0,80 Q100,20 200,90 T400,30 T600,100 T800,50 T1000,70"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray="5,5"
                      />
                    </svg>
                  </div>
                  <div className="flex justify-between px-2 text-[10px] text-slate-400">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-805 rounded w-10" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-10" />
                  </div>
                </div>
              ) : timelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                      strokeOpacity={0.5}
                      className="dark:stroke-slate-800"
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                    />
                    <YAxis
                      dataKey="Tần suất ghi"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        background: "#0b1220",
                        color: "#fff",
                        borderColor: "#334155",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Tần suất ghi"
                      stroke="#0284c7"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        stroke: "#38bdf8",
                        strokeWidth: 1.5,
                        fill: "#fff",
                      }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-sm text-slate-400">
                    Không có dữ liệu thời gian ghi nhận.
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Print-only professional banner */}
      <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
        <div className="flex justify-between items-end text-xs">
          <div className="text-left font-bold">
            <p className="text-[10pt] uppercase tracking-wider text-black">
              {agencyName
                ? agencyName.toUpperCase()
                : "HỆ THỐNG QUẢN LÝ NHẬT KÝ & BÁO CÁO CÔNG TÁC"}
            </p>
            <p className="text-[8pt] text-slate-600 font-medium mt-0.5">
              Trình điều hành Phân tích & Giám sát Tiến độ
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9pt] font-semibold text-slate-700">
              Ngày xuất báo cáo: {new Date().toLocaleDateString("vi-VN")}
            </p>
            {approverTitle && (
              <p className="text-[8pt] text-slate-600 font-medium mt-0.5">
                Người phê duyệt: {approverTitle}
              </p>
            )}
          </div>
        </div>
        <h1 className="text-center text-[18pt] font-black uppercase mt-6 tracking-tight text-black border-none">
          Báo Cáo Thống Kê Tiến Độ & Hiệu Suất Công Việc
        </h1>
      </div>

      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <LayoutDashboard className="w-5 h-5 text-sky-500" />
            <span>Dashboard & Phân tích Tiến độ</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tổng quan thời gian ghi nhận, trạng thái xử lý, độ khẩn và tình
            trạng trễ hạn chi tiết toàn hệ thống.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {onToggleZenMode && (
            <button
              onClick={onToggleZenMode}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer ${
                isZenMode
                  ? "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
              title={isZenMode ? "Thu nhỏ" : "Mở rộng (Fullscreen)"}
            >
              {isZenMode ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isZenMode ? "Thu nhỏ" : "Mở rộng"}
              </span>
            </button>
          )}

          <button
            onClick={downloadWordReport}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            title="Tải báo cáo Word (.doc) chứa dữ liệu đầy đủ định dạng chuẩn in ấn"
          >
            <FileDown className="w-4 h-4" />
            <span>Tải WORD</span>
          </button>

          <button
            onClick={() => setShowPrintPreview(true)}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm transition-all cursor-pointer"
            title="Xem trước cấu hình in và dấu chìm báo cáo"
          >
            <Printer className="w-4 h-4" />
            <span>Xem trước in ấn</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-4 print:grid-cols-4 no-page-break-inside">
        {kpiCards
          .filter((card) => !hiddenKpiIds.includes(card.id))
          .map((card) => {
            let value: string | number = 0;
            let subText = "";
            if (card.id === "total") {
              value = stats.totalEntries;
              subText = "Ghi chép toàn bộ";
            } else if (card.id === "done") {
              value = stats.doneEntries;
              const pct =
                stats.totalEntries > 0
                  ? Math.round((stats.doneEntries / stats.totalEntries) * 100)
                  : 0;
              subText = `Tỷ lệ: ${pct}%`;
            } else if (card.id === "carrying") {
              value = stats.carryingEntries;
              subText = "Đang triển khai";
            } else if (card.id === "overdue") {
              value = stats.overdueEntries;
              subText = "Cần rà soát ngay";
            } else if (card.id === "dueSoon") {
              value = stats.dueSoonEntries;
              subText = "Trong 7 ngày tới";
            } else if (card.id === "highPriority") {
              value = stats.highPriorityEntries;
              subText = "Yêu cầu cao/Khẩn";
            } else if (card.id === "hours") {
              value = Math.round(calculatedWorkHours.totalHours * 10) / 10;
              subText = `Định mức: ${plannedQuota}h`;
            }

            const isDragging = draggedKpiId === card.id;

            return (
              <div
                key={card.id}
                draggable="true"
                onDragStart={(e) => handleKpiDragStart(e, card.id)}
                onDragOver={(e) => handleKpiDragOver(e, card.id)}
                onDragEnd={handleKpiDragEnd}
                className={`p-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-[#111827] flex flex-col justify-between transition-all relative group cursor-grab active:cursor-grabbing shadow-xs ${
                  isDragging
                    ? "opacity-30 border-2 border-dashed border-violet-400 bg-violet-500/5 scale-95"
                    : "hover:shadow-md"
                }`}
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity print:hidden pointer-events-none">
                  <GripVertical className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`p-1.5 rounded-lg ${card.color}`}>
                    {getKpiIcon(card.icon)}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 line-clamp-1">
                    {card.label}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-xl font-extrabold text-slate-800 dark:text-slate-100 font-mono">
                    {value}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                    {subText}
                  </p>
                </div>
              </div>
            );
          })}
      </div>

      {/* Utility Drag and Drop Information & Reset Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-sky-505/5 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-955/40 p-4 rounded-xl print:hidden">
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed flex items-center space-x-2">
          <span className="p-1 rounded bg-sky-100 dark:bg-sky-955/50 text-sky-600 dark:text-sky-400 shrink-0 flex items-center shadow-xs">
            <GripVertical className="w-4 h-4 animate-pulse" />
          </span>
          <span>
            <strong>Bố cục tùy chỉnh:</strong> Kéo thả trực tiếp các{" "}
            <strong>khối chỉ số KPI</strong> và các{" "}
            <strong>biểu đồ phân tích</strong> bên dưới để ưu tiên thứ tự hiển
            thị. Các điều chỉnh được tự động lưu.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            type="button"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer border shadow-xs ${
              isConfigOpen
                ? "bg-violet-600 text-white border-violet-500 hover:bg-violet-700"
                : "bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 border-slate-200 dark:border-slate-700"
            }`}
            title="Tùy chỉnh danh sách các Danh mục công việc quan trọng để ưu tiên hiển thị trên biểu đồ"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 animate-pulse" />
            <span>Mục quan trọng ({importantCategories.length})</span>
          </button>

          <button
            onClick={resetLayout}
            type="button"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-250 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer shrink-0 border border-slate-200 dark:border-slate-705 shadow-xs"
            title="Khôi phục thứ tự hiển thị về cấu hình mặc định ban đầu"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Khôi phục mặc định</span>
          </button>
        </div>
      </div>

      {isConfigOpen && (
        <div className="bg-slate-50 dark:bg-[#111827]/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4 print:hidden animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-150 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
                <Settings className="w-4 h-4 text-violet-500" />
                <span>Thiết lập Công cụ Quản lý & Định mức Lao động</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cấu hình nhóm việc quan trọng và thiết lập các chuẩn quy đổi giờ
                công định mức phục vụ công tác thanh tra, đánh giá khối lượng
                công tác.
              </p>
            </div>
          </div>
          {/* Sub tabs selector */}
          <div className="flex border-b border-slate-200 dark:border-slate-800/80 mb-4 pb-0 print:hidden text-xs">
            <button
              type="button"
              onClick={() => setConfigTab("categories")}
              className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer ${
                configTab === "categories"
                  ? "border-violet-500 text-violet-650 dark:text-violet-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              Nhóm danh mục quan trọng
            </button>
            <button
              type="button"
              onClick={() => setConfigTab("widgets")}
              className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                configTab === "widgets"
                  ? "border-violet-500 text-violet-650 dark:text-violet-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Ẩn/Hiện biểu đồ & KPI</span>
            </button>
            <button
              type="button"
              onClick={() => setConfigTab("workHours")}
              className={`px-4 py-2 border-b-2 font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                configTab === "workHours"
                  ? "border-violet-500 text-violet-650 dark:text-violet-400"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Timer className="w-3.5 h-3.5" />
              <span>Định mức & Phương pháp Tính giờ công</span>
            </button>
          </div>

          {configTab === "categories" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Đánh dấu các nhóm danh mục chính bám sát chỉ tiêu. Các nhóm
                  còn lại có thể gộp chung hoặc lọc bớt trên biểu đồ.
                </p>

                {/* Display configuration modes Selector */}
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">
                    Chế độ biểu đồ:
                  </span>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-705">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryMode("group");
                        localStorage.setItem(
                          "dashboard_category_summary_mode_v2",
                          "group",
                        );
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        categoryMode === "group"
                          ? "bg-white dark:bg-[#1e293b] text-slate-800 dark:text-white shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                      }`}
                      title="Gom tất cả các danh mục không được chọn vào mục 'Danh mục khác'"
                    >
                      Gom nhóm khác
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryMode("filter");
                        localStorage.setItem(
                          "dashboard_category_summary_mode_v2",
                          "filter",
                        );
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        categoryMode === "filter"
                          ? "bg-white dark:bg-[#1e293b] text-slate-800 dark:text-white shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                      }`}
                      title="Chỉ hiển thị các danh mục được chọn, loại bỏ hoàn toàn các mục khác"
                    >
                      Chỉ hiện đã chọn
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryMode("all");
                        localStorage.setItem(
                          "dashboard_category_summary_mode_v2",
                          "all",
                        );
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all ${
                        categoryMode === "all"
                          ? "bg-white dark:bg-[#1e293b] text-slate-800 dark:text-white shadow-xs"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
                      }`}
                      title="Hiển thị riêng từng danh mục đang có"
                    >
                      Hiện tất cả
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick actions for selections */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all = Array.from(
                      new Set([
                        ...CATEGORY_OPTIONS,
                        ...Object.keys(stats.categoriesCount),
                      ]),
                    );
                    setImportantCategories(all);
                    localStorage.setItem(
                      "dashboard_important_categories_v2",
                      JSON.stringify(all),
                    );
                  }}
                  className="px-2.5 py-1 text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold transition-all cursor-pointer"
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportantCategories([]);
                    localStorage.setItem(
                      "dashboard_important_categories_v2",
                      JSON.stringify([]),
                    );
                  }}
                  className="px-2.5 py-1 text-[10px] bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold transition-all cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const defaults = [
                      "Nghiệp vụ Hành chính",
                      "Dự án & Triển khai",
                      "Đào tạo & Phát triển",
                      "Báo cáo tổng hợp",
                    ];
                    setImportantCategories(defaults);
                    localStorage.setItem(
                      "dashboard_important_categories_v2",
                      JSON.stringify(defaults),
                    );
                  }}
                  className="px-2.5 py-1 text-[10px] bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 text-sky-650 dark:text-sky-300 rounded font-bold border border-sky-200 dark:border-sky-950/50 transition-all text-xs cursor-pointer"
                >
                  Đặt mặc định
                </button>
              </div>

              {/* Grid list of categories to check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {Array.from(
                  new Set([
                    ...CATEGORY_OPTIONS,
                    ...Object.keys(stats.categoriesCount),
                  ]),
                ).map((catName) => {
                  const isChecked = importantCategories.includes(catName);
                  const countOfCat = stats.categoriesCount[catName] || 0;
                  return (
                    <label
                      key={catName}
                      className={`flex items-start p-2.5 rounded-lg border transition-all cursor-pointer text-xs font-semibold select-none ${
                        isChecked
                          ? "bg-violet-500/5 dark:bg-violet-500/10 border-violet-200 dark:border-violet-900/60 text-violet-700 dark:text-violet-400 font-bold shadow-xs"
                          : "bg-white hover:bg-slate-100 dark:bg-[#111827] dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-300"
                      }`}
                      title={`${catName} (Số lượng công việc: ${countOfCat})`}
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-violet-600 bg-gray-100 border-gray-300 rounded focus:ring-violet-500 cursor-pointer mt-0.5 mr-2 shrink-0"
                        checked={isChecked}
                        onChange={() => {
                          let updated;
                          if (isChecked) {
                            updated = importantCategories.filter(
                              (x) => x !== catName,
                            );
                          } else {
                            updated = [...importantCategories, catName];
                          }
                          setImportantCategories(updated);
                          localStorage.setItem(
                            "dashboard_important_categories_v2",
                            JSON.stringify(updated),
                          );
                        }}
                      />
                      <div className="flex-1 min-w-0 flex items-center justify-between">
                        <span className="truncate">{catName}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ml-1.5 shrink-0 ${
                            isChecked
                              ? "bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-350"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {countOfCat}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {configTab === "widgets" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                <div>
                  <h4 className="text-xs font-bold text-slate-750 dark:text-slate-200">
                    Cấu hình hiển thị Widget & Biểu đồ phân tích
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Cho phép bật/tắt (ẩn/hiện) linh hoạt các khối chỉ số KPI và
                    các loại biểu đồ để tối ưu hóa không gian làm việc của đơn
                    vị.
                  </p>
                </div>
              </div>

              {/* Toggle KPI Cards */}
              <div className="space-y-3 bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h5 className="text-[11px] font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider flex items-center space-x-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-violet-500 animate-pulse" />
                  <span>Các khối chỉ số KPI (Thanh trên cùng)</span>
                </h5>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {DEFAULT_KPI_CARDS.map((card) => {
                    const isVisible = !hiddenKpiIds.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          let next;
                          if (isVisible) {
                            next = [...hiddenKpiIds, card.id];
                          } else {
                            next = hiddenKpiIds.filter((id) => id !== card.id);
                          }
                          setHiddenKpiIds(next);
                          localStorage.setItem(
                            "dashboard_hidden_kpis",
                            JSON.stringify(next),
                          );
                        }}
                        className={`flex items-center space-x-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isVisible
                            ? "bg-violet-500/5 dark:bg-violet-500/10 border-violet-200 dark:border-violet-900/60 text-violet-750 dark:text-violet-350 font-bold"
                            : "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/80 text-slate-400 dark:text-slate-550"
                        }`}
                      >
                        <span
                          className={`p-1 rounded ${isVisible ? card.color : "bg-slate-200 dark:bg-slate-800 text-slate-400"}`}
                        >
                          {getKpiIcon(card.icon)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] truncate leading-tight font-bold">
                            {card.label}
                          </p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                            {isVisible ? "Hiển thị" : "Bị ẩn"}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Toggle Chart Widgets */}
              <div className="space-y-3 bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <h5 className="text-[11px] font-bold text-slate-650 dark:text-slate-350 uppercase tracking-wider flex items-center space-x-1.5">
                  <LayoutDashboard className="w-3.5 h-3.5 text-sky-500 animate-pulse" />
                  <span>Các biểu đồ phân tích xu hướng và tần suất</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                  {DEFAULT_WIDGET_SECTIONS.map((sect) => {
                    const isVisible = !hiddenWidgetIds.includes(sect.id);
                    return (
                      <button
                        key={sect.id}
                        type="button"
                        onClick={() => {
                          let next;
                          if (isVisible) {
                            next = [...hiddenWidgetIds, sect.id];
                          } else {
                            next = hiddenWidgetIds.filter(
                              (id) => id !== sect.id,
                            );
                          }
                          setHiddenWidgetIds(next);
                          localStorage.setItem(
                            "dashboard_hidden_widgets",
                            JSON.stringify(next),
                          );
                        }}
                        className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                          isVisible
                            ? "bg-sky-500/5 dark:bg-sky-500/10 border-sky-200 dark:border-sky-900/60 text-sky-750 dark:text-sky-350 font-bold"
                            : "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/85 text-slate-400 dark:text-slate-550"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold truncate leading-tight">
                            {sect.label}
                          </p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal mt-0.5">
                            {isVisible
                              ? "Đang hoạt động"
                              : "Đã ẩn khỏi giao diện"}
                          </p>
                        </div>
                        <div
                          className={`w-2 h-2 rounded-full shrink-0 ml-2 ${isVisible ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {configTab === "workHours" && (
            <div className="space-y-5 animate-in fade-in duration-150 text-xs text-slate-650 dark:text-slate-300">
              {/* Method 1: Extraction from description */}
              <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-750 dark:text-slate-200 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                    <span>
                      Phương pháp 1: Tự động trích xuất tiện từ nội dung nhật ký
                    </span>
                  </h4>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={enableTextParsing}
                      onChange={() => {
                        const next = !enableTextParsing;
                        setEnableTextParsing(next);
                        localStorage.setItem(
                          "dashboard_enable_text_parsing",
                          String(next),
                        );
                      }}
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-650 peer-checked:bg-violet-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Quét tự động trong nội dung, chỉ tiêu hoặc ghi chú nhật ký để
                  phát hiện số giờ trực tiếp do người dùng nhập (Ví dụ:{" "}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400 font-bold font-mono">
                    4h
                  </code>
                  ,{" "}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400 font-bold font-mono">
                    2.5 giờ
                  </code>
                  ,{" "}
                  <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-amber-600 dark:text-amber-400 font-bold font-mono">
                    6 hours
                  </code>
                  ). Hệ thống sẽ ưu tiên áp dụng đúng số này.
                </p>
                {enableTextParsing && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950/20 rounded-lg p-2.5 flex items-start space-x-2 text-[11px] text-amber-850 dark:text-amber-300">
                    <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>
                      Hệ thống đã nhận dạng thành công{" "}
                      <strong>
                        {calculatedWorkHours.parsedCount} công việc
                      </strong>{" "}
                      thiết lập giờ công thủ công (Tổng:{" "}
                      <strong>{calculatedWorkHours.parsedSum} giờ</strong>).
                    </span>
                  </div>
                )}
              </div>

              {/* Method 2: System Defaults by Priority */}
              <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <div>
                  <h4 className="font-bold text-slate-750 dark:text-slate-200">
                    Phương pháp 2: Quy hệ giờ định mức theo mức độ ưu tiên
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
                    Nếu đầu việc không có số liệu giờ công cụ thể trong mô tả,
                    giờ công ước tính sẽ tự động quy đổi dựa theo thang độ ưu
                    tiên ban quản lý thiết lập:
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["Khẩn", "Cao", "Trung bình", "Thấp"] as const).map(
                    (pr) => {
                      const colors =
                        pr === "Khẩn"
                          ? "border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400"
                          : pr === "Cao"
                            ? "border-orange-200 dark:border-orange-900/60 text-orange-600 dark:text-orange-400"
                            : pr === "Trung bình"
                              ? "border-sky-200 dark:border-sky-900/60 text-sky-600 dark:text-sky-400"
                              : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400";
                      return (
                        <div
                          key={pr}
                          className={`p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border ${colors} space-y-2`}
                        >
                          <div className="font-bold flex items-center justify-between text-[11px]">
                            <span>Ưu tiên {pr}</span>
                            <span className="font-mono text-[11px] font-bold">
                              {fallbackHours[pr]}h
                            </span>
                          </div>
                          <div className="flex items-center justify-between bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800/80 p-1">
                            <button
                              type="button"
                              onClick={() => {
                                const currentVal = fallbackHours[pr];
                                const nextVal = Math.max(0.5, currentVal - 0.5);
                                const updated = {
                                  ...fallbackHours,
                                  [pr]: nextVal,
                                };
                                setFallbackHours(updated);
                                localStorage.setItem(
                                  "dashboard_fallback_hours",
                                  JSON.stringify(updated),
                                );
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-[11px] font-bold px-1 text-slate-800 dark:text-slate-200">
                              {fallbackHours[pr]}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentVal = fallbackHours[pr];
                                const nextVal = Math.min(24, currentVal + 0.5);
                                const updated = {
                                  ...fallbackHours,
                                  [pr]: nextVal,
                                };
                                setFallbackHours(updated);
                                localStorage.setItem(
                                  "dashboard_fallback_hours",
                                  JSON.stringify(updated),
                                );
                              }}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100/50 dark:bg-slate-900/20 p-2.5 rounded-lg flex items-center justify-between">
                  <span>
                    Sử dụng chuẩn định mức cho{" "}
                    <strong>
                      {calculatedWorkHours.fallbackCount} công việc
                    </strong>
                    :
                  </span>
                  <span className="font-bold text-slate-700 dark:text-slate-350">
                    {calculatedWorkHours.fallbackSum} giờ công
                  </span>
                </div>
              </div>

              {/* Workload evaluation versus periodical plan budget */}
              <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-slate-750 dark:text-slate-200">
                      Định mức Kế hoạch Định kỳ của Đơn vị
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Để người quản lý so sánh với tổng giờ công tích lũy ước
                      tính từ dữ liệu nhật ký thực tế.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="font-semibold text-slate-500">
                      Giờ định mức:
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={plannedQuota}
                      onChange={(e) => {
                        const val = Math.max(1, parseInt(e.target.value) || 0);
                        setPlannedQuota(val);
                        localStorage.setItem(
                          "dashboard_planned_hours_quota",
                          String(val),
                        );
                      }}
                      className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-lg font-mono font-bold text-center text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    />
                    <span className="font-semibold text-slate-500">h</span>
                  </div>
                </div>

                {/* Progress evaluation graph */}
                <div className="p-3 bg-violet-55/10 dark:bg-violet-950/10 border border-violet-100/40 dark:border-violet-900/10 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600 dark:text-slate-400">
                      Tỷ lệ Tải thực tế so với Kế hoạch:
                    </span>
                    <span className="text-violet-600 dark:text-violet-400 font-mono">
                      {plannedQuota > 0
                        ? Math.round(
                            (calculatedWorkHours.totalHours / plannedQuota) *
                              100,
                          )
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-3 overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-violet-500 to-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, plannedQuota > 0 ? (calculatedWorkHours.totalHours / plannedQuota) * 100 : 0)}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 pt-1 font-semibold">
                    <span>
                      Tổng Thực tế:{" "}
                      {calculatedWorkHours.totalHours.toLocaleString("vi-VN", {
                        maximumFractionDigits: 1,
                      })}{" "}
                      giờ công
                    </span>
                    <span>Định mức Kế hoạch: {plannedQuota} giờ</span>
                  </div>

                  <div className="text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-350 border-t border-slate-150 dark:border-slate-800/80 pt-2.5 mt-2 flex items-start space-x-1.5 animate-in fade-in">
                    <span className="px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-350 font-bold shrink-0">
                      Đánh giá chung
                    </span>
                    <div className="text-slate-705 dark:text-slate-300">
                      {calculatedWorkHours.totalHours > plannedQuota * 1.15 ? (
                        <span>
                          Khối lượng công việc thực tế ước tính vượt định mức kế
                          hoạch (
                          <strong className="text-red-500 dark:text-red-400">
                            Quá tải hệ thống (
                            {plannedQuota > 0
                              ? Math.round(
                                  (calculatedWorkHours.totalHours /
                                    plannedQuota) *
                                    100,
                                )
                              : 0}
                            %)
                          </strong>
                          ). Khuyến nghị người quản lý cân đối lại tần suất hoặc
                          giảm bớt việc trùng lặp.
                        </span>
                      ) : calculatedWorkHours.totalHours <
                        plannedQuota * 0.8 ? (
                        <span>
                          Khối lượng công việc thực tế ước tính thấp dưới ngưỡng
                          dự kiến (
                          <strong className="text-amber-500 dark:text-amber-400">
                            Dưới định mức (
                            {plannedQuota > 0
                              ? Math.round(
                                  (calculatedWorkHours.totalHours /
                                    plannedQuota) *
                                    100,
                                )
                              : 0}
                            %)
                          </strong>
                          ). Tối ưu hóa bằng cách kết nạp thêm các đầu việc
                          chiến lược nâng chất lượng khoa học.
                        </span>
                      ) : (
                        <span>
                          Khối lượng vận hành nằm trong phạm vi tiệm cận tối ưu
                          (
                          <strong className="text-emerald-500 dark:text-emerald-400">
                            Đạt tải lượng lý tưởng (
                            {plannedQuota > 0
                              ? Math.round(
                                  (calculatedWorkHours.totalHours /
                                    plannedQuota) *
                                    100,
                                )
                              : 0}
                            %)
                          </strong>
                          ). Hiệu suất lao động xuất sắc và phân bổ hợp lý, bảo
                          đảm phát triển lâu dài.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print-chart-grid-2 no-page-break-inside">
        {widgetSections
          .filter((sect) => !hiddenWidgetIds.includes(sect.id))
          .map((sect) => {
            const isDragging = draggedWidgetId === sect.id;
            return (
              <div
                key={sect.id}
                draggable="true"
                onDragStart={(e) => handleWidgetDragStart(e, sect.id)}
                onDragOver={(e) => handleWidgetDragOver(e, sect.id)}
                onDragEnd={handleWidgetDragEnd}
                className={`transition-all duration-150 ${sect.colSpan} ${
                  isDragging
                    ? "opacity-30 border-2 border-dashed border-sky-400 bg-sky-500/5 scale-98 rounded-xl h-[360px]"
                    : "hover:shadow-xs rounded-xl"
                }`}
              >
                {renderWidget(sect.id)}
              </div>
            );
          })}
      </div>

      {showPrintPreview && (
        <PrintPreview
          logs={logs}
          stats={stats}
          agencyName={agencyName}
          approverTitle={approverTitle}
          agencyLogo={agencyLogo}
          onClose={() => setShowPrintPreview(false)}
        />
      )}
    </div>
  );
}
