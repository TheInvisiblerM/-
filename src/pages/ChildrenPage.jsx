import React, { useState, useEffect, useMemo } from "react";
import { db } from "../firebase/firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

const stageNames = {
  angels: "ملايكة",
  grade1: "سنة أولى",
  grade2: "سنة تانية",
  grade3: "سنة تالتة",
  grade4: "سنة رابعة",
  grade5: "سنة خامسة",
  grade6: "سنة سادسة",
};

export default function ChildrenPage() {
  const { stage } = useParams();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  const colRef = collection(db, `${stage}_children`);

  useEffect(() => {
    const fetchChildren = async () => {
      const snap = await getDocs(colRef);
      setChildren(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
      setLoading(false);
    };
    fetchChildren();
  }, [stage]);

  const handleChange = async (id, field, value) => {
    setChildren((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
    await updateDoc(doc(db, `${stage}_children`, id), {
      [field]: value,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm("متأكد إنك عايز تمسح الطفل ده؟")) return;
    await deleteDoc(doc(db, `${stage}_children`, id));
    setChildren((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xl">
        جاري التحميل...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-6">
      {/* العنوان */}
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-red-900 mb-4 break-words px-2">
        إدارة بيانات الأطفال
        <span className="block sm:inline"> – {stageNames[stage]}</span>
      </h1>

      <Card className="rounded-2xl shadow-xl">
        <CardContent className="p-0 sm:p-4">
          {/* Wrapper يمنع سحب الصفحة */}
          <div className="overflow-x-auto overscroll-x-contain -mx-3 sm:mx-0 px-3 sm:px-0">
            <table className="min-w-[700px] w-full border-collapse">
              <thead>
                <tr className="bg-red-900 text-white text-sm sm:text-base">
                  <th className="p-2 text-center">الاسم</th>
                  <th className="p-2 text-center">الموبايل</th>
                  <th className="p-2 text-center">العمر</th>
                  <th className="p-2 text-center">ملاحظات</th>
                  <th className="p-2 text-center">حذف</th>
                </tr>
              </thead>

              <tbody>
                {children.map((child) => (
                  <tr
                    key={child.id}
                    className="even:bg-gray-100 text-sm sm:text-lg"
                  >
                    <td className="p-2">
                      <input
                        value={child.name || ""}
                        onChange={(e) =>
                          handleChange(child.id, "name", e.target.value)
                        }
                        className="w-full p-1 sm:p-2 border rounded text-sm sm:text-base"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={child.phone || ""}
                        onChange={(e) =>
                          handleChange(child.id, "phone", e.target.value)
                        }
                        className="w-full p-1 sm:p-2 border rounded text-sm sm:text-base"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={child.age || ""}
                        onChange={(e) =>
                          handleChange(child.id, "age", e.target.value)
                        }
                        className="w-full p-1 sm:p-2 border rounded text-sm sm:text-base"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        value={child.notes || ""}
                        onChange={(e) =>
                          handleChange(child.id, "notes", e.target.value)
                        }
                        className="w-full p-1 sm:p-2 border rounded text-sm sm:text-base"
                      />
                    </td>

                    <td className="p-2 text-center">
                      <Button
                        variant="destructive"
                        className="text-xs sm:text-sm"
                        onClick={() => handleDelete(child.id)}
                      >
                        حذف
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
