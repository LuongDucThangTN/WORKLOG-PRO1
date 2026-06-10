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
  Line
} from "recharts";
import { WorkLog, Stats } from "../types";
import { 
  Printer, 
  X, 
  Settings, 
  Eye, 
  Layout, 
  Layers, 
  FileText,
  Bookmark,
  CheckSquare
} from "lucide-react";

interface PrintPreviewProps {
  logs: WorkLog[];
  stats: Stats;
  agencyName?: string;
  approverTitle?: string;
  agencyLogo?: string;
  onClose: () => void;
}

export default function PrintPreview({ 
  logs, 
  stats, 
  agencyName = "CƠ QUAN CHỦ QUẢN", 
  approverTitle = "Trưởng phòng chuyên môn", 
  agencyLogo = "", 
  onClose 
}: PrintPreviewProps) {
  // Config state for the print preview
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(10); // 0 to 100
  const [watermarkType, setWatermarkType] = useState<"seal" | "diagonal" | "none">("seal");
  const [includeLogsTable, setIncludeLogsTable] = useState<boolean>(true);
  const [isSerif, setIsSerif] = useState<boolean>(true); // Vietnamese administrative standard: Serif (Times New Roman style)

  const printDateString = new Date().toLocaleDateString('vi-VN', {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });

  const yearString = new Date().getFullYear();
  const monthString = new Date().getMonth() + 1;
  const dayString = new Date().getDate();

  // Prep Status count
  const pieData = Object.entries(stats.statusCount).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = {
    "Hoàn thành": "#10b981",    // Emerald
    "Đang thực hiện": "#0ea5e9", // Sky
    "Chờ phối hợp": "#f59e0b",  // Amber
    "Tạm dừng": "#ef4444"       // Rose
  };

  const DEFAULT_COLORS = ["#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#64748b"];
  const CATEGORY_COLORS = ["#3b82f6", "#a855f7", "#ec4899", "#10b981", "#f59e0b", "#ef4444", "#14b8a6", "#64748b"];

  // Prep category pie data
  const categoryPieData = Object.entries(stats.categoriesCount).map(([name, value]) => ({
    name,
    value
  }));

  // Bar Data
  const barData = Object.entries(stats.categoriesCount).map(([name, value]) => ({
    name: name.length > 12 ? name.substring(0, 12) + "..." : name,
    fullName: name,
    "Số lượng": value
  }));

  // Timeline metrics
  const dateGroups: Record<string, number> = {};
  const sortedDates = [...logs].map(l => l.date).sort();
  sortedDates.forEach(dateStr => {
    dateGroups[dateStr] = (dateGroups[dateStr] || 0) + 1;
  });

  const timelineData = Object.entries(dateGroups).map(([date, count]) => {
    const parts = date.split("-");
    const label = `${parts[2]}/${parts[1]}`;
    return {
      label,
      "Tần suất": count
    };
  }).slice(-10); // last 10 dates for a tighter preview

  // Trigger real print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-900/95 text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Control Panel Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 print:hidden shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-100">Bản xem trước khi In báo cáo</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Hiệu đun, điều chỉnh watermark và xem trước giao diện trang trang A4 trước khi In vật lý hoặc lưu PDF.</p>
          </div>
        </div>

        {/* Configurations Row */}
        <div className="flex flex-wrap items-center gap-4 text-xs">
          {/* Watermark Selector */}
          <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
            <span className="text-slate-400 font-bold flex items-center space-x-1">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span>Dấu chìm:</span>
            </span>
            <select
              value={watermarkType}
              onChange={(e) => setWatermarkType(e.target.value as any)}
              className="bg-slate-800 text-slate-200 font-semibold border-none focus:ring-0 cursor-pointer rounded text-[11px] py-1 px-2.5"
            >
              <option value="seal">Mộc đỏ cơ quan (Tròn)</option>
              <option value="diagonal">Chữ chéo "BÁO CÁO"</option>
              <option value="none">Không đóng dấu</option>
            </select>
          </div>

          {/* Watermark Opacity Slider */}
          {watermarkType !== "none" && (
            <div className="flex items-center space-x-2 bg-slate-900/60 p-2 rounded-xl border border-slate-700/80">
              <span className="text-slate-400 font-bold">Độ đậm dấu:</span>
              <input
                type="range"
                min="3"
                max="30"
                value={watermarkOpacity}
                onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                className="w-16 accent-emerald-500 h-1 bg-slate-700 rounded-lg cursor-pointer"
              />
              <span className="text-slate-300 font-mono w-6 text-right text-[10px]">{watermarkOpacity}%</span>
            </div>
          )}

          {/* Font Selector */}
          <button
            onClick={() => setIsSerif(!isSerif)}
            className={`px-3 py-2 rounded-xl border font-bold flex items-center space-x-1.5 transition-all text-[11px] cursor-pointer ${
              isSerif 
                ? "bg-slate-700 border-emerald-500 text-slate-200"
                : "bg-slate-900/40 border-slate-700 text-slate-400"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Font: {isSerif ? "Times serif" : "Sans-serif UI"}</span>
          </button>

          {/* Include Logs Table Toggle */}
          <button
            onClick={() => setIncludeLogsTable(!includeLogsTable)}
            className={`px-3 py-2 rounded-xl border font-bold flex items-center space-x-1.5 transition-all text-[11px] cursor-pointer ${
              includeLogsTable 
                ? "bg-slate-700 border-emerald-500 text-slate-200"
                : "bg-slate-900/40 border-slate-700 text-slate-400"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Kèm bảng kê đầu việc: {includeLogsTable ? "BẬT" : "TẮT"}</span>
          </button>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-black text-xs rounded-xl flex items-center space-x-2 shadow-lg hover:shadow-emerald-950/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Tiến hành In (Ctrl + P)</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-300 rounded-xl transition-all cursor-pointer border border-slate-650"
            title="Đóng bản xem trước"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Scrollable Preview Area */}
      <div className="flex-1 overflow-y-auto px-4 py-8 bg-slate-900/40 dark:bg-slate-950 scrollbar-thin print:bg-white print:p-0 print:overflow-visible">
        
        {/* ==================== PAGE 1: OFFICE STATS & CHART REPORT ==================== */}
        <div 
          className={`bg-white text-black shadow-2xl p-[18mm] max-w-[210mm] w-full min-h-[297mm] mx-auto relative mb-8 print:mb-0 print:shadow-none print:p-0 print:border-none rounded-xs select-text overflow-hidden ${
            isSerif ? "font-serif" : "font-sans"
          }`}
          style={{ fontFamily: isSerif ? '"Times New Roman", Times, serif' : 'Inter, sans-serif' }}
          id="printable-area"
        >
          {/* Watermark Component */}
          {watermarkType !== "none" && (
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0" 
              style={{ opacity: watermarkOpacity / 100 }}
            >
              {watermarkType === "seal" ? (
                // Circular Vietnamese state seal-like layout
                <div className="w-[380px] h-[380px] rounded-full border-[4px] border-double border-red-600 flex items-center justify-center rotate-[-15deg] p-6 relative">
                  <div className="absolute inset-2 rounded-full border border-red-600 border-dashed" />
                  
                  {/* Decorative circular metadata */}
                  <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full fill-red-600 font-black">
                    <path id="previewCrestPath" d="M 200,200 m -160,0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0" fill="none" />
                    <text className="text-[12px] font-bold uppercase tracking-[11px] fill-red-600">
                      <textPath href="#previewCrestPath" startOffset="50%" textAnchor="middle">
                        ★ {agencyName.toUpperCase()} ★ CHÍNH THỨC
                      </textPath>
                    </text>
                  </svg>

                  <div className="text-center space-y-1">
                    <span className="text-red-600 text-6xl font-black block leading-none select-none">★</span>
                    <span className="text-red-600 text-[11pt] font-extrabold uppercase block tracking-wider leading-relaxed select-none">BÁO CÁO</span>
                    <span className="text-[7pt] text-red-600 font-bold block select-none uppercase tracking-widest">{printDateString}</span>
                  </div>
                </div>
              ) : (
                // Diagonal heavy text repeating "BẢN CHÍNH / BÁO CÁO CÔNG TÁC"
                <div className="rotate-[-32deg] text-red-600 font-extrabold text-[42pt] tracking-[10px] uppercase whitespace-nowrap opacity-70">
                  {agencyName.substring(0, 15)} BÁO CÁO
                </div>
              )}
            </div>
          )}

          {/* Header Content of Sheet */}
          <div className="relative z-10 space-y-6">
            
            {/* National Crest header layout */}
            <div className="flex justify-between items-start text-[10.5pt] leading-snug">
              <div className="text-center w-[45%] flex flex-col items-center font-bold">
                {agencyLogo && (
                  <img 
                    src={agencyLogo} 
                    alt="Logo đơn vị" 
                    className="h-14 object-contain mb-2 max-w-[140px] print:block block" 
                    referrerPolicy="no-referrer"
                  />
                )}
                <p className="uppercase tracking-tight text-[10.5pt]">{agencyName}</p>
                <p className="uppercase text-[9pt] border-b border-black pb-1.5 mt-0.5 font-bold">TRÌNH DUYỆT BÁO CÁO</p>
                <p className="text-[8.5pt] font-medium text-slate-600 mt-1.5">Số: ......-BC/VP</p>
              </div>
              
              <div className="text-center w-[50%]">
                <p className="font-bold text-[10pt] uppercase tracking-normal">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="font-bold text-[9.5pt] underline text-black">Độc lập - Tự do - Hạnh phúc</p>
                <p className="text-[8.5pt] italic text-slate-700 mt-3.5">
                  Tỉnh/TP, ngày {dayString} tháng {monthString} năm {yearString}
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-4">
              <h1 className="text-[17pt] font-black uppercase text-black tracking-tight leading-normal m-0 p-0 border-none">
                BÁO CÁO THỐNG KÊ TIẾN ĐỘ & HIỆU SUẤT CÔNG VIỆC
              </h1>
              <p className="text-[10pt] italic text-slate-700 mt-1">
                (Kèm theo Hệ thống quản lý và xử lý nhật ký hoạt động bán niên chuyên môn)
              </p>
            </div>

            {/* Base Overview metadata */}
            <div className="text-[10pt] border border-black p-3.5 rounded-sm space-y-1.5">
              <p className="m-0 leading-relaxed font-semibold">
                ● Đơn vị báo cáo: <span className="font-normal">{agencyName}</span>
              </p>
              <p className="m-0 leading-relaxed font-semibold">
                ● Ngày chốt thống kê dữ liệu: <span className="font-normal">{printDateString}</span>
              </p>
              <p className="m-0 leading-relaxed font-semibold">
                ● Đại diện người phê duyệt chỉ tiêu: <span className="font-normal">{approverTitle}</span>
              </p>
              <p className="m-0 leading-relaxed font-semibold">
                ● Phạm vi kết quả: <span className="font-normal">Tổng hợp toàn bộ {stats.totalEntries} công việc ghi nhận phân bổ.</span>
              </p>
            </div>

            {/* Section I: KPI Metrics Box Layout */}
            <div className="space-y-2">
              <h3 className="text-[11.5pt] font-bold uppercase underline text-black m-0 p-0 tracking-tight">
                I. CHỈ TIÊU TIẾN ĐỘ CHUNG & HIỆU SUẤT
              </h3>
              <p className="text-[10pt] leading-normal m-0 text-slate-800">
                Lập báo cáo tự động tính toán từ tập dữ liệu công tác phòng ban, ghi nhận cụ thể các mức quy đổi độ quan trọng và khả năng bám đuổi hạn hạn định:
              </p>

              {/* Grid representation flat for printing */}
              <div className="grid grid-cols-3 gap-2.5 pt-1.5 font-sans">
                <div className="border border-slate-350 p-2 text-center rounded bg-slate-50/60">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">TỔNG ĐẦU VIỆC CHUNG</span>
                  <span className="text-lg font-black text-slate-900 block mt-0.5">{stats.totalEntries}</span>
                  <span className="text-[8px] text-slate-400 block font-medium">Đã lập hồ sơ</span>
                </div>

                <div className="border border-slate-350 p-2 text-center rounded bg-teal-50/30">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">ĐÃ HOÀN THÀNH</span>
                  <span className="text-lg font-black text-emerald-700 block mt-0.5">{stats.doneEntries}</span>
                  <span className="text-[8px] text-emerald-600 block font-bold">
                    Đúng hạn: {stats.totalEntries > 0 ? Math.round((stats.doneEntries / stats.totalEntries) * 100) : 0}%
                  </span>
                </div>

                <div className="border border-slate-350 p-2 text-center rounded bg-sky-50/30">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">ĐANG TIẾN HÀNH</span>
                  <span className="text-lg font-black text-sky-700 block mt-0.5">{stats.carryingEntries}</span>
                  <span className="text-[8px] text-slate-400 block font-medium">Bám sát tiến độ</span>
                </div>

                <div className="border border-slate-350 p-2 text-center rounded bg-rose-50/30">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">CÔNG VIỆC TRỄ HẠN</span>
                  <span className="text-lg font-black text-rose-700 block mt-0.5">{stats.overdueEntries}</span>
                  <span className="text-[8px] text-rose-600 block font-bold">Yêu cầu khẩn trương</span>
                </div>

                <div className="border border-slate-350 p-2 text-center rounded bg-amber-50/30">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">HẠN 7 NGÀY TỚI</span>
                  <span className="text-lg font-black text-amber-700 block mt-0.5">{stats.dueSoonEntries}</span>
                  <span className="text-[8px] text-slate-400 block font-medium">Sắp đến hạn báo cáo</span>
                </div>

                <div className="border border-slate-350 p-2 text-center rounded bg-red-50/30">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block">ĐỘ ƯU TIÊN KHẨN/CAO</span>
                  <span className="text-lg font-black text-red-700 block mt-0.5">{stats.highPriorityEntries}</span>
                  <span className="text-[8px] text-red-600 block font-bold">Giám sát đặc biệt</span>
                </div>
              </div>
            </div>

            {/* Section II: Graphic charts */}
            <div className="space-y-2 pt-2 page-break-inside-avoid">
              <h3 className="text-[11.5pt] font-bold uppercase underline text-black m-0 p-0 tracking-tight">
                II. PHÂN TÍCH TỶ LỆ TRẠNG THÁI & PHÂN BỔ CHUYÊN MÔN
              </h3>
              <p className="text-[10pt] leading-normal m-0 text-slate-800">
                Biểu đồ phân rã tỷ lệ trạng thái (Status Composition) và phân rã nhóm phân khúc các loại công vụ được phân quyền quản lý tại hệ thống.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-1 font-sans">
                {/* Status Composition Pie */}
                <div className="border border-slate-300 p-3 rounded-lg flex flex-col justify-between h-[200px]">
                  <h4 className="text-[9.5pt] font-bold text-slate-800 text-center uppercase tracking-wide border-b border-light-gray pb-1 select-none">
                    Tỷ lệ trạng thái công việc
                  </h4>
                  <div className="h-40 w-full">
                    {pieData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={48}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={COLORS[entry.name as keyof typeof COLORS] || DEFAULT_COLORS[index % DEFAULT_COLORS.length]} 
                              />
                            ))}
                          </Pie>
                          <Legend 
                            verticalAlign="bottom" 
                            iconType="circle"
                            iconSize={6}
                            formatter={(value) => <span className="text-[8px] text-slate-700 font-semibold">{value}</span>}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400">Không có dữ liệu</div>
                    )}
                  </div>
                </div>

                {/* Category Weight/Split Bar */}
                <div className="border border-slate-300 p-3 rounded-lg flex flex-col justify-between h-[200px]">
                  <h4 className="text-[9.5pt] font-bold text-slate-800 text-center uppercase tracking-wide border-b border-light-gray pb-1 select-none">
                    Tần suất Ghi nhận nhật ký (10 ngày gần nhất)
                  </h4>
                  <div className="h-40 w-full">
                    {timelineData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.6} />
                          <XAxis dataKey="label" tick={{ fill: "#334155", fontSize: 7, fontWeight: "bold" }} />
                          <YAxis tick={{ fill: "#334155", fontSize: 7, fontWeight: "bold" }} allowDecimals={false} />
                          <Line 
                            type="monotone" 
                            dataKey="Tần suất" 
                            stroke="#0f172a" 
                            strokeWidth={1.8} 
                            dot={{ r: 3, stroke: "#38bdf8", strokeWidth: 1, fill: "#fff" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400">Không có dữ liệu</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Print Signatures Block at bottom of Page 1 if no logs table inside */}
            {!includeLogsTable && (
              <div className="pt-12 grid grid-cols-2 text-center text-[10pt] leading-normal page-break-inside-avoid">
                <div>
                  <p className="font-bold uppercase m-0">NGƯỜI LẬP BIỂU</p>
                  <p className="text-[9pt] font-medium text-slate-500 mt-0.5 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-20" />
                  <p className="font-bold underline uppercase mt-4">PHẠM VĂN MINH</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-slate-900 m-0">KHÁNH PHÊ DUYỆT BÁO CÁO</p>
                  <p className="text-[9pt] font-medium text-slate-500 mt-0.5 italic">(Ký, ghi rõ họ tên, đóng dấu)</p>
                  <div className="h-20" />
                  <p className="font-bold underline uppercase mt-4">{approverTitle.toUpperCase()}</p>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* ==================== PAGE 2: LOG DETAILED LISTINGS TABLE (If Toggled) ==================== */}
        {includeLogsTable && (
          <div 
            className={`bg-white text-black shadow-2xl p-[18mm] max-w-[210mm] w-full min-h-[297mm] mx-auto relative print:shadow-none print:p-0 print:border-none rounded-xs select-text overflow-hidden page-break-before ${
              isSerif ? "font-serif" : "font-sans"
            }`}
            style={{ fontFamily: isSerif ? '"Times New Roman", Times, serif' : 'Inter, sans-serif' }}
          >
            {/* Watermark for Page 2 */}
            {watermarkType !== "none" && (
              <div 
                className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden z-0" 
                style={{ opacity: watermarkOpacity / 100 }}
              >
                {watermarkType === "seal" ? (
                  // Circular Vietnamese state seal-like layout
                  <div className="w-[380px] h-[380px] rounded-full border-[4px] border-double border-red-600 flex items-center justify-center rotate-[-15deg] p-6 relative">
                    <div className="absolute inset-2 rounded-full border border-red-600 border-dashed" />
                    
                    <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full fill-red-600 font-black">
                      <path id="previewCrestPath2" d="M 200,200 m -160,0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0" fill="none" />
                      <text className="text-[12px] font-bold uppercase tracking-[11px] fill-red-600">
                        <textPath href="#previewCrestPath2" startOffset="50%" textAnchor="middle">
                          ★ {agencyName.toUpperCase()} ★ CHÍNH THỨC
                        </textPath>
                      </text>
                    </svg>

                    <div className="text-center space-y-1">
                      <span className="text-red-600 text-6xl font-black block leading-none select-none">★</span>
                      <span className="text-red-600 text-[11pt] font-extrabold uppercase block tracking-wider leading-relaxed select-none">BÁO CÁO</span>
                      <span className="text-[7pt] text-red-600 font-bold block select-none uppercase tracking-widest">{printDateString}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rotate-[-32deg] text-red-600 font-extrabold text-[42pt] tracking-[10px] uppercase whitespace-nowrap opacity-70">
                    {agencyName.substring(0, 15)} BÁO CÁO
                  </div>
                )}
              </div>
            )}

            <div className="relative z-10 space-y-4">
              <h3 className="text-[11.5pt] font-bold uppercase underline text-black m-0 p-0 tracking-tight">
                III. DANH SÁCH BẢNG KÊ QUẢN LÝ ĐẦU VIỆC CHI TIẾT
              </h3>
              <p className="text-[10pt] leading-normal m-0 text-slate-800">
                Thống kê chi tiết từng danh mục tác nghiệp kỹ lưỡng, đã cập nhật hành vi đo lường trạng thái, mức độ khẩn cấp và tiến trình bám đuổi của mỗi cán bộ ghi chép:
              </p>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-black text-[9pt] leading-tight">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold">
                      <th className="border border-black p-2 text-center w-[5%]">STT</th>
                      <th className="border border-black p-2 text-center w-[12%]">Ngày ghi nhận</th>
                      <th className="border border-black p-2 w-[18%]">Phân loại</th>
                      <th className="border border-black p-2 w-[35%]">Nội dung công việc</th>
                      <th className="border border-black p-2 text-center w-[15%]">Chỉ tiêu tiến trình</th>
                      <th className="border border-black p-2 text-center w-[15%]">Độ khẩn / Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length > 0 ? (
                      logs.map((log, index) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="border border-black p-1.5 text-center font-mono">{index + 1}</td>
                          <td className="border border-black p-1.5 text-center font-mono">
                            {log.date.split("-").reverse().join("/")}
                          </td>
                          <td className="border border-black p-1.5 font-medium">{log.category}</td>
                          <td className="border border-black p-1.5">
                            <p className="font-bold m-0 text-[9pt] leading-normal">{log.content}</p>
                            {log.notes && (
                              <p className="m-0 text-[8pt] text-slate-600 leading-normal italic mt-0.5">Ghi chú: {log.notes}</p>
                            )}
                          </td>
                          <td className="border border-black p-1.5 text-slate-800 text-[8pt]">
                            {log.plannedProgress || "Chưa thiết lập"}
                          </td>
                          <td className="border border-black p-1.5 text-center">
                            <span className="block font-bold text-[8pt] leading-none mb-1">
                              {log.priority}
                            </span>
                            <span className="text-[7.5pt] text-slate-600 block italic leading-none">
                              {log.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="border border-black p-4 text-center text-slate-500 italic">
                          Không tìm thấy nhật ký công vụ nào trong hệ thống.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Administrative signatures on the second page */}
              <div className="pt-8 grid grid-cols-2 text-center text-[10pt] leading-normal page-break-inside-avoid">
                <div>
                  <p className="font-bold uppercase m-0">NGƯỜI LẬP BIỂU</p>
                  <p className="text-[9pt] font-medium text-slate-500 mt-0.5 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-20" />
                  <p className="font-bold underline uppercase mt-4">PHẠM VĂN MINH</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-slate-900 m-0">KHÁNH PHÊ DUYỆT BÁO CÁO</p>
                  <p className="text-[9pt] font-medium text-slate-500 mt-0.5 italic">(Ký, ghi rõ họ tên, đóng dấu)</p>
                  <div className="h-20" />
                  <p className="font-bold underline uppercase mt-4">{approverTitle.toUpperCase()}</p>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
