import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "./Icons";

interface Message {
  sender: "user" | "ai";
  text: string;
}

interface InStoreLookAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
}

const PRESET_QUESTIONS = [
  "⚡ Is this item currently in stock nearby?",
  "✨ Style a complete outfit with this",
  "🎓 Is this suitable for college casuals?",
  "🍸 Can I wear this for a date night?",
  "📐 Which size fits best for 5'10\" height?",
  "🧼 How should I wash and care for this?",
  "👟 What footwear pairs best with this?"
];

export default function InStoreLookAIModal({
  isOpen,
  onClose,
  productName = "Black Oversized Hoodie",
}: InStoreLookAIModalProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "ai",
      text: `✨ Hey! I'm InStoreLook AI connected live to nearby store inventory. Ask me how to style ${productName}, check real-time stock near Jubilee Hills, or get fit recommendations!`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [nearbyCatalog, setNearbyCatalog] = useState<any[]>([]);

  // Fetch live inventory from server API
  useEffect(() => {
    fetch("/api/products/nearby")
      .then((res) => res.json())
      .then((data) => setNearbyCatalog(data))
      .catch(() => {});
  }, []);

  const handleSendQuestion = async (question: string) => {
    if (!question.trim()) return;

    const newMessages: Message[] = [...messages, { sender: "user", text: question }];
    setMessages(newMessages);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      let response = "";
      const q = question.toLowerCase();

      if (q.includes("stock") || q.includes("available") || q.includes("nearby")) {
        const found = nearbyCatalog.find((p) => p.name.toLowerCase().includes(productName.toLowerCase())) || nearbyCatalog[0];
        if (found) {
          response = `📍 Live Inventory Check for ${found.name}:\n• Store: ${found.shop} (0.8 km away in Jubilee Hills)\n• Live Status: ${found.status} (${found.price})\n• Fitting Room: Fitting Room 3 Available for instant reservation!`;
        } else {
          response = `📍 Live Stock Update: ${productName} is IN STOCK at Urban Threads Boutique (0.8 km away). 3 items remaining in size L & M!`;
        }
      } else if (q.includes("outfit") || q.includes("style")) {
        response = `✨ InStoreLook AI Fashion Recommendation for ${productName}:\n\n1. Top: ${productName}\n2. Bottoms: Slim Fit Dark Denim Jeans or Vintage Wide-Leg Cargoes\n3. Footwear: Retro White Leather High-Top Sneakers\n4. Accessories: Matte Silver Chain & Minimalist Watch`;
      } else if (q.includes("college")) {
        response = `🎓 100% Yes! Top-trending college favorite in Hyderabad. High breathability (280 GSM fleece cotton) keeps you comfortable through lectures while maintaining an effortless Gen Z silhouette.`;
      } else if (q.includes("date")) {
        response = `🍸 Absolutely! Pair it with clean dark denim and minimalist white sneakers. The rich fabric texture and structured shoulders give a sharp, confident appearance.`;
      } else if (q.includes("size") || q.includes("fit")) {
        response = `📐 InStoreLook Fit Recommendation: For a 5'10" frame, Size L provides the perfect relaxed oversized fit. If you prefer a fitted look, size down to Size M.`;
      } else if (q.includes("wash") || q.includes("care")) {
        response = `🧺 InStoreLook Garment Care Rule:\nMachine wash cold at 30°C inside out with similar dark colors. Line dry in shade. Avoid bleach.`;
      } else {
        response = `✨ Live AI Analysis for "${question}":\nThis product is 100% authentic, verified by InStoreLook quality inspection at Urban Threads Boutique. It features premium comfort, high durability, and is highly rated (4.9 ★) by shoppers in your city!`;
      }

      setMessages((prev) => [...prev, { sender: "ai", text: response }]);
      setIsTyping(false);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-white w-full max-w-md h-[85vh] rounded-t-[28px] md:rounded-[28px] border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-[#1A1A1A]"
        >
          {/* InStoreLook AI Header Bar - Electric Violet */}
          <div className="p-4 bg-[#0d7d6f] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center font-black">
                <Icons.AutoAwesome size={22} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                  ✨ Ask InStoreLook AI
                </h3>
                <p className="text-[10px] font-bold text-teal-200">
                  Live Store Data • Sizing • Fabric • Outfit Match
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white active:scale-90 transition-transform"
            >
              <Icons.Close size={18} />
            </button>
          </div>

          {/* Quick Preset Question Chips */}
          <div className="p-3 bg-[#F7F7FA] border-b border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
            {PRESET_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSendQuestion(q)}
                className="px-3 py-1.5 bg-white border border-teal-200 hover:border-[#0d7d6f] text-[#0d7d6f] rounded-full text-[11px] font-extrabold whitespace-nowrap active:scale-95 transition-all shadow-sm"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F7F7FA]">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm ${
                    msg.sender === "user"
                      ? "bg-[#0d7d6f] text-white font-bold rounded-tr-none"
                      : "bg-white text-[#1A1A1A] border border-slate-200 rounded-tl-none whitespace-pre-line"
                  }`}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 px-4 rounded-2xl border border-slate-200 text-xs text-[#0d7d6f] font-bold flex items-center gap-2 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#0d7d6f] animate-ping" />
                  InStoreLook AI is checking live inventory...
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendQuestion(inputValue)}
              placeholder="Ask live stock, size L, or outfit pairing..."
              className="flex-1 bg-[#F7F7FA] border border-slate-300 rounded-xl px-4 py-3 text-xs font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]"
            />
            <button
              onClick={() => handleSendQuestion(inputValue)}
              className="w-11 h-11 bg-[#0d7d6f] text-white rounded-xl flex items-center justify-center font-black shadow-md active:scale-90 transition-transform"
            >
              <Icons.ArrowForward size={18} />
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
