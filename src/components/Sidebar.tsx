import React, { useMemo } from "react";
import { 
  BookOpen, 
  Calendar, 
  LayoutDashboard, 
  Sparkles, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Layers,
  Monitor,
  Clock,
  AlertCircle,
  Shield
} from "lucide-react";
import QuickNotes from "./QuickNotes";
import PomodoroTimer from "./PomodoroTimer";
import { WorkLog } from "../types";

export type ThemePreference = 'light' | 'dark' | 'system';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  themePref: ThemePreference;
  setThemePref: (pref: ThemePreference) => void;
  darkTheme: boolean;
  logsCount: number;
  logs: WorkLog[];
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  isAdmin?: boolean;
  adminView?: boolean;
  setAdminView?: (val: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  themePref,
  setThemePref,
  darkTheme,
  logsCount,
  logs,
  isOpenMobile = false,
  onCloseMobile,
  isAdmin = false,
  adminView = false,
  setAdminView
}: SidebarProps) {
  const baseMenuItems = [
    { id: "logs", label: "Nhật ký & Dữ liệu", icon: BookOpen },
    { id: "calendar", label: "Lịch công việc", icon: Calendar },
    { id: "kanban", label: "Bảng Kanban", icon: Layers },
    { id: "dashboard", label: "Dashboard & Thống kê", icon: LayoutDashboard },
    { id: "ai-report", label: "Báo cáo thông minh (AI)", icon: Sparkles },
    { id: "settings", label: "Thiết lập cá nhân", icon: Settings },
  ];

  const menuItems = isAdmin 
    ? [...baseMenuItems, { id: "admin", label: "Quản trị hệ thống", icon: Shield }]
    : baseMenuItems;

  const upNextTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return logs
      .filter((log) => {
        if (log.status === "Hoàn thành" || log.status === "Tạm dừng") return false;
        if (!log.date) return false;
        
        const logDate = new Date(log.date);
        logDate.setHours(0, 0, 0, 0);
        
        return logDate <= tomorrow;
      })
      .sort((a, b) => {
        const order: Record<string, number> = { "Khẩn": 0, "Cao": 1, "Trung bình": 2, "Thấp": 3 };
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (order[a.priority] || 4) - (order[b.priority] || 4);
      })
      .slice(0, 3);
  }, [logs]);

  return (
    <>
      {/* Mobile menu backdrop */}
      {isOpenMobile && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      <aside 
        className={`border-r border-slate-205 dark:border-slate-800 bg-white dark:bg-[#0b1220] transition-transform md:transition-all duration-300 flex flex-col justify-between h-screen fixed md:sticky top-0 left-0 z-50 md:z-10 ${
          isCollapsed ? "w-16" : "w-64"
        } ${
          isOpenMobile ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex-1 overflow-y-auto scrollbar-thin dark:scrollbar-track-slate-900 scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800 flex flex-col justify-between min-h-0 pb-4">
          <div>
            {/* Header App logo */}
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-[#0b1220] z-10">
              {(!isCollapsed || isOpenMobile) && (
                <div className="flex items-center space-x-2">
                  <div className="bg-sky-500 text-white p-1.5 rounded-lg">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">
                    WORKLOG PRO
                  </span>
                </div>
              )}
              {isCollapsed && !isOpenMobile && (
                <div className="bg-sky-500 text-white p-1.5 rounded-lg mx-auto animate-pulse">
                  <BookOpen className="w-4 h-4" />
                </div>
              )}
              
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hidden md:block"
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>

              {/* Mobile close menu button */}
              {isOpenMobile && (
                <button 
                  onClick={onCloseMobile}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 md:hidden"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Navigation Items */}
            <nav className="p-2 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isItemCollapsed = isCollapsed && !isOpenMobile;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center ${
                      isItemCollapsed ? "justify-center px-1" : "px-3"
                    } py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-900/50" 
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200"
                    }`}
                    title={isItemCollapsed ? item.label : ""}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? "text-sky-500 dark:text-sky-400" : "text-slate-500"}`} />
                    {(!isCollapsed || isOpenMobile) && (
                      <span className="ml-3 truncate">{item.label}</span>
                    )}
                    {(!isCollapsed || isOpenMobile) && item.id === "logs" && logsCount > 0 && (
                      <span className="ml-auto bg-slate-100 dark:bg-slate-800 text-xs px-2 py-0.5 rounded-full text-slate-500 dark:text-slate-400 font-normal">
                        {logsCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Admin View Toggle */}
            {isAdmin && (
              <div className="px-3 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800/80 mb-2">
                <button
                  onClick={() => {
                    const newAdminView = !adminView;
                    setAdminView?.(newAdminView);
                    if (newAdminView) {
                      setActiveTab("admin");
                    } else if (activeTab === "admin") {
                      setActiveTab("logs");
                    }
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    adminView 
                      ? "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50" 
                      : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50"
                  } hover:opacity-80`}
                  title={isCollapsed && !isOpenMobile ? (adminView ? "Đang ở Giao diện Admin" : "Đang ở Giao diện Cá nhân") : ""}
                >
                  <div className="flex items-center">
                    <AlertCircle className={`w-4 h-4 ${adminView ? "text-rose-500" : "text-slate-500"}`} />
                    {(!isCollapsed || isOpenMobile) && (
                      <span className="ml-3 truncate">{adminView ? "Giao diện Admin" : "Giao diện Cá nhân"}</span>
                    )}
                  </div>
                  {(!isCollapsed || isOpenMobile) && (
                    <div className={`w-8 h-4 rounded-full flex items-center p-0.5 transition-colors ${adminView ? "bg-rose-500" : "bg-slate-300 dark:bg-slate-600"}`}>
                      <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${adminView ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                  )}
                </button>
              </div>
            )}
            
          </div>

          {/* Up Next Panel */}
          {(!isCollapsed || isOpenMobile) && upNextTasks.length > 0 && (
            <div className="px-3 py-2 mb-2">
              <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/20 dark:to-orange-950/20 rounded-xl border border-rose-100/50 dark:border-rose-900/30 p-3 shadow-xs">
                <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 mb-2.5 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Nhiệm vụ sắp tới</span>
                </div>
                <div className="space-y-2">
                  {upNextTasks.map(task => (
                    <div 
                      key={task.id} 
                      className="bg-white/80 dark:bg-[#0b1220]/60 rounded-lg p-2 text-xs border border-white dark:border-slate-800 shadow-sm transition-all hover:bg-white dark:hover:bg-[#0b1220] hover:shadow cursor-pointer"
                      onClick={() => {
                        setActiveTab("logs");
                        if (onCloseMobile) onCloseMobile();
                      }}
                      title={task.content}
                    >
                      <div className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mb-1">
                        {task.content}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          task.priority === "Khẩn" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" :
                          task.priority === "Cao" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                        }`}>
                          {task.priority}
                        </span>
                        <div className="flex items-center text-slate-500 font-medium text-[10px]">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>
                            {(() => {
                              const taskDate = new Date(task.date);
                              taskDate.setHours(0,0,0,0);
                              const today = new Date();
                              today.setHours(0,0,0,0);
                              if (taskDate.getTime() === today.getTime()) return "Hôm nay";
                              return "Ngày mai";
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <PomodoroTimer isSidebarCollapsed={isCollapsed && !isOpenMobile} />

          {/* Quick Sticky Notes section */}
          <QuickNotes isSidebarCollapsed={isCollapsed && !isOpenMobile} />
        </div>

        {/* Footer workspace details and Theme toggler */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-4 shrink-0 bg-white dark:bg-[#0b1220]">
          {(!isCollapsed || isOpenMobile) && (
            <div className="bg-slate-50 dark:bg-slate-900/40 rounded-lg p-3 border border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-mono">
                Thông tin phiên làm việc
              </span>
              <p className="text-xs text-slate-650 dark:text-slate-400 font-medium truncate">
                Chế độ: {themePref === 'system' ? "Theo hệ thống" : themePref === 'dark' ? "Giao diện Tối" : "Giao diện Sáng"}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-1">
                Hạn mức ghi: {logsCount} công việc.
              </p>
            </div>
          )}

          <div className="flex items-center justify-center">
            {(!isCollapsed || isOpenMobile) ? (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full">
                <button
                  onClick={() => setThemePref('light')}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    themePref === 'light' ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                  title="Giao diện Sáng"
                >
                  <Sun className={`w-3.5 h-3.5 ${themePref === 'light' ? "text-amber-500" : ""}`} />
                </button>
                <button
                  onClick={() => setThemePref('system')}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    themePref === 'system' ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700"
                  }`}
                  title="Theo hệ thống"
                >
                  <Monitor className={`w-3.5 h-3.5 ${themePref === 'system' ? "text-emerald-500" : ""}`} />
                </button>
                <button
                  onClick={() => setThemePref('dark')}
                  className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    themePref === 'dark' ? "bg-slate-900 text-white shadow-sm border border-slate-700" : "text-slate-500 hover:text-slate-400"
                  }`}
                  title="Giao diện Tối"
                >
                  <Moon className={`w-3.5 h-3.5 ${themePref === 'dark' ? "text-sky-400" : ""}`} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setThemePref(themePref === 'dark' ? 'light' : themePref === 'light' ? 'system' : 'dark')}
                className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex flex-col space-y-1 items-center justify-center w-full cursor-pointer"
                title="Đổi chế độ giao diện"
              >
                {themePref === 'light' ? <Sun className="w-5 h-5 text-amber-500" /> : themePref === 'dark' ? <Moon className="w-5 h-5 text-sky-600" /> : <Monitor className="w-5 h-5 text-emerald-500" />}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
