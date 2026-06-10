import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "logs.json");

// Ensure db directory and file exist
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf-8");
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper to read database
function readLogs(): any[] {
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return [];
  }
}

// Helper to write database
function writeLogs(logs: any[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(logs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database:", error);
  }
}

// Lazy Gemini API client initialization
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey === "") {
    console.warn("GEMINI_API_KEY is not configured or placeholder. Gemini AI services will fallback to smart heuristics.");
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// --- API ROUTES ---

// 1. Gemini AI Quick Suggestion for targets and results
app.post("/api/ai/suggest", async (req, res) => {
  try {
    const { title, fieldType } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required for suggestion." });
    }

    const ai = getAIClient();
    if (!ai) {
      // Fallback heuristics based on typical patterns if no API key
      let suggestion = "Hoàn thành các nội dung công việc đề ra đúng tiến độ, đảm bảo chất lượng và yêu cầu.";
      if (fieldType === "target") {
        suggestion = "Hoàn tất đúng tiến độ, đáp ứng các yêu cầu cơ bản được giao.";
      } else if (fieldType === "result") {
        suggestion = "Đã thực hiện xong các bước cơ bản. Đang chờ phản hồi hoặc nghiệm thu kết quả.";
      }
      return res.json({ suggestion, isAiGenerated: false });
    }

    let prompt = "";
    if (fieldType === "target") {
      prompt = `Bạn là một chuyên viên văn phòng tại Việt Nam. Dựa vào nội dung công việc: "${title}", hãy gợi ý NGẮN GỌN (1-2 câu) về CHỈ TIÊU ĐẶT RA (kế hoạch, mục tiêu cần đạt được đối với công việc này). Không dùng ngôn ngữ quá hoa mỹ, hãy dùng câu văn nghiêm túc, chuyên nghiệp nơi công sở. (Trả về văn bản thuần túy, không có thẻ markdown hay tiêu đề).`;
    } else {
      prompt = `Bạn là một chuyên viên văn phòng tại Việt Nam. Dựa vào nội dung công việc: "${title}", hãy gợi ý NGẮN GỌN (1-2 câu) về KẾT QUẢ ĐẠT ĐƯỢC (kết quả thực tế sau khi đã thực hiện công việc này). Không dùng ngôn ngữ quá hoa mỹ, hãy dùng câu văn nghiêm túc, chuyên nghiệp nơi công sở. (Trả về văn bản thuần túy, không có thẻ markdown hay tiêu đề).`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ suggestion: response.text?.trim() || "", isAiGenerated: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Gemini AI compiled and synthesized report generator
app.post("/api/ai/report", async (req, res) => {
  try {
    const { start, end, rangeType, formatStyle, logs } = req.body;
    
    // Validate logs were provided
    if (!logs || !Array.isArray(logs)) {
      return res.status(400).json({ error: "Cần cung cấp dữ liệu nhật ký (logs) để tạo báo cáo." });
    }

    let filteredLogs = [...logs];

    // Filter logs inside specified date range or use last 30 logs if none specified
    if (start) filteredLogs = filteredLogs.filter(log => log.date >= start);
    if (end) filteredLogs = filteredLogs.filter(log => log.date <= end);

    // Sort logs chronologically to help Gemini write reports sequentially
    filteredLogs.sort((a,b) => (a.date || "").localeCompare(b.date || ""));

    const totalLogs = filteredLogs.length;
    const doneLogs = filteredLogs.filter(l => l.status === "Hoàn thành").length;
    const ongoingLogs = filteredLogs.filter(l => l.status === "Đang thực hiện").length;
    const pendingLogs = filteredLogs.filter(l => l.status === "Chờ phối hợp").length;
    const pausedLogs = filteredLogs.filter(l => l.status === "Tạm dừng").length;

    const dataSnapshotSummary = `
TổNG QUAN Dữ LIệU TRONG KỲ (${start || 'Bắt đầu'} và ${end || 'Kết thúc'}):
- Khoảng thời gian: ${rangeType || 'Tự chọn'}
- Tổng số công việc ghi nhận: ${totalLogs}
- Đã hoàn thành: ${doneLogs}
- Đang tiến hành: ${ongoingLogs}
- Chờ phối hợp: ${pendingLogs}
- Tạm dừng/Theo dõi thêm: ${pausedLogs}

CHI TIếT DANH SÁCH CÔNG VIệC:
${filteredLogs.map((l, i) => `[${i+1}] Ngày: ${l.date} - Nhóm: ${l.category} - Ưu tiên: ${l.priority} - Trạng thái: ${l.status}
  + Nội dung: ${l.content}
  + Kế hoạch đề ra: ${l.plannedProgress || "N/A"}
  + Kết quả đạt được: ${l.resultText || "N/A"}
  + Kế hoạch tiếp theo: ${l.nextPlan || "N/A"}
  + Hạn hoàn thành: ${l.dueDate || "Không gia hạn"}
  + Ghi chú: ${l.notes || "Không"}`).join("\n\n")}
`;

    const ai = getAIClient();

    if (!ai) {
      // Fallback heuristics: Create a beautiful synthesized programmatic markdown report
      const fallbackReport = `### 🌟 BÁO CÁO TỔNG HỢP CÔNG TÁC (Tự động biên soạn)
*Hệ thống tạm thời chạy ở chế độ Heuristic do chưa kết nối mã khóa Gemini API key.*

#### I. Đánh giá chung kỳ công tác (${rangeType || 'Tự chọn'})
Kỳ báo cáo từ **${start || 'Đầu kỳ'}** đến **${end || 'Cuối kỳ'}** ghi nhận tổng cộng **${totalLogs}** đầu mục công việc được theo dõi trong hệ thống:
- **Tỷ lệ hoàn thành công việc đạt ${(totalLogs > 0 ? (doneLogs / totalLogs * 100).toFixed(1) : 0)}%** (hoàn thành **${doneLogs}** trên tổng số **${totalLogs}** việc).
- Hiện tại còn **${ongoingLogs}** việc đang trực tiếp xử lý, **${pendingLogs}** việc chờ phối hợp liên phòng ban và phòng chức năng, **${pausedLogs}** việc tạm thời lưu hoặc dừng theo dõi.

#### II. Các nội dung trọng tâm đã triển khai
Dựa trên ghi chép thực tế các ngày qua, các công tác đã tập trung hoàn thành nổi bật bao gồm:
${filteredLogs.filter(l => l.status === "Hoàn thành").slice(-5).map(l => `- **${l.category}** (${l.date}): ${l.content}. Kết quả: *${l.resultText || "Đã đạt yêu cầu đề ra"}*.`).join("\n") || "- (Chưa ghi nhận hoặc chưa có công việc nào đổi trạng thái hoàn thành)"}

#### III. Khó khăn, tồn đọng và đề xuất tiếp theo
1. **Các việc cần tập trung xử lý gấp/đến hạn hoặc quá hạn:**
${filteredLogs.filter(l => l.status !== "Hoàn thành" && l.priority === "Khẩn").map(l => `- 🔴 **Khẩn/Hạn chế:** ${l.content} (Hạn: ${l.dueDate || "Chưa đặt"}).`).join("\n") || "- Không có công việc khẩn tồn đọng."}
2. **Kế hoạch hành động kỳ tiếp theo:**
${filteredLogs.filter(l => l.status !== "Hoàn thành" && l.nextPlan).slice(0, 5).map(l => `- Tập trung thực hiện kế hoạch cho việc: *${l.content}*. Biện pháp đề ra: *${l.nextPlan}*.`).join("\n") || "- Tiếp tục triển khai toàn bộ các tiến độ thường niên ổn định."}

*Mẹo: Hãy cấu hình bảo mật mã khóa GEMINI_API_KEY ở Settings (Secrets) góc trên của AI Studio để mở khóa tính năng viết báo cáo phân tích AI chuyên nghiệp, tự động phát hiện rủi ro và đánh giá tối ưu hơn!*`;

      return res.json({ report: fallbackReport, isAiGenerated: false });
    }

    // AI compilation using GenAI model 'gemini-3.5-flash'
    const prompt = `Bạn là một trợ lý quản lý công việc hành chính và báo cáo chuyên nghiệp tại Việt Nam.
Hãy dịch vụ soạn thảo một báo cáo tổng hợp tiến độ và hiệu suất công việc cực kỳ chi tiết, mạch lạc, hành văn trang trọng, chuẩn mực công sở Việt Nam.
Báo cáo dựa trên dữ liệu nhật ký thực tế được liệt kê dưới đây.

Định dạng văn bản: Hãy viết bằng Markdown, phân chia tiêu đề lớn nhỏ rõ ràng, sử dụng bảng thống kê, các ký hiệu biểu tượng (bullet, emoji) tinh tế, chuyên nghiệp và có mục lục hành động chi tiết.

Thông tin cấu hình báo cáo:
- Loại kỳ báo cáo: ${rangeType || 'Tự chọn'}
- Phong cách soạn thảo: ${formatStyle || 'Trang trọng'}

Thông tin dữ liệu:
${dataSnapshotSummary}

Cấu trúc báo cáo yêu cầu bao gồm:
1. TIÊU ĐỀ: BÁO CÁO DIỄN BIẾN & HIỆU SUẤT CÔNG TÁC (${rangeType || 'KỲ BÁO CÁO'})
2. TÓM TẮT ĐIỀU HÀNH: Nhận xét tổng quan về tiến độ và kết quả công việc đạt được (vẽ bảng số liệu trực quan bằng Markdown). Đánh giá tỷ lệ hoàn thành thực tế một cách ngắn gọn, khích lệ hoặc chỉ rõ hạn chế.
3. CÁC KẾT QUẢ NỔI BẬT ĐÃ ĐẠT ĐƯỢC: Tổng hợp thông minh theo nhóm công việc (Category), trích xuất các thành quả công tác nổi bật (những việc có trạng thái "Hoàn thành" kèm kết quả thực tế).
4. KHÓ KHĂN, RỦI RO & KHU VỰC CẦN LƯU Ý: Phân tích nhanh tiến độ còn tồn đọng (đang thực hiện lâu, chờ phối hợp, hoặc đã quá hạn). Nhấn mạnh các đầu việc ưu tiên cao/khẩn cần tháo gỡ.
5. PHƯƠNG HƯỚNG VÀ KẾ HOẠCH HÀNH ĐỘNG KỲ TỚI: Đề xuất các bước thực hiện tiếp theo dựa trên cột "kế hoạch tiếp theo" từ dữ liệu một cách logic và phân công nhiệm vụ cụ thể để bám sát thời hạn.

Hãy viết tự nhiên, lưu loát tiếng Việt, không lặp lại nguyên văn mà hãy tổng hợp, phân tích xu hướng để cấp trên có cái nhìn sâu sắc nhất về năng lực làm việc.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    res.json({ report: response.text, isAiGenerated: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// --- VITE AND STATIC SERVING WITH COLD START ENHANCEMENTS ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite middleware in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WorkLog Full-Stack] Server running on http://localhost:${PORT} in ${process.env.NODE_ENV || "development"} mode.`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start development/production server:", err);
});
