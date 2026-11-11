import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "./Icons";

export interface AngleSlot {
  id: string;
  label: string;
  required?: boolean;
  isDetail?: boolean;
}

export const ANGLE_SLOTS: AngleSlot[] = [
  { id: "1. Front View", label: "1. Front View", required: true },
  { id: "2. Left Side View", label: "2. Left Side View" },
  { id: "3. Right Side View", label: "3. Right Side View" },
  { id: "4. Back View", label: "4. Back View", required: true },
  { id: "5. 45° Front Angle", label: "5. 45° Front Angle" },
  { id: "6. 45° Back Angle", label: "6. 45° Back Angle" },
  { id: "7. Close-up Fabric Texture", label: "7. Close-up Fabric Texture", isDetail: true },
  { id: "8. Collar/Waistband Detail", label: "8. Collar/Waistband Detail", isDetail: true },
  { id: "9. Sleeve/Hem Detail", label: "9. Sleeve/Hem Detail", isDetail: true },
  { id: "10. Pocket Detail", label: "10. Pocket Detail", isDetail: true }
];

interface SellerUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProduct: (productData: any) => void;
}

export default function SellerUploadModal({
  isOpen,
  onClose,
  onSaveProduct
}: SellerUploadModalProps) {
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("Hoodies");
  const [price, setPrice] = useState("2499");
  const [stock, setStock] = useState("5");
  const [anglePhotos, setAnglePhotos] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileUpload = (angleId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAnglePhotos((prev) => ({
        ...prev,
        [angleId]: base64
      }));
      setValidationError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (angleId: string) => {
    setAnglePhotos((prev) => {
      const next = { ...prev };
      delete next[angleId];
      return next;
    });
  };

  const handleSubmit = async () => {
    setValidationError(null);

    // Validation 1: Product Name & Price
    if (!productName.trim()) {
      setValidationError("Please enter a product title.");
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setValidationError("Please enter a valid price.");
      return;
    }

    // Validation 2: Mandatory Front View
    if (!anglePhotos["1. Front View"]) {
      setValidationError("⚠️ Front View photo is REQUIRED to publish!");
      return;
    }

    // Validation 3: Mandatory Back View
    if (!anglePhotos["4. Back View"]) {
      setValidationError("⚠️ Back View photo is REQUIRED to publish!");
      return;
    }

    // Validation 4: At least 1 Detail Shot Required
    const hasDetail =
      Boolean(anglePhotos["7. Close-up Fabric Texture"]) ||
      Boolean(anglePhotos["8. Collar/Waistband Detail"]) ||
      Boolean(anglePhotos["9. Sleeve/Hem Detail"]) ||
      Boolean(anglePhotos["10. Pocket Detail"]);

    if (!hasDetail) {
      setValidationError("⚠️ At least one Detail Shot (Fabric, Collar, Sleeve, or Pocket) is REQUIRED!");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: productName,
        category,
        price,
        stock: parseInt(stock, 10) || 5,
        imageUrl: anglePhotos["1. Front View"], // Primary thumbnail
        angleMap: anglePhotos // Explicitly keyed angle URLs object
      };

      await onSaveProduct(payload);
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setValidationError("Failed to publish product. Please try again.");
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="bg-white w-full max-w-md h-[90vh] rounded-t-[28px] md:rounded-[28px] border border-slate-200 shadow-2xl flex flex-col overflow-hidden text-[#1A1A1A]"
        >
          {/* Header */}
          <div className="p-4 bg-[#0d7d6f] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-black text-white">
                <Icons.AddAPhoto size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Upload Garment (10 Angles)</h3>
                <p className="text-[10px] font-bold text-teal-200">Explicit Angle Keying • Mandatory Front, Back & Detail</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white active:scale-90"
            >
              <Icons.Close size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#F7F7FA]">
            {/* Validation Banner */}
            {validationError && (
              <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-700 text-xs font-bold flex items-center gap-2 shadow-sm">
                <Icons.Info size={18} className="shrink-0 text-red-600" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Product Meta Input Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                  PRODUCT TITLE
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Vintage Oversized Fleece Hoodie"
                  className="w-full bg-[#F7F7FA] border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#1A1A1A] outline-none focus:border-[#0d7d6f]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    CATEGORY
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F7F7FA] border border-slate-300 rounded-xl px-2 py-2 text-xs font-bold outline-none"
                  >
                    <option value="Hoodies">Hoodies</option>
                    <option value="Jeans">Jeans</option>
                    <option value="Shirts">Shirts</option>
                    <option value="T-Shirts">T-Shirts</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    PRICE (₹)
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-[#F7F7FA] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] outline-none"
                  />
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
                    STOCK
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full bg-[#F7F7FA] border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-[#1A1A1A] outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 10 Labeled Upload Slots */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#1A1A1A] uppercase tracking-wider">
                  10 ANGULAR VIEW SLOTS
                </span>
                <span className="text-[10px] font-bold text-[#0d7d6f] bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                  {Object.keys(anglePhotos).length}/10 Uploaded
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {ANGLE_SLOTS.map((slot) => {
                  const uploadedUrl = anglePhotos[slot.id];
                  return (
                    <div
                      key={slot.id}
                      className={`relative bg-white rounded-2xl border p-2.5 shadow-sm flex flex-col justify-between transition-all ${
                        uploadedUrl ? "border-[#0d7d6f]" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[9px] font-black text-slate-700 truncate pr-1">
                          {slot.label}
                        </span>
                        {slot.required && (
                          <span className="text-[8px] font-black text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase border border-red-200">
                            REQ
                          </span>
                        )}
                        {slot.isDetail && !slot.required && (
                          <span className="text-[8px] font-black text-[#0d7d6f] bg-teal-50 px-1.5 py-0.5 rounded uppercase border border-teal-200">
                            DETAIL
                          </span>
                        )}
                      </div>

                      {uploadedUrl ? (
                        <div className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200">
                          <img src={uploadedUrl} className="w-full h-full object-cover" alt={slot.label} />
                          <button
                            onClick={() => handleRemovePhoto(slot.id)}
                            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md active:scale-90"
                          >
                            <Icons.Close size={12} />
                          </button>
                        </div>
                      ) : (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 hover:border-[#0d7d6f] flex flex-col items-center justify-center cursor-pointer bg-slate-50 hover:bg-teal-50/50 transition-all p-2 text-center">
                          <Icons.AddAPhoto size={22} className="text-[#0d7d6f] mb-1" />
                          <span className="text-[9px] font-black text-slate-600">UPLOAD PHOTO</span>
                          <span className="text-[8px] text-slate-400 font-bold mt-0.5">JPG / PNG</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(slot.id, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full h-13 bg-[#0d7d6f] text-white font-black rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all text-xs tracking-wider uppercase"
            >
              {isSubmitting ? "PUBLISHING GARMENT..." : "PUBLISH 10-ANGLE PRODUCT"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
