import React, { useEffect, useState, useCallback } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

// Debounce
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function MassRow({ row, index, onUpdate, onDelete }) {
  const [localRow, setLocalRow] = useState(row);

  const debouncedUpdate = useCallback(
    debounce((field, value) => {
      onUpdate(row.id, field, value);
    }, 1000),
    [row.id, onUpdate]
  );

  const handleChange = (field, value) => {
    setLocalRow(prev => ({ ...prev, [field]: value }));
    debouncedUpdate(field, value);
  };

  return (
    <tr className="even:bg-gray-100 text-lg">
      <td className="p-3">{index + 1}</td>
      <td className="p-3">
        <input
          value={localRow.name}
          onChange={e => handleChange("name", e.target.value)}
          className="w-full p-1 border rounded"
        />
      </td>
      <td className="p-3">
        <input
          type="checkbox"
          checked={localRow.mass}
          onChange={e => handleChange("mass", e.target.checked)}
        />
      </td>
      <td className="p-3">
        <input
          type="date"
          value={localRow.date}
          onChange={e => handleChange("date", e.target.value)}
          className="p-1 border rounded"
        />
      </td>
      <td className="p-3">
        <button
          onClick={() => onDelete(row.id)}
          className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          ❌
        </button>
      </td>
    </tr>
  );
}

export default function MassPage() {
  const [rows, setRows] = useState([]);
  const massCollection = collection(db, "mass");

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(massCollection);
      setRows(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchData();
  }, []);

  const addRow = async () => {
    const today = new Date().toISOString().split("T")[0];
    const newRow = { name: "", mass: false, date: today };
    const docRef = await addDoc(massCollection, newRow);
    setRows(prev => [...prev, { id: docRef.id, ...newRow }]);
  };

  const updateRow = async (id, field, value) => {
    const docRef = doc(db, "mass", id);
    await updateDoc(docRef, { [field]: value });
    setRows(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const deleteRow = async id => {
    await deleteDoc(doc(db, "mass", id));
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen p-6 bg-[url('/church-bg.jpg')] bg-cover bg-center bg-fixed">
      <div className="backdrop-blur-md bg-white/80 p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-red-900">
          ⛪ حضور القداس
        </h1>

        <button
          onClick={addRow}
          className="mb-4 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
        >
          ➕ إضافة صف جديد
        </button>

        <table className="w-full border shadow rounded-xl overflow-hidden text-center">
          <thead className="bg-red-800 text-white text-lg">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">اسم الطفل</th>
              <th className="p-3">حضر القداس</th>
              <th className="p-3">التاريخ</th>
              <th className="p-3">حذف</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <MassRow
                key={row.id}
                row={row}
                index={index}
                onUpdate={updateRow}
                onDelete={deleteRow}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
