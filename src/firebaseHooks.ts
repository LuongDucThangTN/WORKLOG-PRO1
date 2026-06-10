import { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc, serverTimestamp, getDoc, writeBatch } from "firebase/firestore";
import { WorkLog, Stats } from "./types";

const ADMIN_EMAILS = [
  "atkdinhhoa.vn@gmail.com",
];

export function useFirebaseApp() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminView, setAdminView] = useState(false); // Toggle to act as admin
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  const [logs, setLogs] = useState<WorkLog[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalEntries: 0,
    uniqueDays: 0,
    doneEntries: 0,
    carryingEntries: 0,
    overdueEntries: 0,
    dueSoonEntries: 0,
    highPriorityEntries: 0,
    categoriesCount: {},
    statusCount: {},
  });
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      // Handle user bootstrapping/DB entry
      if (u) {
        const isAdminEmail = u.email && ADMIN_EMAILS.includes(u.email);
        // Optimistically set admin to prevent UI flashes or permission blockouts
        if (isAdminEmail) {
          setIsAdmin(true);
          setAdminView(true);
        }
        
        try {
          const userDoc = doc(db, "users", u.uid);
          const userDocInfo = await getDoc(userDoc);
          
          if (!userDocInfo.exists()) {
            // Check if it's the bootstrapped admin
            const userRole = isAdminEmail ? "admin" : "user";
            try {
              await setDoc(userDoc, {
                email: u.email,
                displayName: u.displayName || "Người dùng",
                avatar: u.photoURL || "",
                role: userRole,
                createdAt: Date.now()
              });
            } catch(e) {}
            
            if (!isAdminEmail) {
              setIsAdmin(userRole === "admin");
              if (userRole === "admin") setAdminView(true);
            }
          } else {
            const data = userDocInfo.data();
            if (isAdminEmail && data?.role !== "admin") {
              try {
                await updateDoc(userDoc, { role: "admin" });
              } catch(e) {}
            } else if (!isAdminEmail) {
              const userIsAdmin = data?.role === "admin";
              setIsAdmin(userIsAdmin);
              if (userIsAdmin) setAdminView(true);
            }
          }
        } catch(e) {
          console.log("Error checking user doc", e);
        }
      } else {
        setIsAdmin(false);
      }
      setIsAuthLoading(false);
    });
    return unsub;
  }, []);

  // Fetch logs matching filters or rather, fetch ALL accessible logs and let UI filter it
  // Since Firestore queries require composite indexes for multiple arbitrary filters, 
  // it's best to fetch all user's logs and filter in memory for this app size.
  useEffect(() => {
    if (!user) {
      setLogs([]);
      return;
    }
    
    setIsLoadingLogs(true);
    let q = query(collection(db, "worklogs"), where("userId", "==", user.uid));
    if (isAdmin && adminView) {
      q = query(collection(db, "worklogs"));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const fetchedLogs: WorkLog[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedLogs.push({
          id: doc.id,
          userId: data.userId || "",
          date: data.date || "",
          category: data.category || "",
          priority: data.priority || "Trung bình",
          status: data.status || "Đang thực hiện",
          dueDate: data.dueDate || "",
          content: data.content || "",
          plannedProgress: data.plannedProgress || "",
          resultText: data.resultText || "",
          nextPlan: data.nextPlan || "",
          notes: data.notes || "",
          attachments: data.attachments || [],
          createdAt: data.createdAt?.toString() || "",
          updatedAt: data.updatedAt?.toString() || ""
        });
      });
      
      setLogs(fetchedLogs.sort((a,b) => b.date.localeCompare(a.date)));
      setIsLoadingLogs(false);
      calculateStats(fetchedLogs);
    }, (error) => {
      console.error("Firestore read error", error);
      setIsLoadingLogs(false);
    });

    return unsub;
  }, [user, isAdmin, adminView]);

  const calculateStats = (allLogs: WorkLog[]) => {
    const s: Stats = {
      totalEntries: allLogs.length,
      uniqueDays: new Set(allLogs.map(l => l.date)).size,
      doneEntries: allLogs.filter(l => l.status === "Hoàn thành").length,
      carryingEntries: allLogs.filter(l => l.status === "Đang thực hiện").length,
      overdueEntries: 0,
      dueSoonEntries: 0,
      highPriorityEntries: allLogs.filter(l => l.priority === "Khẩn" || l.priority === "Cao").length,
      categoriesCount: {},
      statusCount: {},
    };
    
    const todayStr = new Date().toISOString().split("T")[0];
    
    allLogs.forEach(l => {
      if (l.status !== "Hoàn thành" && l.dueDate) {
        if (l.dueDate < todayStr) s.overdueEntries++;
        else if (l.dueDate === todayStr) s.dueSoonEntries++;
      }
      s.categoriesCount[l.category] = (s.categoriesCount[l.category] || 0) + 1;
      s.statusCount[l.status] = (s.statusCount[l.status] || 0) + 1;
    });
    setStats(s);
  };

  const handleSaveLog = async (logData: Partial<WorkLog>) => {
    if (!user) throw new Error("Chưa đăng nhập");
    if (logData.id) {
      // Update
      const dRef = doc(db, "worklogs", logData.id);
      await updateDoc(dRef, {
        ...logData,
        updatedAt: new Date().toISOString()
      });
    } else {
      // Create
      const dRef = doc(collection(db, "worklogs"));
      await setDoc(dRef, {
        ...logData,
        id: undefined,
        userId: user.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleUpdateLogStatus = async (id: string, status: string) => {
    const dRef = doc(db, "worklogs", id);
    await updateDoc(dRef, { status, updatedAt: new Date().toISOString() });
  };

  const handleDeleteLog = async (id: string) => {
    await deleteDoc(doc(db, "worklogs", id));
  };

  const handleDuplicateLog = async (log: WorkLog) => {
    if (!user) return;
    const dRef = doc(collection(db, "worklogs"));
    await setDoc(dRef, {
      userId: user.uid,
      date: new Date().toISOString().split("T")[0],
      category: log.category,
      priority: log.priority,
      status: "Đang thực hiện",
      dueDate: log.dueDate || "",
      content: `[Bản sao] ${log.content}`,
      plannedProgress: log.plannedProgress || "",
      resultText: "",
      nextPlan: "",
      notes: log.notes || "",
      attachments: log.attachments || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  };

  const handleClearDatabase = async () => {
    // Only clear current user's logs
    if (!user) return;
    const batch = writeBatch(db);
    logs.forEach(l => {
      if (isAdmin || l.userId === user.uid) {
        batch.delete(doc(db, "worklogs", l.id));
      }
    });
    await batch.commit();
  };

  const syncImportedLogs = async (importedLogs: WorkLog[]) => {
    if (!user) return;
    const batch = writeBatch(db);
    importedLogs.forEach(l => {
      const dRef = doc(collection(db, "worklogs"));
      batch.set(dRef, {
        userId: user.uid,
        date: l.date || new Date().toISOString().split("T")[0],
        category: l.category || "General",
        priority: l.priority || "Trung bình",
        status: l.status || "Đang thực hiện",
        dueDate: l.dueDate || "",
        content: l.content || "",
        plannedProgress: l.plannedProgress || "",
        resultText: l.resultText || "",
        nextPlan: l.nextPlan || "",
        notes: l.notes || "",
        attachments: l.attachments || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    await batch.commit();
  };

  return {
    user,
    isAdmin,
    adminView,
    setAdminView,
    isAuthLoading,
    logs,
    stats,
    isLoadingLogs,
    handleSaveLog,
    handleUpdateLogStatus,
    handleDeleteLog,
    handleDuplicateLog,
    handleClearDatabase,
    syncImportedLogs
  };
}
