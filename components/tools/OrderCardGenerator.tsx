'use client';

import { useState, useRef, useEffect, ChangeEvent } from 'react';
import Head from 'next/head';


// Define the InlineEdit component here
const InlineEdit = ({
  value,
  onChange,
  className = "",
  style = {},
}: {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(value);

  // Update the inline text if value prop changes
  useEffect(() => {
    setText(value);
  }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (text !== value) {
      onChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      setIsEditing(false);
      if (text !== value) {
        onChange(text);
      }
    }
  };

  return (
    <div
      className={className}
      style={style}
      onClick={() => !isEditing && setIsEditing(true)}
    >
      {isEditing ? (
        <input
          type="text"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="border rounded px-2 py-1 focus:outline-none w-full"
        />
      ) : (
        <span>{value || "Not specified"}</span>
      )}
    </div>
  );
};

interface OrderItem {
  id: string;
  style_number: string;
  description: string;
  size: string;
  attr_2: string; // color
  qty: string;
  amount: string;
  project_id: string;
}

interface Order {
  order_id: string;
  customer_name: string;
  customer_po: string | null;
  date_due: string;
  project_id: string | null;
  order_items: OrderItem[];
}

interface AggregatedItem {
  id: string;
  style_number: string;
  description: string;
  attr_2: string;
  qty: number;
  sizes: string[];
  amount: string;
  project_id: string | null;
}

const API_TOKEN = '6002f37a06cc09759259a7c5eabff471';



export default function OrderCardGenerator() {
  const [orderNumber, setOrderNumber] = useState('');
  const [orderData, setOrderData] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fabricContents, setFabricContents] = useState<Record<string, string>>({});
  const [images, setImages] = useState<Record<string, string>>({});
  const [colors, setColors] = useState<Record<string, string>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [html2canvas, setHtml2Canvas] = useState<any>(null);

  useEffect(() => {
    import('html2canvas').then((mod) => {
      setHtml2Canvas(() => mod.default);
    });
  }, []);

  const setCardRef = (itemId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current[itemId] = el;
    }
  };

  const fetchOrderData = async () => {
    if (!orderNumber) return;

    setLoading(true);
    setError('');

    try {
      const time = Math.floor(Date.now() / 1000);
      const params = { token: API_TOKEN, time: time.toString() };
      const queryString = new URLSearchParams(params).toString();
      const apiUrl = `/api/proxy/orders/${orderNumber}?${queryString}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Details:', { status: response.status, statusText: response.statusText, url: response.url, errorData });
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.response || data.response.length === 0) {
        throw new Error('Order not found');
      }

      setOrderData(data.response[0]);
    } catch (err) {
      console.error('Full Error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

const aggregateItems = (items: OrderItem[]): AggregatedItem[] => {
  const grouped: Record<string, AggregatedItem> = {};

  for (const item of items) {
    const key = `${item.style_number}_${item.attr_2}`;
    if (!grouped[key]) {
      grouped[key] = {
        id: key,
        style_number: item.style_number,
        description: item.description,
        attr_2: item.attr_2,
        qty: 0,
        sizes: [],
        amount: "0",
        project_id: null,  // Initialize amount as a string for consistency
      };
    }
    grouped[key].qty += parseInt(item.qty);
    grouped[key].sizes.push(item.size);
    grouped[key].project_id = item.project_id;
    grouped[key].amount = (
      parseFloat(grouped[key].amount) + parseFloat(item.amount)
    ).toFixed(2); // Sum amounts and format to 2 decimal places
  }

  return Object.values(grouped);
};


const exportCardAsImage = async (itemId: string) => {
  const cardElement = cardRefs.current[itemId];
  if (!cardElement || !html2canvas) return;
  
  // Temporarily hide remove buttons
  const removeButtons = cardElement.querySelectorAll('.remove-button');
  removeButtons.forEach((btn) => {
    (btn as HTMLElement).style.display = 'none';
  });
  
  try {
    const canvas = await html2canvas(cardElement, {
      backgroundColor: null,
      scale: 2, // Higher quality export
      logging: true,
      useCORS: true,
      allowTaint: true,
    });
    
    const link = document.createElement('a');
    link.download = `order-${orderData?.order_id}-item-${itemId}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    console.error('Error exporting card:', err);
    setError('Failed to export card as image');
  } finally {
    // Restore the remove buttons
    removeButtons.forEach((btn) => {
      (btn as HTMLElement).style.display = '';
    });
  }
};


    const handleRemoveImage = (itemId: string) => {
    setImages(prev => {
      const newImages = {...prev};
      delete newImages[itemId];
      return newImages;
    });
  };

  const exportAllCards = async () => {
    if (!orderData) return;
    const aggregatedItems = aggregateItems(orderData.order_items);

    try {
      for (const item of aggregatedItems) {
        await exportCardAsImage(item.id);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    } catch (err) {
      console.error('Error exporting all cards:', err);
      setError('Failed to export some cards');
    }
  };

  const handleFabricContentChange = (itemId: string, content: string) => {
    setFabricContents(prev => ({ ...prev, [itemId]: content }));
  };

    // Update functions for PO and CUSTOMER (modifying orderData)
  const handleCustomerChange = (newCustomer: string) => {
    if (orderData)
      setOrderData({ ...orderData, customer_name: newCustomer });
  };

  const handlePOChange = (newPO: string) => {
    if (orderData)
      setOrderData({ ...orderData, customer_po: newPO });
  };

  // Update function for COLOR (stored separately per card)
  const handleColorChange = (itemId: string, newColor: string) => {
    setColors((prev) => ({ ...prev, [itemId]: newColor }));
  };

  const handleImageUpload = (itemId: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImages(prev => ({ ...prev, [itemId]: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const aggregatedItems = orderData ? aggregateItems(orderData.order_items) : [];

return (
  <div className="max-w-[1200px] mx-auto p-5">
    {/* <Head>
      <title>Order Card Generator</title>
    </Head> */}

    <h1 className="text-2xl font-bold mb-5">Order Card Generator</h1>

    <div className="flex flex-wrap gap-2.5 items-center my-5">
      <input
        type="text"
        value={orderNumber}
        onChange={(e) => setOrderNumber(e.target.value)}
        className="px-3 py-2 rounded border border-gray-300 flex-1"
        placeholder="Enter order number"
      />

      <button
        className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        onClick={fetchOrderData}
        disabled={loading}
      >
        {loading ? "Loading..." : "Fetch Order"}
      </button>
    </div>

    {error && (
      <div className="p-2.5 text-red-600 bg-red-100 rounded mb-5">
        {error}
      </div>
    )}

    {orderData && (
      <div>
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            Order #{orderData.order_id} - {orderData.customer_name}
          </h2>
          <button
            onClick={exportAllCards}
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Export All Cards
          </button>
        </div>

        {/* Cards Grid: 2 cards per row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {aggregatedItems.map((item) => (
            <div key={item.id} className="flex flex-col">
              {/* Card Container */}
              <div
                ref={setCardRef(item.id)}
                className="bg-white p-4 rounded-lg shadow-md mb-3 border border-gray-200"
                style={{
                  width: "420px",
                  minHeight: "520px", // min height height to house all content
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {/* Top Section */}
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="font-bold whitespace-nowrap px-1 mb-1">
                      ORDER #:
                    </div>
                    <div>{orderData.order_id}</div>

                    <div className="font-bold whitespace-nowrap px-1 mb-1">
                      CUT #:
                    </div>
                    <div>{item.project_id || "N/A"}</div>
                  </div>

                    {/* Fabric Section with inline editing */}
                    <div className="mb-2">
                      <div className="font-bold whitespace-nowrap px-1 mb-1">
                        FABRIC:
                      </div>
                      <div className="p-1 bg-gray-50 rounded break-words">
                        <InlineEdit
                          value={fabricContents[item.id] || ""}
                          onChange={(val) =>
                            handleFabricContentChange(item.id, val)
                          }
                        />
                      </div>
                    </div>

                  {/* Description Section */}
                  <div className="mb-3">
                    <div className="font-bold whitespace-nowrap px-1 mb-1">
                      DESCRIPTION:
                    </div>
                    <div className="p-1 bg-gray-50 rounded truncate-2-lines">
                      {item.description}
                    </div>
                  </div>
                </div>

                {/* Image Section with Remove Button */}
                <div className="relative flex justify-center items-center my-2 h-40 mb-4 bg-gray-100 rounded">
                  {images[item.id] ? (
                    <>
                      <img
                        src={images[item.id]}
                        alt="Product"
                        className="max-h-full max-w-full object-contain"
                      />
                      <button
                        onClick={() => handleRemoveImage(item.id)}
                        className="remove-button absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </>
                  ) : (
                    <div className="text-gray-400">Product Image</div>
                  )}
                </div>

{/* Details Section - Four Columns */}
                  <div className="grid grid-cols-4 gap-x-4 gap-y-2 text-sm flex-grow">
                    <div className="flex flex-col">
                      <span className="font-bold mb-1">CANCEL DATE:</span>
                      <span>{orderData.date_due}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold mb-1">QTY ORDER:</span>
                      <span>{item.qty}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold mb-1">AMOUNT:</span>
                      <span>${parseFloat(item.amount).toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold mb-1">CUSTOMER:</span>
                      <InlineEdit
                        value={orderData.customer_name}
                        onChange={handleCustomerChange}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold mb-1">PO:</span>
                      <InlineEdit
                        value={orderData.customer_po || ""}
                        onChange={handlePOChange}
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold mb-1">COLOR:</span>
                      <InlineEdit
                        value={colors[item.id] || item.attr_2}
                        onChange={(val) => handleColorChange(item.id, val)}
                      />
                    </div>
                    {/* STYLE field remains non-editable for now */}
                    <div className="flex flex-col">
                      <span className="font-bold mb-1">STYLE:</span>
                      <span>{item.style_number}</span>
                    </div>
                    {/* SIZES row spanning full width */}
                    <div className="col-span-4 flex flex-col">
                      <span className="font-bold mb-1">SIZES:</span>
                      <div className="flex flex-wrap gap-1">
                        {item.sizes.map((size) => (
                          <span
                            key={size}
                            className="bg-gray-100 px-1 rounded whitespace-nowrap"
                          >
                            {size}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              {/* Controls */}
              <div className="space-y-2 mt-auto">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fabric Content
                  </label>
                  <input
                    type="text"
                    value={fabricContents[item.id] || ""}
                    onChange={(e) =>
                      handleFabricContentChange(item.id, e.target.value)
                    }
                    className="border rounded px-2 py-1 w-full text-sm"
                    placeholder="Enter fabric content"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Product Image
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(item.id, e)}
                      className="text-sm flex-grow"
                    />
                    {images[item.id] && (
                      <button
                        onClick={() => handleRemoveImage(item.id)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => exportCardAsImage(item.id)}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 w-full"
                >
                  Export Card
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

}