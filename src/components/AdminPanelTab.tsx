import React, { useState, useEffect } from "react";
import { Users, Database, Shield, ShieldAlert, Trash2, ShieldCheck, Mail, HardDrive, RefreshCw, BarChart2 } from "lucide-react";
import { collection, getDocs, updateDoc, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export default function AdminPanelTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsers(usersList);
      
      const logsSnap = await getDocs(collection(db, "worklogs"));
      const logsByUserId: Record<string, number> = {};
      logsSnap.docs.forEach(d => {
        const userId = d.data().userId;
        if (userId) {
          logsByUserId[userId] = (logsByUserId[userId] || 0) + 1;
        }
      });
      
      const cData = usersList.map(u => ({
        name: u.displayName || u.email?.split('@')[0] || "Unknown",
        logs: logsByUserId[u.id] || 0
      })).sort((a, b) => b.logs - a.logs);
      
      setChartData(cData);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    const isRevoking = currentRole === "admin";
    const confirmMessage = isRevoking 
      ? "Bạn có chắc chắn muốn thu hồi quyền Quản trị viên của người dùng này?" 
      : "Bạn có chắc chắn muốn cấp quyền Quản trị viên cho người dùng này?";
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const newRole = isRevoking ? "user" : "admin";
      await updateDoc(doc(db, "users", userId), { role: newRole });
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi cập nhật quyền: " + (err as Error).message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa người dùng này khỏi cơ sở dữ liệu?")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert("Lỗi khi xóa người dùng: " + (err as Error).message);
    }
  };

  const handleGenerateSampleData = async () => {
    if (users.length === 0) {
      alert("Không có người dùng nào để gán dữ liệu (hoặc do dữ liệu chưa đồng bộ). Hãy thử tải lại trang (F5) để hệ thống tự động gán tài khoản của bạn vào danh sách.");
      return;
    }
    
    if (!window.confirm("Bạn có chắc chắn muốn khởi tạo dữ liệu mẫu? (sẽ thêm một số bản ghi giả lập cho người dùng hiện tại)")) return;
    
    setLoading(true);
    try {
      const batch = writeBatch(db);
      const today = new Date().toISOString().split("T")[0];
      
      const sampleLogs = [
        {
          category: "Lập trình",
          priority: "Cao",
          status: "Hoàn thành",
          content: "Phát triển tính năng đăng nhập và phân quyền admin.",
          plannedProgress: "Hoàn thành 100% chức năng auth.",
          resultText: "Chạy ổn định, đã kiểm thử.",
          dueDate: today,
        },
        {
          category: "Thiết kế/UI",
          priority: "Trung bình",
          status: "Đang thực hiện",
          content: "Cải thiện giao diện bảng điều khiển quản trị.",
          plannedProgress: "Thêm biểu đồ thống kê.",
          resultText: "Đã xong giao diện, chờ nối API.",
          dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
        },
        {
          category: "Tài liệu/Họp",
          priority: "Thấp",
          status: "Chưa bắt đầu",
          content: "Viết tài liệu hướng dẫn sử dụng hệ thống cho người dùng mới.",
          plannedProgress: "Soạn thảo 5 trang đầu.",
          resultText: "",
          dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
        },
      ];

      sampleLogs.forEach((log) => {
        // Assign to a random user
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const docRef = doc(collection(db, "worklogs"));
        batch.set(docRef, {
          ...log,
          userId: randomUser.id,
          date: today,
          nextPlan: "",
          notes: "Sample data",
          attachments: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });

      await batch.commit();
      alert("Khởi tạo dữ liệu mẫu thành công!");
      fetchUsers(); // Refresh chart data
    } catch (err) {
      console.error(err);
      alert("Lỗi khi tạo dữ liệu: " + (err as Error).message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs flex-col sm:flex-row gap-4 sm:gap-0">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Shield className="w-6 h-6 text-rose-500" />
            Bảng điều khiển Quản trị viên
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý quyền truy cập và dữ liệu hệ thống tổng thể.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleGenerateSampleData}
            title="Tạo Dữ liệu Mẫu (Cho Mục đích Thử nghiệm)"
            className="flex items-center gap-1.5 px-3 py-2 border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-lg text-sm font-medium transition-colors"
          >
            <Database className="w-4 h-4" />
            <span>Khởi tạo dữ liệu mẫu</span>
          </button>
          
          <button 
            onClick={fetchUsers}
            className="p-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white dark:bg-[#111827] rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-[#151e32]">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              Danh sách Người dùng
            </h3>
          </div>
          
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 uppercase text-xs font-semibold">
                <tr>
                  <th className="px-5 py-3">Người dùng</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Vai trò</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/60">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-3 flex items-center gap-3">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.displayName} className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500 flex items-center justify-center font-bold">
                          {u.displayName?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-200">{u.displayName}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                      {u.email}
                    </td>
                    <td className="px-5 py-3">
                      {u.role === "admin" ? (
                        <span className="px-2.5 py-1 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 rounded-full border border-rose-200 dark:border-rose-800/50 flex inline-flex items-center gap-1.5">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700/50">
                          Thành viên
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleAdmin(u.id, u.role)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 rounded transition-colors"
                          title={u.role === "admin" ? "Hủy quyền Admin" : "Cấp quyền Admin"}
                        >
                          <ShieldAlert className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 dark:hover:text-rose-400 rounded transition-colors"
                          title="Xóa người dùng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500 dark:text-slate-400">
                      Không có người dùng nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#111827] p-5 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-150 dark:border-slate-800 pb-2 flex items-center gap-1.5 uppercase tracking-wider mb-4">
              <Database className="w-5 h-5 text-emerald-500" />
              Tình trạng Hệ thống
            </h3>
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Tổng tài khoản:</span>
                 <span className="font-bold text-slate-800 dark:text-slate-200">{users.length}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Tài khoản Admin:</span>
                 <span className="font-bold text-rose-600 dark:text-rose-400">{users.filter(u => u.role === 'admin').length}</span>
               </div>
               <div className="flex items-center justify-between">
                 <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Máy chủ:</span>
                 <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Hoạt động bình thường</span>
               </div>
            </div>
          </div>
          
          <div className="bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-900/30 p-5 rounded-xl shadow-xs">
            <h3 className="font-bold text-rose-800 dark:text-rose-400 text-sm flex items-center gap-1.5 uppercase tracking-wider mb-2">
              <HardDrive className="w-5 h-5" /> Cài đặt nâng cao
            </h3>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mb-4 leading-relaxed">
              Các thiết lập này có thể ảnh hưởng đến toàn bộ dữ liệu trên hệ thống. 
            </p>
            <button
               onClick={() => alert("Tính năng này đã bị khóa vì lý do an toàn.")}
               className="w-full py-2 bg-white dark:bg-[#1a2333] border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 rounded-lg text-sm font-semibold shadow-xs hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
               Xóa toàn bộ Logs Hệ thống
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs p-5 mt-6">
        <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-6">
          <BarChart2 className="w-5 h-5 text-indigo-500" />
          Thống kê Nhật ký theo Người dùng
        </h3>
        
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dx={-10} 
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', opacity: 0.1 }}
                  contentStyle={{ 
                    backgroundColor: '#1e293b', 
                    border: 'none', 
                    borderRadius: '8px', 
                    color: '#f8fafc',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="logs" name="Số nhật ký" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
              {loading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                <p>Không có dữ liệu nhật ký.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
