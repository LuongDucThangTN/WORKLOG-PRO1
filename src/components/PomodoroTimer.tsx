import React, { useState, useEffect } from "react";
import { Play, Pause, Square, Timer } from "lucide-react";

export default function PomodoroTimer({ isSidebarCollapsed }: { isSidebarCollapsed: boolean }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);

  useEffect(() => {
    let interval: ReturnType<typeof setTimeout> | null = null;

    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      // Completed, toggle break / focus
      setIsActive(false);
      if (!isBreak) {
        setIsBreak(true);
        setTimeLeft(5 * 60); // 5 min break
      } else {
        setIsBreak(false);
        setTimeLeft(25 * 60); // back to 25 mins
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeLeft, isBreak]);

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = () => {
    setIsActive(false);
    setIsBreak(false);
    setTimeLeft(25 * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const percentage = isBreak 
    ? ((5 * 60 - timeLeft) / (5 * 60)) * 100 
    : ((25 * 60 - timeLeft) / (25 * 60)) * 100;

  if (isSidebarCollapsed) {
    return (
      <div className="flex flex-col items-center justify-center p-2 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
        <div 
          className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? 'bg-rose-100 text-rose-500 dark:bg-rose-950/40' : 'bg-slate-100 text-slate-500 dark:bg-slate-800/80'} cursor-pointer`}
          onClick={toggleTimer}
          title={isActive ? "Tạm dừng tập trung" : "Bắt đầu tập trung"}
        >
          {isActive ? <Pause className="w-5 h-5 animate-pulse" /> : <Timer className="w-5 h-5" />}
        </div>
        <span className={`text-[10px] font-mono mt-1 font-bold ${isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
      </div>
    );
  }

  return (
    <div className="mx-2 mt-4 px-3 py-3 bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden flex-shrink-0">
      <div 
        className={`absolute bottom-0 left-0 h-1 transition-all duration-1000 ${isBreak ? 'bg-emerald-500' : 'bg-rose-500'}`}
        style={{ width: `${percentage}%` }}
      />
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center">
          <Timer className={`w-3.5 h-3.5 mr-1 ${isActive ? 'animate-pulse text-amber-500' : ''}`} />
          {isBreak ? "Nghỉ giải lao" : "Tập trung"}
        </h3>
        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
          {isBreak ? "5m" : "25m"}
        </span>
      </div>
      <div className="flex items-center justify-between relative z-10">
        <div className={`text-2xl font-mono font-black tracking-tight ${isBreak ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            onClick={toggleTimer}
            className={`p-1.5 rounded-lg text-white ${isActive ? "bg-amber-500 hover:bg-amber-600" : "bg-rose-500 hover:bg-rose-600"} transition-colors cursor-pointer shadow-sm`}
          >
            {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>
          <button
            onClick={resetTimer}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            title="Khôi phục lại phiên làm việc"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
