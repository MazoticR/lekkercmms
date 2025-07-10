// pages/tools/boxing-assistant.tsx

import Head from "next/head";
import { useState, useEffect } from "react";
import type { NextPage } from "next";

const API_TOKEN = "6002f37a06cc09759259a7c5eabff471";

type PartialBox = {
  id: string;
  qty: number;
};

const BoxingAssistantPage: NextPage = () => {
  const [orderId, setOrderId] = useState("");
  const [orderQty, setOrderQty] = useState<number | null>(null);
  const [boxCapacity, setBoxCapacity] = useState(0);
  const [fullBoxes, setFullBoxes] = useState(0);
  const [partialBoxes, setPartialBoxes] = useState<PartialBox[]>([]);
  const [newPartialId, setNewPartialId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // After adding a partial box, focus & select its input
  useEffect(() => {
    if (!newPartialId) return;
    const el = document.getElementById(
      `partial-${newPartialId}`
    ) as HTMLInputElement | null;
    if (el) {
      el.focus();
      el.select();
    }
    setNewPartialId(null);
  }, [newPartialId]);

  // Fetch total qty for an order
  const fetchOrderQty = async () => {
    if (!orderId.trim()) {
      setError("Ingresa un Order ID");
      return;
    }
    setError("");
    setOrderQty(null);
    setLoading(true);

    try {
      const time = Math.floor(Date.now() / 1000);
      const resp = await fetch(
        `/api/proxy/orders/${orderId}?token=${API_TOKEN}&time=${time}`
      );
      if (!resp.ok) throw new Error(`Status ${resp.status}`);
      const raw = await resp.json();
      const order = Array.isArray(raw.response) ? raw.response[0] : null;
      if (!order || !order.qty) {
        throw new Error("No se encontró ese Order ID");
      }

      setOrderQty(parseFloat(order.qty));
      setBoxCapacity(0);
      setFullBoxes(0);
      setPartialBoxes([]);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addPartialBox = () => {
    const id = crypto.randomUUID();
    setPartialBoxes((prev) => [...prev, { id, qty: 0 }]);
    setNewPartialId(id);
  };

  const updatePartialQty = (id: string, qty: number) => {
    setPartialBoxes((prev) =>
      prev.map((b) => (b.id === id ? { ...b, qty } : b))
    );
  };

  const removePartialBox = (id: string) => {
    setPartialBoxes((prev) => prev.filter((b) => b.id !== id));
  };

  // Compute totals and percentage
  const totalFullQty = fullBoxes * boxCapacity;
  const totalPartialQty = partialBoxes.reduce((sum, b) => sum + b.qty, 0);
  const boxedQty = totalFullQty + totalPartialQty;
  const percent =
    orderQty && orderQty > 0 ? Math.min((boxedQty / orderQty) * 100, 100) : 0;

  return (
    <>
      <Head>
        <title>Boxing Assistant</title>
      </Head>

      <main className="p-6 max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Boxing Assistant
        </h1>

        {/* Fetch Order */}
        <div className="flex items-center space-x-3">
          <input
            type="text"
            placeholder="Order ID"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && fetchOrderQty()}
            className="flex-1 border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={fetchOrderQty}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Cargando…" : "Fetch Order"}
          </button>
        </div>
        {error && <p className="text-red-600">{error}</p>}

        {/* Display Total */}
        {orderQty !== null && (
          <p className="text-gray-700">
            Total Order Qty: <span className="font-semibold">{orderQty}</span>
          </p>
        )}

        {/* Box Settings */}
        {orderQty !== null && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-1">
                  Box Capacity
                </label>
                <input
                  type="number"
                  min={0}
                  value={boxCapacity}
                  onChange={(e) =>
                    setBoxCapacity(parseInt(e.target.value) || 0)
                  }
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-1">
                  Full Boxes
                </label>
                <input
                  type="number"
                  min={0}
                  value={fullBoxes}
                  onChange={(e) =>
                    setFullBoxes(parseInt(e.target.value) || 0)
                  }
                  className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Partial Boxes */}
            <div className="space-y-2">
              <button
                onClick={addPartialBox}
                className="inline-block px-3 py-1 bg-green-600 text-white rounded shadow hover:bg-green-700"
              >
                + Add Partial Box
              </button>

              {partialBoxes.map((box, i) => (
                <div key={box.id} className="flex items-center space-x-2">
                  <span className="w-6">#{i + 1}</span>
                  <input
                    id={`partial-${box.id}`}
                    type="number"
                    min={0}
                    placeholder="Qty"
                    value={box.qty}
                    onChange={(e) =>
                      updatePartialQty(box.id, parseInt(e.target.value) || 0)
                    }
                    className="w-20 border rounded px-2 py-1 focus:ring-2 focus:ring-blue-400"
                  />
                  <button
                    onClick={() => removePartialBox(box.id)}
                    className="px-2 py-1 text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            {/* Progress */}
            <div className="mt-4 space-y-1">
              <p className="font-medium">
                Boxed Qty:{" "}
                <span className="text-blue-600">{boxedQty}</span> /{" "}
                <span className="text-gray-800">{orderQty}</span> (
                {percent.toFixed(1)}%)
              </p>
              <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
                <div
                  className="h-full bg-blue-600"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
};

export default BoxingAssistantPage;
