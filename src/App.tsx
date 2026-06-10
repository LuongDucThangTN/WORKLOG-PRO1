import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Sidebar, { ThemePreference } from "./components/Sidebar";
import DashboardTab from "./components/DashboardTab";
import CalendarTab from "./components/CalendarTab";
import LogForm from "./components/LogForm";
import LogsTable from "./components/LogsTable";
import AIReportTab from "./components/AIReportTab";
import KanbanTab from "./components/KanbanTab";
import AdminPanelTab from "./components/AdminPanelTab";
import { WorkLog, Stats, FilterState, CATEGORY_OPTIONS } from "./types";
import { getPeriodBounds, toDisplayDate, getCategoryColor } from "./utils";
import {
  Plus,
  Trash2,
  Download,
  Upload,
  BookOpen,
  Search,
  RefreshCw,
  Settings,
  Sparkles,
  Building,
  UserCheck,
  Calendar,
  Layers,
  FileDown,
  Bell,
  BellRing,
  Volume2,
  X,
  Eye,
  CheckCircle2,
  Clock,
  Circle,
  HelpCircle,
  AlertTriangle,
  Info,
  Menu,
  Camera,
  Globe,
  Link,
  Image,
  LogOut
} from "lucide-react";
import { useFirebaseApp } from "./firebaseHooks";
import { loginWithGoogle, logout } from "./firebase";

export default function App() {
  const [activeTab, setActiveTab] = useState("logs");
  const [isZenMode, setIsZenMode] = useState(false);
  const [isSidebarCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [themePref, setThemePref] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem("worklog_theme_pref") as ThemePreference;
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
    return "system";
  });

  const [darkTheme, setDarkTheme] = useState(true);

  // Core Data States from Firebase
  const {
    user,
    isAdmin,
    adminView,
    setAdminView,
    isAuthLoading,
    logs,
    stats,
    isLoadingLogs,
    handleSaveLog: fbSaveLog,
    handleUpdateLogStatus: fbUpdateLogStatus,
    handleDeleteLog: fbDeleteLog,
    handleDuplicateLog: fbDuplicateLog,
    handleClearDatabase: fbClearDatabase,
    syncImportedLogs
  } = useFirebaseApp();

  // Edit states
  const [editLog, setEditLog] = useState<WorkLog | null>(null);
  const [prefilledNewLogDate, setPrefilledNewLogDate] = useState<string | null>(
    null,
  );
  const [isLogFormDirty, setIsLogFormDirty] = useState(false);

  // Custom dialog/alert/confirm state
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: "alert" | "confirm";
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    type: "alert",
  });

  const showCustomAlert = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: "alert",
    });
  };

  const showCustomConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      type: "confirm",
      onConfirm,
    });
  };

  // Handle tab change with confirmation if form is dirty
  const handleTabChange = (tab: string) => {
    if (activeTab === "logs" && isLogFormDirty && tab !== "logs") {
      showCustomConfirm(
        "Nhập liệu chưa lưu",
        "Dữ liệu công việc đang nhập chưa được lưu. Bạn có chắc chắn muốn đổi trang và làm mất các thay đổi này không?",
        () => {
          setIsLogFormDirty(false); // Reset dirty so they can switch
          setActiveTab(tab);
        },
      );
      return;
    }
    setActiveTab(tab);
  };

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    start: "",
    end: "",
    keyword: "",
    category: "Tất cả",
    status: "Tất cả",
    priority: "Tất cả",
    dueScope: "Tất cả",
  });

  // Enterprise/Agency Configuration States (localStorage cached)
  const [agencyName, setAgencyName] = useState(
    () =>
      localStorage.getItem("worklog_agency") || "Văn phòng Cơ quan Sở Nội Vụ",
  );
  const [approverTitle, setApproverTitle] = useState(
    () =>
      localStorage.getItem("worklog_approver") ||
      "Giám đốc Sở - Lương Đức Thắng",
  );
  const [agencyLogo, setAgencyLogo] = useState(
    () => localStorage.getItem("worklog_agency_logo") || "",
  );

  // User Configuration States
  const [userName, setUserName] = useState(
    () => localStorage.getItem("worklog_user_name") || "Nhân viên viên chức",
  );
  const [userAvatar, setUserAvatar] = useState(
    () => localStorage.getItem("worklog_user_avatar") || "",
  );

  // Notification configuration states
  const [enableNotifications, setEnableNotifications] = useState(() => {
    return localStorage.getItem("worklog_notif_enabled") !== "false";
  });

  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | "unsupported"
  >(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "unsupported";
  });

  const [toasts, setToasts] = useState<
    Array<{
      id: string;
      title: string;
      message: string;
      type: "overdue" | "dueSoon";
      log: WorkLog;
    }>
  >([]);

  const [notifiedTaskIds, setNotifiedTaskIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedLogDetails, setSelectedLogDetails] = useState<WorkLog | null>(
    null,
  );

  // Sync theme based on preference and system
  useEffect(() => {
    let activeDark = themePref === "dark";
    if (
      themePref === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia
    ) {
      activeDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }

    setDarkTheme(activeDark);

    const root = window.document.documentElement;
    if (activeDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("worklog_theme_pref", themePref);
  }, [themePref]);

  // Synchronize with system prefers-color-scheme setting of the browser if in system mode
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (themePref === "system") {
        setDarkTheme(e.matches);
        const root = window.document.documentElement;
        if (e.matches) root.classList.add("dark");
        else root.classList.remove("dark");
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
    } else {
      // @ts-ignore - Support for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
      } else {
        // @ts-ignore - Support for older browsers
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [themePref]);

  // Read Agency settings
  const handleSaveAgency = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("worklog_agency", agencyName);
    localStorage.setItem("worklog_approver", approverTitle);
    localStorage.setItem("worklog_user_name", userName);
    localStorage.setItem("worklog_user_avatar", userAvatar);
    showCustomAlert(
      "Thao tác thành công",
      "Đã lưu thiết lập thông tin cơ quan, người duyệt và người dùng!",
    );
  };

  const resizeAndSetAvatar = (url: string) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 150;
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const size = Math.min(img.width, img.height);
          const x = (img.width - size) / 2;
          const y = (img.height - size) / 2;
          ctx.drawImage(img, x, y, size, size, 0, 0, MAX_SIZE, MAX_SIZE);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
          setUserAvatar(dataUrl);
        }
      } catch (err) {
        console.warn("Could not resize image due to CORS restrictions:", err);
        // If it fails due to CORS, retain the original URL so the image can still be displayed
      }
    };
    img.src = url;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUserAvatar(value);
    
    if (value.startsWith("http") || value.startsWith("data:")) {
      resizeAndSetAvatar(value);
    }
  };

  const handleAvatarPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resizeAndSetAvatar(event.target.result as string);
            }
          };
          reader.readAsDataURL(blob);
          e.preventDefault();
          return;
        }
      }
    }
  };

  // Camera & Image URL logo loaders states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Turn off camera when active tab changes or on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: "user" },
      });
      streamRef.current = stream;
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error("Lỗi khởi tạo camera:", err);
      setCameraError(
        "Không thể truy cập camera: " +
          (err.message || "Hãy cấp quyền thiết bị camera."),
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 300;
      canvas.height = video.videoHeight || 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL("image/png");
          setAgencyLogo(dataUrl);
          localStorage.setItem("worklog_agency_logo", dataUrl);
          showCustomAlert(
            "Thao tác thành công",
            "Đã chụp ảnh và thiết lập logo đơn vị mới!",
          );
        } catch (err: any) {
          showCustomAlert(
            "Lỗi lưu trữ",
            "Không thể xuất ảnh từ camera: " + err.message,
          );
        }
      }
      stopCamera();
    }
  };

  const handleLoadLogoFromUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logoUrlInput.trim()) {
      showCustomAlert("Dữ liệu trống", "Vui lòng nhập URL hình ảnh hợp lệ.");
      return;
    }
    if (
      !logoUrlInput.startsWith("http://") &&
      !logoUrlInput.startsWith("https://") &&
      !logoUrlInput.startsWith("data:image/")
    ) {
      showCustomAlert(
        "URL không hợp lệ",
        "Đường dẫn hình ảnh phải bắt đầu bằng http://, https:// hoặc định dạng data:image/",
      );
      return;
    }
    setAgencyLogo(logoUrlInput);
    localStorage.setItem("worklog_agency_logo", logoUrlInput);
    setLogoUrlInput("");
    showCustomAlert("Thao tác thành công", "Đã cập nhật logo đơn vị từ URL!");
  };

  const handleClearLogo = () => {
    showCustomConfirm(
      "Xác nhận xóa logo",
      "Bạn có chắc chắn muốn xóa logo đơn vị hiện tại hay không? Thống kê báo cáo in ấn sẽ không còn hiển thị logo này.",
      () => {
        setAgencyLogo("");
        localStorage.removeItem("worklog_agency_logo");
        showCustomAlert(
          "Thao tác thành công",
          "Đã xóa cấu hình logo đơn vị thành công.",
        );
      },
    );
  };

  // Notification engine helpers
  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        return permission;
      } catch (err) {
        console.warn("Lỗi yêu cầu quyền Notification:", err);
        return "default" as NotificationPermission;
      }
    }
    return "unsupported" as const;
  };

  const playNotificationSound = () => {
    try {
      const AudioContext =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
      osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch (e) {
      console.warn("Lỗi phát tín hiệu âm thanh hệ thống:", e);
    }
  };

  const showSystemNotification = (
    title: string,
    message: string,
    type: "overdue" | "dueSoon",
    log: WorkLog,
  ) => {
    // 1. Play sound chime
    playNotificationSound();

    // 2. Add to In-app custom toasts
    const toastId = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id: toastId, title, message, type, log }]);

    // Auto remove after 10 seconds (enough to read)
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toastId));
    }, 10000);

    // 3. Send HTML5 Notification if supported/permitted
    if (
      enableNotifications &&
      typeof window !== "undefined" &&
      "Notification" in window
    ) {
      if (Notification.permission === "granted") {
        try {
          const notif = new Notification(title, {
            body: message,
            tag: `worklog-task-${log.id}`,
            icon: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
          });
          notif.onclick = () => {
            window.focus();
            setSelectedLogDetails(log);
          };
        } catch (err) {
          console.warn("Lỗi render thông báo hệ thống trong iframe:", err);
        }
      }
    }
  };

  const triggerTestNotification = () => {
    const mockLog: WorkLog = {
      id: "-999",
      userId: "",
      date: new Date().toISOString().split("T")[0],
      category: "Kiểm tra hệ thống",
      priority: "Khẩn",
      status: "Đang thực hiện",
      dueDate: new Date().toISOString().split("T")[0],
      content:
        "Hệ thống thông báo đã kết nối đồng bộ và sẵn sàng hỗ trợ bạn theo dõi tiến độ.",
      plannedProgress: "",
      resultText: "",
      nextPlan: "",
      notes:
        "Hoạt động cực kỳ ổn định, kết hợp cảnh báo âm thanh và pop-up in-app.",
      attachments: [],
      createdAt: "",
      updatedAt: "",
    };
    showSystemNotification(
      "🔔 THÔNG BÁO HOẠT ĐỘNG HOÀN HẢO!",
      "Hệ thống thông báo và âm thanh chime của bạn đã được khởi động thành công.",
      "dueSoon",
      mockLog,
    );
  };

  // Automated checker for upcoming and overdue work item objects
  useEffect(() => {
    if (logs.length === 0) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const today = new Date(todayStr);

    let foundNewAlert = false;
    const newNotifiedIds = new Set(notifiedTaskIds);

    logs.forEach((log) => {
      if (log.status === "Hoàn thành") return;
      if (!log.dueDate) return;

      // Ensure each ID is notified once in the session
      if (newNotifiedIds.has(log.id)) return;

      const dueDateObj = new Date(log.dueDate);
      const diffTime = dueDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        // Overdue task alert!
        newNotifiedIds.add(log.id);
        foundNewAlert = true;
        showSystemNotification(
          `⚠️ CÔNG VIỆC QUÁ HẠN! (${log.priority})`,
          `"${log.content}" đã trễ hạn từ ngày ${toDisplayDate(log.dueDate)}. Hãy cập nhật ngay trạng thái!`,
          "overdue",
          log,
        );
      } else if (diffDays === 0) {
        // Due today alert!
        newNotifiedIds.add(log.id);
        foundNewAlert = true;
        showSystemNotification(
          `⏰ CẦN HOÀN THÀNH HÔM NAY!`,
          `"${log.content}" có mốc hạn hoàn thành là ngày hôm nay. Hãy tập trung xử lý!`,
          "dueSoon",
          log,
        );
      } else if (diffDays === 1) {
        // Due tomorrow alert!
        newNotifiedIds.add(log.id);
        foundNewAlert = true;
        showSystemNotification(
          `📅 HẠN HOÀN THÀNH NGÀY MAI!`,
          `"${log.content}" chỉ còn một ngày trước mốc lập hạn (${toDisplayDate(log.dueDate)}).`,
          "dueSoon",
          log,
        );
      }
    });

    if (foundNewAlert) {
      setNotifiedTaskIds(newNotifiedIds);
    }
  }, [logs]);

  // Insert or Update Log record
  const handleSaveLog = async (logData: Partial<WorkLog>) => {
    try {
      await fbSaveLog(logData);
      setEditLog(null);
      setPrefilledNewLogDate(null);
    } catch (e: any) {
      console.error("Error saving log:", e);
      showCustomAlert(
        "Lỗi lưu nhật ký",
        e.message || "Giao dịch tác nghiệp thất bại"
      );
    }
  };

  // Toggle status shortcut (for instant checklists)
  const handleUpdateLogStatus = async (
    id: string,
    currentStatus: WorkLog["status"],
  ) => {
    try {
      await fbUpdateLogStatus(id, currentStatus);
    } catch (e) {
      console.error("Error updating status:", e);
    }
  };

  // Duplicate / Clone target logs shortcut
  const handleDuplicateLog = async (log: WorkLog) => {
    try {
      await fbDuplicateLog(log);
    } catch (e) {
      console.error("Error duplicating log:", e);
    }
  };

  // Delete Log record call
  const handleDeleteLog = async (id: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      showCustomConfirm(
        "Xác nhận xóa nhật ký",
        "Bạn chắc chắn muốn xóa vĩnh viễn dòng nhật ký này không? Thao tác này không thể hoàn tất khôi phục lại.",
        async () => {
          try {
            await fbDeleteLog(id);
            if (editLog?.id === id) setEditLog(null);
          } catch (e) {
            console.error("Error deleting log:", e);
          } finally {
            resolve();
          }
        },
      );
    });
  };

  // Quick select Period filters
  const applyPeriodFilter = (period: Parameters<typeof getPeriodBounds>[0]) => {
    const bounds = getPeriodBounds(period);
    setFilters({
      ...filters,
      start: bounds.start,
      end: bounds.end,
      dueScope: "Tất cả",
    });
  };

  // Preset Filters cleaner
  const handleResetFilters = () => {
    setFilters({
      start: "",
      end: "",
      keyword: "",
      category: "Tất cả",
      status: "Tất cả",
      priority: "Tất cả",
      dueScope: "Tất cả",
    });
  };

  // Backups and Restore Pipelines (Using Client-side Local file interactions)
  const handleExportJSONBackup = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(logs, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute(
      "download",
      `worklog_backup_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  const handleImportJSONBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;

    fileReader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!Array.isArray(parsed)) {
          showCustomAlert(
            "Định dạng tệp không chuẩn",
            "Lỗi: Tệp tin khôi phục không phải là một danh sách hợp lệ.",
          );
          return;
        }

        showCustomConfirm(
          "Thay thế / Trộn dữ liệu",
          `Thao tác này sẽ tải ${parsed.length} công việc và ghi đè bổ sung vào cơ sở dữ liệu hiện tại. Bạn có chắc chắn muốn tiếp tục?`,
          async () => {
            try {
              await syncImportedLogs(parsed);
              showCustomAlert(
                "Thao tác thành công",
                "Đã khôi phục thành công toàn bộ dữ liệu nhật ký!",
              );
            } catch (err: any) {
              showCustomAlert("Lỗi khôi phục", "Có lỗi xảy ra: " + err.message);
            }
          },
        );
      } catch (err: any) {
        showCustomAlert(
          "Giải mã tệp thất bại",
          "Lỗi phân tích cú pháp tệp tin: " + err.message,
        );
      }
    };
    fileReader.readAsText(files[0]);
  };

  // EXPORT TO EXCEL COMPATIBLE CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      showCustomAlert(
        "Thiếu dữ liệu",
        "Không có dữ liệu nhật ký nào thiết lập để xuất excel.",
      );
      return;
    }

    const headers = [
      "Ngày",
      "Nhóm công việc",
      "Nội dung mục tiêu",
      "Chi tiêu đặt ra",
      "Kết quả thực tế",
      "Kế hoạch tiếp theo",
      "Hạn hoàn thành",
      "Độ khẩn",
      "Trạng thái",
      "Ghi chú",
    ];

    const rows = logs.map((log) => [
      toDisplayDate(log.date),
      log.category,
      log.content.replace(/"/g, '""'),
      log.plannedProgress.replace(/"/g, '""'),
      log.resultText.replace(/"/g, '""'),
      log.nextPlan.replace(/"/g, '""'),
      log.dueDate ? toDisplayDate(log.dueDate) : "",
      log.priority,
      log.status,
      log.notes.replace(/"/g, '""'),
    ]);

    // UTF-8 BOM helps MS Excel open CSV files with Vietnamese diacritics directly
    const csvContent =
      "\uFEFF" +
      [
        headers.join(","),
        ...rows.map((e) => e.map((val) => `"${val}"`).join(",")),
      ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Bảng_nhật_ký_công_tác_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Quick reset database call
  const handleClearDatabase = () => {
    showCustomConfirm(
      "⚠️ CẢNH BÁO NGUY HIỂM",
      "Bạn có chắc chắn muốn xóa SẠCH cơ sở dữ liệu nhật ký của hệ thống? Thao tác này KHÔNG THỂ khôi phục vụ lòng liên hệ quản trị.",
      () => {
        showCustomConfirm(
          "⚠️ BƯỚC XÁC NHẬN CUỐI CÙNG",
          "Việc này sẽ xóa vĩnh viễn tất cả công việc hiện có. Đồng ý thực hiện?",
          async () => {
            try {
              await fbClearDatabase();
              showCustomAlert(
                "Cơ sở dữ liệu rỗng",
                "Đã xóa dọn toàn bộ dữ liệu nhật ký hệ thống!",
              );
            } catch (e) {
              console.error(e);
            }
          },
        );
      },
    );
  };

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <RefreshCw className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
        <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6">
          <h1 className="text-2xl font-black text-slate-850 dark:text-slate-100">Hệ Thống Nhật Ký</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Đăng nhập để xem và quản lý công việc của bạn.</p>
          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-sky-600 dark:hover:bg-sky-500 py-3 rounded-xl transition-colors font-medium shadow-sm cursor-pointer"
          >
            <Globe className="w-5 h-5" />
            <span>Đăng nhập bằng Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300 relative overflow-hidden">
      {/* ZenMode Shared Backdrop Overlay */}
      <AnimatePresence>
        {isZenMode && (
          <motion.div
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
            animate={{ opacity: 1, backdropFilter: "blur(12px)" }}
            exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[5] pointer-events-none bg-slate-100/60 dark:bg-slate-900/60 print:hidden"
          />
        )}
      </AnimatePresence>

      {/* 1. Sidebar Nav */}
      <AnimatePresence initial={false}>
        {!isZenMode && (
          <motion.div
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: "auto", opacity: 1, x: 0 }}
            exit={{
              width: 0,
              opacity: 0,
              x: -20,
              transition: { duration: 0.2 },
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="shrink-0 relative z-10"
          >
            <Sidebar
              activeTab={activeTab}
              setActiveTab={handleTabChange}
              isCollapsed={isSidebarCollapsed}
              setIsCollapsed={setIsCollapsed}
              themePref={themePref}
              setThemePref={setThemePref}
              darkTheme={darkTheme}
              logsCount={logs.length}
              logs={logs}
              isAdmin={isAdmin}
              adminView={adminView}
              setAdminView={setAdminView}
              isOpenMobile={isMobileMenuOpen}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. Main Portal workspace */}
      <motion.main
        layout
        className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto print:p-0 relative z-10"
      >
        {/* Top Header details */}
        <AnimatePresence initial={false}>
          {!isZenMode && (
            <motion.div
              initial={{ height: 0, opacity: 0, y: -20 }}
              animate={{ height: "auto", opacity: 1, y: 0 }}
              exit={{
                height: 0,
                opacity: 0,
                y: -20,
                transition: { duration: 0.2 },
              }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4 mb-6 print:hidden">
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-850 dark:text-slate-100 tracking-tight flex items-center">
                    <button
                      type="button"
                      onClick={() => setIsMobileMenuOpen(true)}
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 md:hidden cursor-pointer mr-2 border border-slate-200 dark:border-slate-800 active:scale-95 transition-transform"
                      title="Mở menu"
                    >
                      <Menu className="w-5 h-5" />
                    </button>
                    <span>Hệ Thống Nhật Ký Công Việc & Báo Cáo</span>
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Đơn vị chủ quản:{" "}
                    <span className="font-semibold text-slate-800 dark:text-slate-300">
                      {agencyName}
                    </span>{" "}
                    | Đăng nhập cán bộ điều hành tác nghiệp
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-3 mr-3 text-xs">
                    <span className="font-semibold text-sky-600 dark:text-sky-400 max-w-[150px] truncate" title={user.email || ""}>
                      {user.displayName || user.email}
                      {isAdmin && <span className="ml-1 text-rose-500 font-bold">(Admin)</span>}
                    </span>
                    <button
                      onClick={logout}
                      className="p-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg cursor-pointer transition-all"
                      title="Đăng xuất"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Quick quick entry shortcut */}
                  <button
                    onClick={() => {
                      if (activeTab === "logs" && isLogFormDirty) {
                        showCustomConfirm(
                          "Huỷ bỏ nhập liệu",
                          "Dữ liệu công việc đang nhập chưa được lưu. Bạn có chắc chắn muốn bỏ qua để khởi tạo nhật ký mới?",
                          () => {
                            setIsLogFormDirty(false);
                            setEditLog(null);
                            setPrefilledNewLogDate(null);
                            setActiveTab("logs");
                          },
                        );
                        return;
                      }
                      setEditLog(null);
                      setPrefilledNewLogDate(null);
                      setActiveTab("logs");
                    }}
                    className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Ghi nhật ký mới</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Render Tab View Context */}
        {activeTab === "logs" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 print:hidden relative z-20">
            {/* Form Section - Left side column */}
            <motion.div
              layout
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className={
                isZenMode
                  ? "xl:col-span-12 max-w-4xl mx-auto w-full space-y-3"
                  : "xl:col-span-12 space-y-3 xl:col-span-5"
              }
            >
              <LogForm
                editLog={editLog}
                allLogs={logs}
                onSaveLog={handleSaveLog}
                onCancelEdit={() => {
                  if (isLogFormDirty) {
                    showCustomConfirm(
                      "Huỷ bỏ thay đổi",
                      "Nội dung công việc đang nhập chưa được lưu. Bạn có chắc chắn muốn hủy bỏ thao tác này không?",
                      () => {
                        setIsLogFormDirty(false);
                        setEditLog(null);
                        setPrefilledNewLogDate(null);
                      },
                    );
                    return;
                  }
                  setEditLog(null);
                  setPrefilledNewLogDate(null);
                }}
                isZenMode={isZenMode}
                onToggleZenMode={() => setIsZenMode(!isZenMode)}
                initialDate={prefilledNewLogDate || undefined}
                onDirtyChange={setIsLogFormDirty}
              />
            </motion.div>

            {/* Interactive Data List / Table - Right side column */}
            <AnimatePresence>
              {!isZenMode && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  className="xl:col-span-7 space-y-4"
                >
                  {/* Quick Period Pre-selection Filters row bar */}
                  <div className="bg-white dark:bg-[#111827] p-4 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <span className="text-xs font-bold text-slate-650 dark:text-slate-300 flex items-center space-x-1">
                        <Calendar className="w-4 h-4 text-sky-500" />
                        <span>Lọc khoảng thời gian nhanh:</span>
                      </span>

                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => applyPeriodFilter("today")}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-md"
                        >
                          Hôm nay
                        </button>
                        <button
                          onClick={() => applyPeriodFilter("week")}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-md"
                        >
                          Tuần này
                        </button>
                        <button
                          onClick={() => applyPeriodFilter("month")}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-md"
                        >
                          Tháng này
                        </button>
                        <button
                          onClick={() => applyPeriodFilter("quarter")}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-md"
                        >
                          Quý này
                        </button>
                        <button
                          onClick={() => applyPeriodFilter("year")}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[10px] font-bold rounded-md"
                        >
                          Năm này
                        </button>
                        <button
                          onClick={handleResetFilters}
                          className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 text-[10px] font-bold rounded-md"
                        >
                          Xóa lọc
                        </button>
                      </div>
                    </div>

                    {/* General Advanced Keywords filter controllers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Tìm kiếm nội dung, kết quả..."
                          value={filters.keyword}
                          onChange={(e) =>
                            setFilters({ ...filters, keyword: e.target.value })
                          }
                          className="w-full text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-805 pl-9 pr-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <select
                          value={filters.dueScope}
                          onChange={(e) =>
                            setFilters({ ...filters, dueScope: e.target.value })
                          }
                          className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 focus:outline-hidden"
                        >
                          <option value="Tất cả">
                            Lọc theo Hạn hoàn thành (Tất cả)
                          </option>
                          <option value="Quá hạn">Đã Quá Hạn</option>
                          <option value="Đến hạn hôm nay">
                            Đến Hạn Hôm Nay
                          </option>
                          <option value="Sắp đến hạn 7 ngày">
                            Sắp Đến Hạn trong 7 ngày
                          </option>
                          <option value="Chưa đặt hạn">
                            Chưa lập deadline hạn
                          </option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Advanced Logs Grid */}
                  <LogsTable
                    logs={logs}
                    onSelectEdit={setEditLog}
                    onDeleteLog={handleDeleteLog}
                    onDuplicateLog={handleDuplicateLog}
                    onUpdateStatus={handleUpdateLogStatus}
                    statusFilter={filters.status}
                    setStatusFilter={(s) =>
                      setFilters({ ...filters, status: s })
                    }
                    categoryFilter={filters.category}
                    setCategoryFilter={(c) =>
                      setFilters({ ...filters, category: c })
                    }
                    priorityFilter={filters.priority}
                    setPriorityFilter={(p) =>
                      setFilters({ ...filters, priority: p })
                    }
                    isLoading={isLoadingLogs}
                    filters={filters}
                    setFilters={setFilters}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="print:hidden">
            <CalendarTab
              logs={logs}
              onAddLog={handleSaveLog}
              onUpdateLogStatus={handleUpdateLogStatus}
              onSelectLogForEdit={(log) => {
                setEditLog(log);
                setActiveTab("logs");
              }}
              onQuickCreateLogOnDate={(dateStr) => {
                setEditLog(null);
                setPrefilledNewLogDate(dateStr);
                setActiveTab("logs");
              }}
            />
          </div>
        )}

        {activeTab === "kanban" && (
          <div className="print:hidden">
            <KanbanTab
              logs={logs}
              userName={user?.displayName || userName}
              userAvatar={user?.photoURL || userAvatar}
              onUpdateLogStatus={handleUpdateLogStatus}
              onSelectEdit={(log) => {
                setEditLog(log);
                setActiveTab("logs");
              }}
              onDeleteLog={handleDeleteLog}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode(!isZenMode)}
            />
          </div>
        )}

        {activeTab === "dashboard" && (
          <div>
            <DashboardTab
              logs={logs}
              stats={stats}
              agencyName={agencyName}
              approverTitle={approverTitle}
              agencyLogo={agencyLogo}
              isLoading={isLoadingLogs}
              isZenMode={isZenMode}
              onToggleZenMode={() => setIsZenMode(!isZenMode)}
            />
          </div>
        )}

        {activeTab === "ai-report" && (
          <AIReportTab logs={logs} filterStart={filters.start} filterEnd={filters.end} />
        )}

        {isAdmin && activeTab === "admin" && (
          <AdminPanelTab />
        )}

        {activeTab === "settings" && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 print:hidden">
            {/* Left Box: Agency config setup */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-150 dark:border-slate-800 pb-2 flex items-center space-x-1.5 uppercase tracking-wider">
                <Building className="w-5 h-5 text-sky-500" />
                <span>Thiết lập biểu mẫu & Ký duyệt</span>
              </h3>

              <form onSubmit={handleSaveAgency} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                    Tên cơ quan chủ quản / Khoa / Đơn vụ
                  </label>
                  <input
                    type="text"
                    required
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider font-semibold">
                    Người ký duyệt báo cáo (Học hàm / Chức danh khoa học / Chức
                    vụ)
                  </label>
                  <input
                    type="text"
                    required
                    value={approverTitle}
                    onChange={(e) => setApproverTitle(e.target.value)}
                    className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                  />
                </div>

                <div className="pt-2 border-t border-slate-150 dark:border-slate-800 mt-2">
                  <h4 className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-3 uppercase flex items-center space-x-1.5">
                    <UserCheck className="w-4 h-4 text-emerald-500" />
                    <span>Thông tin của bạn (Hiển thị Avatar)</span>
                  </h4>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                        Tên / Bí danh của bạn
                      </label>
                      <input
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
                        URL Ảnh đại diện (Avatar)
                      </label>
                      <input
                        type="text"
                        value={userAvatar}
                        placeholder="https://example.com/avatar.jpg"
                        onChange={handleAvatarChange}
                        onPaste={handleAvatarPaste}
                        className="w-full text-xs font-semibold bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-3 py-2 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Lưu thông số
                  </button>
                </div>
              </form>
            </div>

            {/* Logo Box: Form Logo & Crest configuration */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-150 dark:border-slate-800 pb-2 flex items-center space-x-1.5 uppercase tracking-wider">
                  <Image className="w-5 h-5 text-emerald-500" />
                  <span>Logo / Biểu tượng báo cáo</span>
                </h3>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Thiết lập logo đơn vị xuất hiện trên tiêu đề trang in ấn báo
                  cáo văn phòng. Bạn có thể tự chụp từ Camera hoặc dán URL ảnh
                  trực tuyến.
                </p>

                {/* Show Preview of Logo */}
                <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-150 dark:border-slate-800/80 min-h-32 text-center relative group overflow-hidden">
                  {agencyLogo ? (
                    <div className="space-y-2">
                      <img
                        src={agencyLogo}
                        alt="Preview Logo"
                        className="h-20 max-w-[150px] object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-white p-1 mx-auto"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        onClick={handleClearLogo}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold block mx-auto transition-all cursor-pointer active:scale-95"
                      >
                        Xóa Logo
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-400 dark:text-slate-500 space-y-1">
                      <Image className="w-10 h-10 mx-auto opacity-40" />
                      <p className="text-[10px] font-semibold">
                        Chưa cấu hình Logo hiển thị
                      </p>
                      <p className="text-[9px] opacity-75">
                        Hệ thống sẽ lấy text tên cơ quan làm chuẩn
                      </p>
                    </div>
                  )}
                </div>

                {/* Camera Control Block */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Cách 1: Chụp ảnh từ Camera
                  </span>

                  {isCameraActive ? (
                    <div className="space-y-2">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-36 bg-black rounded-lg object-cover border border-slate-205 dark:border-slate-800"
                      />
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="flex-1 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-lg transition-all active:scale-95 flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>Chụp hình</span>
                        </button>
                        <button
                          type="button"
                          onClick={stopCamera}
                          className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-all active:scale-95 cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={startCamera}
                      className="w-full py-2 bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/60 text-sky-600 dark:text-sky-400 hover:bg-sky-100/80 dark:hover:bg-sky-900/40 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Kích hoạt Camera chụp Logo</span>
                    </button>
                  )}

                  {cameraError && (
                    <p className="text-[10px] text-rose-500 font-medium leading-tight">
                      {cameraError}
                    </p>
                  )}
                </div>
              </div>

              {/* URL Submission Form */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                  Cách 2: Nhập đường dẫn URL/Base64
                </span>
                <form
                  onSubmit={handleLoadLogoFromUrl}
                  className="flex space-x-1.5"
                >
                  <input
                    type="text"
                    placeholder="URL ảnh logo..."
                    value={logoUrlInput}
                    onChange={(e) => setLogoUrlInput(e.target.value)}
                    className="flex-1 text-[11px] bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-2.5 py-1.5 rounded-lg text-slate-850 dark:text-slate-100 focus:outline-hidden font-medium"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 shrink-0 flex items-center space-x-1"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>Nạp</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Middle Box: Notification intelligence configuration */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-150 dark:border-slate-800 pb-2 flex items-center space-x-1.5 uppercase tracking-wider">
                <BellRing className="w-5 h-5 text-amber-500" />
                <span>Thông báo tiến độ & Hạn định</span>
              </h3>

              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Nhận cảnh báo trực quan và âm thanh chime báo hiệu ngay khi có
                  công việc sắp đến hạn hoặc đã quá hạn, giúp bạn luôn bám sát
                  tiến độ.
                </p>

                {/* Switch enable notifications */}
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-150 dark:border-slate-800/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-350 block">
                      Kích hoạt thông báo
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      Thông báo Pop-up & Âm thanh
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const nextVal = !enableNotifications;
                      setEnableNotifications(nextVal);
                      localStorage.setItem(
                        "worklog_notif_enabled",
                        String(nextVal),
                      );
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      enableNotifications
                        ? "bg-amber-500"
                        : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enableNotifications ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {/* Browser permission status */}
                <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-150 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      Quyền trình duyệt:
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase font-black rounded-md ${
                        notificationPermission === "granted"
                          ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : notificationPermission === "denied"
                            ? "bg-rose-100/80 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
                            : "bg-amber-100/80 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}
                    >
                      {notificationPermission === "granted" &&
                        "Đã cấp (Granted)"}
                      {notificationPermission === "denied" &&
                        "Đã chặn (Denied)"}
                      {notificationPermission === "default" &&
                        "Chưa yêu cầu (Default)"}
                      {notificationPermission === "unsupported" &&
                        "Không hỗ trợ"}
                    </span>
                  </div>

                  {notificationPermission !== "granted" &&
                    notificationPermission !== "unsupported" && (
                      <button
                        onClick={requestNotificationPermission}
                        className="w-full mt-1.5 py-1.5 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Nhấp yêu cầu quyền trình duyệt
                      </button>
                    )}
                </div>

                {/* Action quick buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={playNotificationSound}
                    className="py-1.5 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-center space-x-1 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-sky-500" />
                    <span>Thử Chime âm</span>
                  </button>

                  <button
                    onClick={triggerTestNotification}
                    className="py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    <span>Gửi Test Pop-up</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Box: Data Backups Restore EXPORT and Maintenance */}
            <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-150 dark:border-slate-800 pb-2 flex items-center space-x-1.5 uppercase tracking-wider">
                <FileDown className="w-5 h-5 text-indigo-500" />
                <span>Sao lưu & Bảo dòng cơ sở dữ liệu</span>
              </h3>

              <div className="space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Công việc quan trọng luôn cần được sao lưu định vị phòng tránh
                  rủi ro. Bạn có thể lưu trữ toàn bộ dữ liệu nhật ký của mình
                  thành tệp tin cục bộ `.json` để nhập tự động bất kỳ lúc nào.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  {/* Backup JSON */}
                  <button
                    onClick={handleExportJSONBackup}
                    className="p-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/60 border border-indigo-100 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-400 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all"
                  >
                    <Download className="w-5 h-5" />
                    <span>Tải tệp Dự phòng (.json)</span>
                  </button>

                  {/* Restores loader anchors container */}
                  <label className="p-3 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/20 dark:hover:bg-sky-900/60 border border-sky-100 dark:border-sky-900/60 text-sky-700 dark:text-sky-400 rounded-xl text-xs font-bold flex flex-col items-center justify-center space-y-2 cursor-pointer transition-all text-center">
                    <Upload className="w-5 h-5 text-sky-500" />
                    <span>Khôi phục tệp Backup (.json)</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportJSONBackup}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                  {/* EXPORT ACTIVE TO CSV EXCEL */}
                  <button
                    onClick={handleExportCSV}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/80 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350 cursor-pointer flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <FileDown className="w-4 h-4 text-emerald-500" />
                    <span>Xuất bảng tính (.csv)</span>
                  </button>

                  {/* Danger parameters */}
                  <button
                    onClick={handleClearDatabase}
                    className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa sạch nhật ký</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.main>

      {/* 4. In-App Floating Toasts Overlay */}
      {toasts.length > 0 && (
        <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full font-sans pointer-events-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border border-l-4 shadow-xl flex items-start space-x-3 transition-all duration-300 transform translate-y-0 scale-100 bg-white dark:bg-slate-900 ${
                toast.type === "overdue"
                  ? "border-rose-200 dark:border-rose-95/80 border-l-rose-500 shadow-rose-100/40 dark:shadow-rose-950/20"
                  : "border-amber-200 dark:border-amber-95/80 border-l-amber-500 shadow-amber-100/40 dark:shadow-amber-955/20"
              }`}
            >
              <div className="mt-0.5 select-none">
                {toast.type === "overdue" ? (
                  <div className="p-1.5 bg-rose-100 dark:bg-rose-950/50 text-rose-650 dark:text-rose-400 rounded-lg">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                ) : (
                  <div className="p-1.5 bg-amber-100 dark:bg-amber-950/50 text-amber-650 dark:text-amber-400 rounded-lg">
                    <BellRing className="w-5 h-5 animate-bounce" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                    toast.type === "overdue"
                      ? "bg-rose-100/60 text-rose-700 dark:bg-rose-955/40 dark:text-rose-400"
                      : "bg-amber-100/60 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400"
                  }`}
                >
                  {toast.type === "overdue"
                    ? "QUÁ HẠN HOÀN THÀNH"
                    : "SẮP ĐẾN HẠN"}
                </span>
                <h4 className="text-xs font-bold text-slate-850 dark:text-slate-100 mt-1 pb-0.5 leading-snug">
                  {toast.title}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal break-words line-clamp-2">
                  {toast.message}
                </p>

                {/* Action button to view details */}
                {toast.log.id !== -999 && (
                  <button
                    onClick={() => {
                      setSelectedLogDetails(toast.log);
                    }}
                    className="mt-2 text-[10px] font-black text-sky-500 hover:text-sky-600 flex items-center space-x-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Xem chi tiết công việc</span>
                  </button>
                )}
              </div>

              {/* Close button */}
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 5. Quick WorkLog Detail Lightbox Modal (For notification lookup) */}
      {selectedLogDetails && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-[#111827] max-w-lg w-full rounded-2xl border border-slate-150 dark:border-slate-800 shadow-2xl p-6 relative space-y-4">
            <button
              onClick={() => setSelectedLogDetails(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors border border-slate-150 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 border rounded-full ${getCategoryColor(selectedLogDetails.category)}`}
              >
                {selectedLogDetails.category}
              </span>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  selectedLogDetails.priority === "Khẩn"
                    ? "bg-rose-100 text-rose-850 dark:bg-rose-955/40 dark:text-rose-450 border border-rose-200 dark:border-rose-900"
                    : selectedLogDetails.priority === "Cao"
                      ? "bg-amber-100 text-amber-850 dark:bg-amber-955/40 dark:text-amber-450 border border-amber-200 dark:border-amber-900"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800"
                }`}
              >
                Độ khẩn: {selectedLogDetails.priority}
              </span>
            </div>

            <h3 className="text-sm font-black text-slate-850 dark:text-slate-100 uppercase tracking-tight leading-relaxed">
              {selectedLogDetails.content}
            </h3>

            <div className="border-t border-b border-slate-100 dark:border-slate-800/80 py-3 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-slate-400 font-bold mb-0.5 uppercase tracking-wide text-[9px]">
                  Ngày làm việc:
                </span>
                <span className="font-semibold text-slate-700 dark:text-slate-350">
                  {toDisplayDate(selectedLogDetails.date)}
                </span>
              </div>

              <div>
                <span className="block text-slate-400 font-bold mb-0.5 uppercase tracking-wide text-[9px]">
                  Hạn hoàn thành:
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {selectedLogDetails.dueDate
                    ? toDisplayDate(selectedLogDetails.dueDate)
                    : "Chưa đặt hạn"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              {selectedLogDetails.plannedProgress && (
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">
                    Chỉ tiêu tiến độ:
                  </h5>
                  <p className="text-slate-650 dark:text-slate-300 font-medium leading-relaxed mt-0.5 whitespace-pre-line">
                    {selectedLogDetails.plannedProgress}
                  </p>
                </div>
              )}

              {selectedLogDetails.resultText && (
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wide text-[9px]">
                    Kết quả thực tế / Sản phẩm:
                  </h5>
                  <p className="text-slate-650 dark:text-slate-300 font-medium leading-relaxed mt-0.5 whitespace-pre-line">
                    {selectedLogDetails.resultText}
                  </p>
                </div>
              )}

              {selectedLogDetails.notes && (
                <div className="bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-150 dark:border-slate-800/60">
                  <h5 className="font-semibold text-slate-500 text-[9px] uppercase tracking-wide">
                    Ghi chú thêm:
                  </h5>
                  <p className="text-slate-600 dark:text-slate-400 leading-normal mt-0.5 italic">
                    {selectedLogDetails.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <button
                onClick={() => {
                  setSelectedLogDetails(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Custom Alert & Confirm Dialog Modal */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs font-sans">
          <div className="bg-white dark:bg-[#111827] max-w-sm w-full rounded-2xl border border-slate-150 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3">
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  dialog.type === "confirm"
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-500"
                    : "bg-sky-50 dark:bg-sky-950/30 text-sky-500"
                }`}
              >
                {dialog.type === "confirm" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <Info className="w-5 h-5" />
                )}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                  {dialog.title || "Xác nhận hệ thống"}
                </h4>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {dialog.message}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              {dialog.type === "confirm" ? (
                <>
                  <button
                    onClick={() => {
                      setDialog((prev) => ({ ...prev, isOpen: false }));
                      if (dialog.onCancel) {
                        dialog.onCancel();
                      }
                    }}
                    className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={() => {
                      setDialog((prev) => ({ ...prev, isOpen: false }));
                      if (dialog.onConfirm) {
                        dialog.onConfirm();
                      }
                    }}
                    className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
                  >
                    Đồng ý
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setDialog((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 shadow-xs"
                >
                  Xác nhận
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
