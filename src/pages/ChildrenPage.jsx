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

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function ChildRow({ row, index, onUpdate, onDelete }) {
  const [local, setLocal] = useState(row);

  const debouncedUpdate = useCallback(
    debounce((field, value) => {
      onUpdate(row.id, field, value);
    }, 800),
    [row.id, onUpdate]
  );

  const handleChange = (field, value) => {
    setLocal(prev => ({ ...prev, [field]: value }));
    debouncedUpdate(field, value);
  };

  return (
    <tr className="even:bg-gray-100 text-lg">
      <td className="p-3">{index + 1}</td>

      <td className="p-3">
        <input
          value={local.name}
          onChange={e => handleChange("name", e.target.value)}
          className="w-full p-1 border rounded"
        />
      </td>

      <td className="p-3">
        <input
          type="number"
          value={local.age}
          onChange={e => handleChange("age", Number(e.target.value))}
          className="w-full p-1 border rounded"
        />
      </td>

      <td className="p-3">
        <input
          value={local.level}
          onChange={e => handleChange("level", e.target.value)}
          className="w-full p-1 border rounded"
        />
      </td>

      <td className="p-3">
        <input
          value={local.phone}
          onChange={e => handleChange("phone", e.target.value)}
          className="w-full p-1 border rounded"
        />
      </td>

      {/* 🆕 خانة العنوان */}
      <td className="p-3">
        <input
          value={local.address || ""}
          onChange={e => handleChange("address", e.target.value)}
          className="w-full p-1 border rounded"
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

export default function ChildrenPage() {
  const [rows, setRows] = useState([]);
  const childrenCollection = collection(db, "children");

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(childrenCollection);
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetch();
  }, []);

  const addRow = async () => {
    const newRow = { name: "", age: "", level: "", phone: "", address: "" };
    const docRef = await addDoc(childrenCollection, newRow);

    setRows(prev => [...prev, { id: docRef.id, ...newRow }]);
  };

  const updateRow = async (id, field, value) => {
    await updateDoc(doc(db, "children", id), { [field]: value });

    setRows(prev =>
      prev.map(r => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const deleteRow = async id => {
    await deleteDoc(doc(db, "children", id));
    setRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen p-6 bg-[url('/church-bg.jpg')] bg-cover bg-center bg-fixed">
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-center text-red-900">
          👼 إدارة الأطفال
        </h1>

        <button
          onClick={addRow}
          className="mb-4 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
        >
          ➕ إضافة طفل
        </button>

        <table className="w-full border shadow rounded-xl overflow-hidden text-center">
          <thead className="bg-red-800 text-white text-lg">
            <tr>
              <th className="p-3">#</th>
              <th className="p-3">الاسم</th>
              <th className="p-3">السن</th>
              <th className="p-3">المرحلة</th>
              <th className="p-3">رقم ولي الأمر</th>
              <th className="p-3">العنوان</th> {/* 🆕 */}
              <th className="p-3">حذف</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, index) => (
              <ChildRow
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
