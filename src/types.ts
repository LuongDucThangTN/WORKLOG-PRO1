export interface WorkLog {
  id: string; // Firebase doc ID
  userId: string;
  date: string; // YYYY-MM-DD
  category: string;
  priority: "Thấp" | "Trung bình" | "Cao" | "Khẩn";
  status: "Đang thực hiện" | "Hoàn thành" | "Chờ phối hợp" | "Tạm dừng";
  dueDate: string; // YYYY-MM-DD
  content: string;
  plannedProgress: string;
  resultText: string;
  nextPlan: string;
  notes: string;
  attachments: string[]; // List of file names/paths
  createdAt: string;
  updatedAt: string;
}

export interface Stats {
  totalEntries: number;
  uniqueDays: number;
  doneEntries: number;
  carryingEntries: number;
  overdueEntries: number;
  dueSoonEntries: number;
  highPriorityEntries: number;
  categoriesCount: Record<string, number>;
  statusCount: Record<string, number>;
}

export interface FilterState {
  start: string;
  end: string;
  keyword: string;
  category: string;
  status: string;
  priority: string;
  dueScope: string;
}

export const CATEGORY_OPTIONS = [
  "Nghiệp vụ Hành chính",
  "Dự án & Triển khai",
  "Đào tạo & Phát triển",
  "Báo cáo tổng hợp",
  "Hội họp & Sự kiện",
  "Rà soát hồ sơ",
  "Nghiên cứu chuyên môn",
  "Phối hợp tác nghiệp",
  "Giải quyết sự vụ",
  "Hoạt động hỗ trợ khác",
];

export const PRIORITY_OPTIONS = ["Thấp", "Trung bình", "Cao", "Khẩn"] as const;

export const STATUS_OPTIONS = [
  "Đang thực hiện",
  "Hoàn thành",
  "Chờ phối hợp",
  "Tạm dừng",
] as const;

export const DUE_SCOPE_OPTIONS = [
  "Tất cả",
  "Quá hạn",
  "Đến hạn hôm nay",
  "Sắp đến hạn 7 ngày",
  "Chưa đặt hạn",
];
