import React, { useState, useEffect } from "react";
import { Sparkles, Printer, Copy, RotateCcw, HelpCircle, Loader2, Calendar } from "lucide-react";
import { toDisplayDate } from "../utils";

import { WorkLog } from "../types";

interface AIReportTabProps {
  logs: WorkLog[];
  filterStart: string;
  filterEnd: string;
}

export default function AIReportTab({ logs, filterStart, filterEnd }: AIReportTabProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [rangeType, setRangeType] = useState("Tháng này");
  const [formatStyle, setFormatStyle] = useState("Trang trọng (Hành chính)");
  const [reportText, setReportText] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const rangeTypes = ["Hôm nay", "Tuần này", "Tháng này", "Quý này", "Năm này", "Tự chọn"];
  const formatStyles = [
    "Trang trọng (Hành chính)",
    "Tổng kết đánh giá sâu sắc",
    "Ngắn gọn khách quan (Bullet points)",
    "Động viên khích lệ, hướng giải pháp"
  ];

  // Sync date suggestions when filters update
  useEffect(() => {
    setStart(filterStart);
    setEnd(filterEnd);
  }, [filterStart, filterEnd]);

  // Loading indicator messages carousel
  const loadingSteps = [
    "Đang nạp các dòng nhật ký trong cơ sở dữ liệu...",
    "Đang trích hóa các chỉ tiêu và kết quả đã thu hoạch...",
    "Đang phân tích các đầu việc trễ hạn và rủi ro chậm tiến độ...",
    "Gemini AI đang tổ chức bố cục hành văn chuẩn mực hành chính...",
    "Đang trau chuốt ngôn từ sắc sảo và bố cục bảng số liệu..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      let step = 0;
      setLoadingMessage(loadingSteps[0]);
      interval = setInterval(() => {
        step = (step + 1) % loadingSteps.length;
        setLoadingMessage(loadingSteps[step]);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Call Server-side API to compile report
  const generateReport = async () => {
    setLoading(true);
    setReportText("");
    try {
      const response = await fetch("/api/ai/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start,
          end,
          rangeType,
          formatStyle,
          logs
        })
      });

      if (!response.ok) {
        throw new Error("Lỗi khi kết nối dịch vụ biên soạn báo cáo.");
      }

      const data = await response.json();
      setReportText(data.report || "");
    } catch (e: any) {
      setReportText(`❌ Không thể lập báo cáo: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(reportText);
    setCopyStatus("Đã sao chép thành công!");
    setTimeout(() => setCopyStatus(""), 2000);
  };

  // Print report
  const handlePrint = () => {
    window.print();
  };

  // Ultra-robust, inline React markdown custom renderer
  const renderBeautifulDocument = (markdown: string) => {
    if (!markdown) return null;

    const lines = markdown.split("\n");
    return lines.map((line, idx) => {
      const trimLine = line.trim();

      // Heading 1 (#)
      if (trimLine.startsWith("# ")) {
        return (
          <h1 key={idx} className="text-xl font-extrabold text-slate-900 border-b border-slate-200 pb-2.5 mb-5 mt-6 first:mt-0 text-center tracking-wide uppercase leading-normal">
            {trimLine.substring(2)}
          </h1>
        );
      }
      // Heading 2 (##)
      if (trimLine.startsWith("## ")) {
        return (
          <h2 key={idx} className="text-base font-extrabold text-sky-800 dark:text-sky-400 border-l-4 border-sky-500 pl-3 mb-4 mt-6">
            {trimLine.substring(3)}
          </h2>
        );
      }
      // Heading 3 (###)
      if (trimLine.startsWith("### ")) {
        return (
          <h3 key={idx} className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 mt-5">
            {trimLine.substring(4)}
          </h3>
        );
      }
      // Bullet points
      if (trimLine.startsWith("- ") || trimLine.startsWith("* ")) {
        const text = trimLine.substring(2);
        // Render bold subparts within bullet point
        return (
          <li key={idx} className="text-xs text-slate-700 leading-relaxed ml-5 list-disc mb-2">
            {renderBoldInline(text)}
          </li>
        );
      }
      // Blockquotes
      if (trimLine.startsWith("> ")) {
        return (
          <blockquote key={idx} className="bg-slate-50 dark:bg-slate-900/30 border-l-4 border-slate-350 dark:border-slate-700 pl-4 py-2 pr-3 my-4 italic text-slate-650 dark:text-slate-400 text-xs">
            {trimLine.substring(2)}
          </blockquote>
        );
      }
      // Programmatic separator
      if (trimLine === "---") {
        return <hr key={idx} className="border-slate-200 dark:border-slate-800 my-6" />;
      }
      // Plain paragraphs with potential inline bold text
      if (trimLine) {
        return (
          <p key={idx} className="text-xs text-slate-700 leading-relaxed mb-3.5 font-medium">
            {renderBoldInline(trimLine)}
          </p>
        );
      }
      return <div key={idx} className="h-2"></div>;
    });
  };

  // Helper to highlight markdown bold phrases (**text**) in Vietnamese safely
  const renderBoldInline = (text: string) => {
    const parts = text.split("**");
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-extrabold text-slate-900 text-xs">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-sky-500 animate-pulse" />
            <span>Biên Soạn Báo Cáo Thông Minh (Gemini AI)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tổng hợp toàn diện các đầu việc đã triển khai trong kỳ thành văn bản hành chính chỉn chu chỉ trong vài giây.
          </p>
        </div>
      </div>

      {/* Grid controllers & action results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Options Controller form */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs border-b border-slate-100 dark:border-slate-800 pb-2 uppercase tracking-wider">
            Cấu hình Kỳ Báo Cáo
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Chọn khoảng thời gian
            </label>
            <select
              value={rangeType}
              onChange={(e) => setRangeType(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              {rangeTypes.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Từ ngày
              </label>
              <input
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                Đến ngày
              </label>
              <input
                type="date"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-850 px-2 py-1.5 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
              Phong cách soạn thảo văn bản
            </label>
            <select
              value={formatStyle}
              onChange={(e) => setFormatStyle(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              {formatStyles.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <button
            onClick={generateReport}
            disabled={loading}
            className="w-full bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang Biên soạn Báo cáo...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Biên soạn Báo cáo (AI)</span>
              </>
            )}
          </button>
        </div>

        {/* Right Report Paper View */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {loading && (
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-150 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
              <div className="space-y-1">
                <p className="font-extrabold text-sm text-slate-850 dark:text-slate-200">Đang tổng kết dữ liệu nhật ghi</p>
                <p className="text-xs text-slate-500 italic max-w-sm animate-pulse">{loadingMessage}</p>
              </div>
            </div>
          )}

          {!loading && !reportText && (
            <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-150 dark:border-slate-800 p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[400px]">
              <Sparkles className="w-12 h-12 text-slate-200 dark:text-slate-800 animate-bounce" />
              <div>
                <p className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Sẵn sàng lập báo cáo tự động</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mx-auto">
                  Vui lòng kiểm tra khoảng thời gian và phong cách viết sau đó nhấn nút "Biên soạn Báo cáo (AI)".
                </p>
              </div>
            </div>
          )}

          {!loading && reportText && (
            <div className="space-y-3">
              {/* Paper Actions toolbar */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800 px-4 py-2.5 rounded-xl flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                  Văn bản đã lập thành công
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="p-1 px-3 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg flex items-center space-x-1.5 font-semibold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Sao chép</span>
                  </button>
                  <button
                    onClick={handlePrint}
                    className="p-1 px-3 text-xs bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/60 text-sky-600 dark:text-sky-400 rounded-lg flex items-center space-x-1.5 font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>In / Lưu PDF</span>
                  </button>
                </div>
              </div>

              {copyStatus && (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/50 p-2 text-center text-xs font-bold rounded-lg animate-fade-in">
                  {copyStatus}
                </div>
              )}

              {/* Styled Paper Board */}
              <div id="printable-area" className="bg-white dark:bg-[#111827] border border-slate-150 dark:border-slate-800 p-8 md:p-12 rounded-xl shadow-xs min-h-[500px]">
                {/* Visual Official Vietnamese Seal Block */}
                <div className="flex justify-between items-start text-center mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                  <div className="text-[10px] text-slate-400 font-bold uppercase select-none">
                    Cơ quan công tác<br />
                    Tài liệu lưu hành nội bộ
                  </div>
                  <div className="text-center font-bold tracking-wide">
                    <span className="text-xs uppercase block text-slate-800 dark:text-slate-200">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</span>
                    <span className="text-[10px] italic block text-slate-500 mt-0.5">Độc lập - Tự do - Hạnh phúc</span>
                    <span className="text-slate-400 block mt-1 scale-x-50">━━━━━━</span>
                  </div>
                </div>

                <div className="prose dark:prose-invert max-w-none">
                  {renderBeautifulDocument(reportText)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
