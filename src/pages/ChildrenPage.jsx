// src/pages/ChildrenPage.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { debounce } from "lodash";
import * as XLSX from "xlsx";
import { useParams } from "react-router-dom";

const stageNames = {
  angels: "ملايكة",
  grade1: "سنة أولى",
  grade2: "سنة ثانية",
  grade3: "سنة تالتة",
  grade4: "سنة رابعة",
  grade5: "سنة خامسة",
  grade6: "سنة سادسة"
};

export default function ChildrenPage() {
  const { stage } = useParams();
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `${year}-${month}`;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [showSelection, setShowSelection] = useState(false);
  const [selectedRows, setSelectedRows] = useState({});
  const rowsPerPage = 10;

  const childrenCollection = collection(db, "children");

  const excelDateToJSDate = (serial) => {
    if (!serial) return "";
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const month = (date_info.getMonth() + 1).toString().padStart(2, "0");
    const day = date_info.getDate().toString().padStart(2, "0");
    const year = date_info.getFullYear();
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const q = query(childrenCollection, where("page", "==", stage));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          name: docSnap.data().name || "",
          phone: docSnap.data().phone || "",
          address: docSnap.data().address || "",
          dateOfBirth: docSnap.data().dateOfBirth || "",
          stage: docSnap.data().stage || "",
          birthCertificate: docSnap.data().birthCertificate || "",
          visited: docSnap.data().visited || {},
          page: docSnap.data().page || stage
        }));
        setRows(data);
      } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        alert("❌ فشل تحميل البيانات");
      }
    };
    fetchData();
  }, [stage]);

  const addRow = async () => {
    const newRow = { name: "", phone: "", address: "", dateOfBirth: "", stage: "", birthCertificate: "", visited: {}, page: stage };
    try {
      const docRef = await addDoc(childrenCollection, newRow);
      setRows(prev => [...prev, { id: docRef.id, ...newRow }]);
    } catch (error) {
      console.error("خطأ في الإضافة:", error);
      alert("❌ حدث خطأ أثناء الحفظ");
    }
  };

  const debounceUpdate = useRef(
    debounce(async (id, field, value) => {
      const docRef = doc(db, "children", id);
      try {
        await updateDoc(docRef, { [field]: value });
      } catch (error) {
        console.error("خطأ في التحديث:", error);
        alert("❌ فشل تحديث البيانات");
      }
    }, 500)
  ).current;

  const handleChange = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id === id) {
        if (field === "visited") {
          const newVisited = { ...r.visited, [selectedMonth]: value };
          debounceUpdate(id, "visited", newVisited);
          return { ...r, visited: newVisited };
        } else {
          debounceUpdate(id, field, value);
          return { ...r, [field]: value };
        }
      }
      return r;
    }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ هل أنت متأكد من حذف بيانات هذا الطفل؟")) return;
    const docRef = doc(db, "children", id);
    try {
      await deleteDoc(docRef);
      setRows(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("خطأ في الحذف:", error);
      alert("❌ فشل حذف الصف");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("⚠️ هل أنت متأكد من إعادة ضبط الزيارات لهذا الشهر؟")) return;
    const updatedRows = [];
    for (const r of rows) {
      const newVisited = { ...r.visited, [selectedMonth]: false };
      try {
        const docRef = doc(db, "children", r.id);
        await updateDoc(docRef, { visited: newVisited });
      } catch (error) { console.error(error); }
      updatedRows.push({ ...r, visited: newVisited });
    }
    setRows(updatedRows);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row.every(cell => !cell)) continue;
        const newRow = {
          name: row[0] || "",
          phone: row[1] || "",
          address: row[2] || "",
          dateOfBirth: typeof row[3] === "number" ? excelDateToJSDate(row[3]) : (row[3] || ""),
          stage: row[4] || "",
          birthCertificate: row[5] || "",
          visited: {},
          page: stage
        };
        try {
          const docRef = await addDoc(childrenCollection, newRow);
          setRows(prev => [...prev, { id: docRef.id, ...newRow }]);
        } catch (error) { console.error(error); }
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleCutSelected = async (targetStage) => {
    const selectedIds = Object.keys(selectedRows).filter(id => selectedRows[id]);
    if (selectedIds.length === 0) return alert("⚠️ اختر الأطفال لنقلهم أولاً");
    if (!window.confirm(`⚠️ هل أنت متأكد من نقل ${selectedIds.length} طفل إلى ${stageNames[targetStage]}?`)) return;

    for (const id of selectedIds) {
      const docRef = doc(db, "children", id);
      await updateDoc(docRef, { page: targetStage });
    }
    setRows(prev => prev.filter(r => !selectedIds.includes(r.id)));
    setSelectedRows({});
  };

  const filteredRows = useMemo(() => {
    return rows
      .filter(r => r.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }, [rows, search]);

  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredRows.slice(indexOfFirstRow, indexOfLastRow);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  return (
    <div className="min-h-screen p-6">
      <div className="backdrop-blur-md bg-white/80 p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-red-900">إدارة بيانات الأطفال - {stageNames[stage]}</h1>

        {/* أدوات التحكم العليا */}
        <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
          <input
            type="text"
            placeholder="🔍 ابحث عن اسم الطفل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="p-2 border rounded-xl flex-1 min-w-[180px]"
          />
          <input
            type="month"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="p-2 border rounded-xl"
          />
          <button onClick={addRow} className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition">➕ إضافة صف جديد</button>
          <label className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 cursor-pointer transition">
            ⬆️ Upload Excel
            <input type="file" accept=".xlsx, .xls" onChange={handleUpload} className="hidden" />
          </label>
          <button onClick={handleReset} className="px-4 py-2 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition">🔄 إعادة ضبط الزيارات</button>
          <button onClick={() => setShowSelection(true)} className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition">اختيار الأطفال للنقل</button>
        </div>

        {/* زر نقل الأطفال المحددين */}
        {showSelection && (
          <div className="mb-4 p-4 border rounded-xl bg-gray-50 flex gap-2 items-center">
            <span>نقل الأطفال المحددين إلى:</span>
            <select className="p-2 border rounded" onChange={e => handleCutSelected(e.target.value)} defaultValue="">
              <option value="" disabled>اختر الصف</option>
              <option value="grade1">سنة أولى</option>
              <option value="grade2">سنة ثانية</option>
              <option value="grade3">سنة ثالثة</option>
              <option value="grade4">سنة رابعة</option>
              <option value="grade5">سنة خامسة</option>
              <option value="grade6">سنة سادسة</option>
            </select>
            <button
              onClick={() => alert("⚠️ هذا الزر مقفول حاليًا")}
              disabled
              className="px-4 py-2 bg-gray-400 text-white rounded flex items-center gap-1 cursor-not-allowed opacity-70"
            >
              🔒 مقفول
            </button>
            <button onClick={() => setShowSelection(false)} className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500">إلغاء</button>
          </div>
        )}

        {/* جدول البيانات */}
        <div className="overflow-x-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          <table className="w-full border shadow rounded-xl overflow-hidden text-center min-w-[700px]">
            <thead className="bg-red-800 text-white text-lg">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">اسم الطفل</th>
                <th className="p-3">رقم الهاتف</th>
                <th className="p-3">العنوان</th>
                <th className="p-3">تاريخ الميلاد</th>
                <th className="p-3">المرحلة</th>
                <th className="p-3">شهادة الميلاد</th>
                <th className="p-3">تمت الزيارة ✅</th>
                {showSelection && <th className="p-3">اختيار للنقل</th>}
                <th className="p-3">حذف</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((row, index) => (
                <tr key={row.id} className="even:bg-gray-100 text-lg">
                  <td className="p-3">{indexOfFirstRow + index + 1}</td>
                  <td className="p-3"><input value={row.name} onChange={e => handleChange(row.id, "name", e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="p-3"><input value={row.phone} onChange={e => handleChange(row.id, "phone", e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="p-3"><input value={row.address} onChange={e => handleChange(row.id, "address", e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="p-3"><input value={row.dateOfBirth} onChange={e => handleChange(row.id, "dateOfBirth", e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="p-3"><input value={row.stage} onChange={e => handleChange(row.id, "stage", e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="p-3"><input value={row.birthCertificate} onChange={e => handleChange(row.id, "birthCertificate", e.target.value)} className="w-full p-1 border rounded" /></td>
                  <td className="p-3"><input type="checkbox" checked={row.visited[selectedMonth] || false} onChange={e => handleChange(row.id, "visited", e.target.checked)} className="w-6 h-6" /></td>
                  {showSelection && (
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={!!selectedRows[row.id]}
                        onChange={e => setSelectedRows(prev => ({ ...prev, [row.id]: e.target.checked }))}
                        className="w-6 h-6"
                      />
                    </td>
                  )}
                  <td className="p-3"><button onClick={() => handleDelete(row.id)} className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600">❌</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6 flex-wrap">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              السابق
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded border ${
                  currentPage === page
                    ? "bg-red-800 text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded border bg-white disabled:opacity-50"
            >
              التالي
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
