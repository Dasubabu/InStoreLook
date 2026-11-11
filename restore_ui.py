import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

new_ui = """{state.screen === 'add_product_options' && (
            <motion.div
              key="unified_ai_hub"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-x-0 top-0 bottom-[80px] flex flex-col bg-[#f8fbfa] overflow-hidden"
            >
              <header className="flex items-center justify-between px-4 h-14 bg-[#f8fbfa] border-b border-outline-variant sticky top-0 z-50">
                <div className="flex items-center gap-2">
                  <button onClick={handleProductFlowBack} className="p-2 -ml-1 text-[#0d7d6f] active:bg-surface-container rounded-full transition-all"><Icons.ArrowBack size={20} /></button>
                  <h1 className="text-[17px] font-bold text-[#0d7d6f]">Unified AI Upload Hub</h1>
                </div>
                <div className="flex gap-3 items-center text-[#0d7d6f]">
                  <Icons.HelpOutline size={20} />
                  <Icons.CheckCircle size={20} />
                </div>
              </header>

              <main className="flex-1 overflow-y-auto pb-40">
                {/* Top Hub Feature Block */}
                <div className="bg-white px-6 py-6 border-b border-[#e1e8ed] rounded-b-[32px] mb-2 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                  <div className="flex flex-col items-center text-center pb-2">
                    <div className="w-[84px] h-[84px] bg-[#0d7d6f] text-white rounded-[42px] flex flex-col justify-center items-center mb-3.5 shadow-md">
                      <Icons.Camera size={34} />
                    </div>
                    <h2 className="text-[20px] font-semibold text-[#0f2130] mb-1.5 tracking-tight">Quick Scan & List</h2>
                    <p className="text-[11.5px] text-[#55697a] max-w-[240px] leading-[1.6] mb-[22px]">
                      AI identifies items, crops backgrounds, and writes descriptions in 3 seconds.
                    </p>
                    <div className="flex gap-3 w-full justify-center px-1">
                      <label className="flex-1 h-[42px] flex items-center justify-center gap-1.5 bg-[#0d7d6f] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all shadow-md shadow-[#0d7d6f]/20 cursor-pointer">
                        <Icons.AutoAwesome size={18} className="text-white fill-white" />
                        {isUploadingImage ? `Analyzing ${Math.floor(uploadProgress)}%` : "Scan Now"}
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                      </label>
                      <label className="flex-1 h-[42px] flex items-center justify-center gap-1.5 bg-[#ecf2fa] text-[#0d7d6f] border border-[#d2dfef] rounded-xl font-bold text-[13px] active:scale-95 transition-all cursor-pointer">
                        <Icons.AddAPhoto size={18} />
                        {isUploadingImage ? `Wait...` : "Batch Upload"}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                {/* Form Elements */}
                {fashionValidationState === "rejected" && (
                  <div className="px-5 pb-6">
                    <div className="bg-[#fff5f5] border border-[#fbd5d5] rounded-2xl p-5 text-center shadow-sm">
                      <div className="w-[60px] h-[60px] bg-[#fdf2f2] text-[#f05252] rounded-full flex justify-center items-center mx-auto mb-3">
                        <Icons.ErrorOutline size={32} />
                      </div>
                      <h3 className="text-[17px] font-bold text-[#9b1c1c] mb-1.5">Unsupported Image</h3>
                      <p className="text-[13px] text-[#c81e1e] leading-snug mb-4">
                        This image is not related to fashion products. Please upload clothing, footwear, bags, watches, jewellery, or other fashion accessories.
                      </p>

                      <div className="flex flex-col gap-2.5">
                        <button
                          onClick={() => setFashionValidationState("idle")}
                          className="w-full bg-[#9b1c1c] text-white px-5 py-2.5 rounded-xl font-semibold text-[13px] shadow-md shadow-[#9b1c1c]/20 flex items-center justify-center gap-1.5"
                        >
                          <Icons.Camera size={16} /> Open Camera Again
                        </button>
                        <button
                          onClick={() => setFashionValidationState("idle")}
                          className="w-full bg-white border border-[#9b1c1c] text-[#9b1c1c] px-5 py-2.5 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1.5"
                        >
                          <Icons.AddAPhoto size={16} /> Upload Another Image
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {(fashionValidationState === "enhancing" || fashionValidationState === "enhanced") && uploadedImageUrl && (
                  <div className="px-5 pb-4">
                    <div className="relative w-full h-[220px] rounded-2xl overflow-hidden bg-black shadow-sm group">
                      <img
                        src={showEnhanced && enhancedImageUrl && fashionValidationState === "enhanced" ? enhancedImageUrl : `data:image/jpeg;base64,${uploadedImageUrl}`}
                        className={`w-full h-full object-cover transition-all duration-700 ease-in-out ${fashionValidationState === "enhancing" ? "blur-md brightness-75 scale-105" : "blur-0 brightness-100 contrast-100 scale-100"}`}
                        alt="Uploaded Product"
                      />

                      {fashionValidationState === "enhancing" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <Icons.AutoAwesome size={32} className="text-white animate-pulse mb-2" />
                          <p className="text-white font-bold tracking-wider text-[12px] uppercase">Enhancing Photo...</p>
                        </div>
                      )}

                      {fashionValidationState === "enhanced" && (
                        <div className="absolute bottom-3 left-0 right-0 flex justify-center z-10 w-full px-5">
                          <div className="bg-black/60 backdrop-blur-md rounded-full p-1 flex gap-1 items-center">
                            <button onClick={() => setShowEnhanced(false)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${!showEnhanced ? 'bg-white text-black' : 'text-white/80'}`}>Original</button>
                            <button onClick={() => setShowEnhanced(true)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold transition-all ${showEnhanced ? 'bg-[#0d7d6f] text-white' : 'text-white/80'}`}>Enhanced</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(fashionValidationState === "idle" || fashionValidationState === "enhanced") && (
                  <div className="px-5 pb-6 space-y-[20px]">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#445b6b] ml-1">Product Name</label>
                      <input
                        type="text"
                        value={productFormData.name}
                        onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                        placeholder={fashionValidationState === "enhanced" && !productFormData.name ? "AI couldn't detect this. Please enter manually." : "Men's Classic Blue Checkered Casual Shirt"}
                        className={`w-full h-[46px] bg-white border rounded-xl px-4 text-[13.5px] font-medium outline-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc] ${getConfidenceStyles('name')}`}
                      />
                    </div>

                    {/* Category / Sub */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#445b6b] ml-1">Category</label>
                        <div className="relative">
                          <select
                            className={`w-full h-[46px] bg-white border rounded-xl px-4 text-[13.5px] font-medium outline-none appearance-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] ${getConfidenceStyles('category')}`}
                            value={productFormData.category}
                            onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value, subcategory: CATEGORIES[e.target.value]?.[0] || "" })}
                          >
                            {Object.keys(CATEGORIES).map((cat) => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                          <Icons.ChevronRight size={18} className="absolute right-3 top-[14px] pointer-events-none text-[#7b8f9e]" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#445b6b] ml-1">Subcategory</label>
                        <div className="relative">
                          <select
                            className={`w-full h-[46px] bg-white border rounded-xl px-4 text-[13.5px] font-medium outline-none appearance-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] ${getConfidenceStyles('subcategory')}`}
                            value={productFormData.subcategory}
                            onChange={(e) => setProductFormData({ ...productFormData, subcategory: e.target.value })}
                          >
                            {CATEGORIES[productFormData.category]?.map((sub) => (
                              <option key={sub} value={sub}>{sub}</option>
                            ))}
                          </select>
                          <Icons.ChevronRight size={18} className="absolute right-3 top-[14px] pointer-events-none text-[#7b8f9e]" />
                        </div>
                      </div>
                    </div>



                    {/* Local Brand Toggle */}
                    <div
                      className="bg-[#f0f6ff] border border-[#d6e4f3] rounded-xl py-3.5 px-4 flex items-center justify-between cursor-pointer"
                      onClick={() => setProductFormData({ ...productFormData, isLocalBrand: !productFormData.isLocalBrand })}
                    >
                      <div>
                        <h4 className="font-semibold text-[13px] text-[#0f2130]">Local Brand</h4>
                        <p className="text-[10px] text-[#6b7f90] mt-[2px]">Highlight as locally manufactured</p>
                      </div>
                      <div className={`w-[42px] h-[22px] rounded-full relative cursor-pointer shadow-inner transition-colors ${productFormData.isLocalBrand ? "bg-[#0d7d6f]" : "bg-[#c2d3e2]"}`}>
                        <div className={`w-[18px] h-[18px] bg-white rounded-full absolute top-[2px] shadow-sm transition-transform ${productFormData.isLocalBrand ? "right-0.5" : "left-0.5"}`} />
                      </div>
                    </div>

                    {/* Brand */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#445b6b] ml-1">Brand Name</label>
                      <input
                        type="text"
                        value={productFormData.brand || ''}
                        onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                        placeholder={fashionValidationState === "enhanced" && !productFormData.brand ? "AI couldn't detect this. Please enter manually." : "e.g. Urban Stitch"}
                        className={`w-full h-[46px] bg-white border rounded-xl px-4 text-[13.5px] font-medium outline-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc] ${getConfidenceStyles('brand')}`}
                      />
                    </div>

                    {/* AI Description */}
                    <div className="space-y-1.5 relative">
                      <div className="flex justify-between items-center ml-1 mb-1">
                        <label className="text-[10px] font-bold text-[#445b6b]">AI-Generated Description</label>
                        <label className="text-[10.5px] font-bold text-[#0d7d6f] flex items-center gap-[3px] cursor-pointer">
                          <Icons.Refresh size={14} className={`text-[#0d7d6f] ${isUploadingImage ? 'animate-spin' : ''}`} />
                          {isUploadingImage ? "Generating..." : "Regenerate"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        </label>
                      </div>
                      <textarea
                        rows={5}
                        placeholder={fashionValidationState === "enhanced" && !productFormData.description ? "AI couldn't detect this. Please enter manually." : "This premium blue checked shirt features a modern windowpane pattern, crafted from 100% breathable cotton for all-day comfort. Designed with a structured collar and a versatile slim fit..."}
                        value={productFormData.description || ''}
                        onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                        className={`w-full bg-white border rounded-xl p-4 text-[12.5px] leading-[1.65] font-medium outline-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#3b4c5b] placeholder:text-[#99abbc] ${getConfidenceStyles('description')}`}
                      />
                    </div>

                    {/* Color Pattern */}
                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#445b6b] ml-1">Primary Color</label>
                        <input type="text" placeholder={fashionValidationState === "enhanced" && !productFormData.color ? "AI couldn't detect this. Please enter manually." : "Navy Blue"} value={productFormData.color || ''} onChange={(e) => setProductFormData({ ...productFormData, color: e.target.value })} className={`w-full h-[46px] bg-white border rounded-xl px-4 text-[13.5px] font-medium outline-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc] ${getConfidenceStyles('color')}`} />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-[#445b6b] ml-1">Pattern</label>
                        <input type="text" value={productFormData.pattern || ''} onChange={(e) => setProductFormData({ ...productFormData, pattern: e.target.value })} placeholder={fashionValidationState === "enhanced" && !productFormData.pattern ? "AI couldn't detect this. Please enter manually." : "Checkered"} className={`w-full h-[46px] bg-white border rounded-xl px-4 text-[13.5px] font-medium outline-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc] ${getConfidenceStyles('pattern')}`} />
                      </div>
                    </div>

                    {/* Pricing Box */}
                    <div className="bg-[#e8effa] border border-[#d6e4f3] rounded-2xl p-[18px] pb-[16px] space-y-[14px]">
                      <h3 className="text-[10px] font-bold text-[#2e4052] uppercase tracking-[0.05em] ml-0.5">PRICING & INVENTORY</h3>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="flex-1 space-y-1.5">
                          <label className="text-[10px] font-bold text-[#55697a] ml-1">MRP</label>
                          <input type="number" value={productFormData.mrp || ''} onChange={(e) => setProductFormData({ ...productFormData, mrp: Number(e.target.value) })} placeholder="1499" className="w-full h-[40px] bg-white border border-[#d6e2eb] rounded-lg px-3 text-[13.5px] font-semibold outline-none focus:border-[#0d7d6f] shadow-sm text-[#0f2130] placeholder:text-[#0f2130]" />
                        </div>
                        <div className="flex-[1.1] space-y-1.5">
                          <label className="text-[10px] font-bold text-[#55697a] ml-1">Selling Price</label>
                          <input type="number" value={productFormData.price || ''} onChange={(e) => setProductFormData({ ...productFormData, price: Number(e.target.value) })} placeholder="899" className="w-full h-[40px] bg-white border border-[#0d7d6f]/40 rounded-lg px-3 font-bold text-[#0d7d6f] text-[13.5px] outline-none focus:border-[#0d7d6f] shadow-sm placeholder:text-[#0d7d6f]" />
                        </div>
                      </div>
                      <div className="flex gap-[10px]">
                        <div className="flex-[0.9] space-y-1.5 w-full">
                          <label className="text-[10px] font-bold text-[#55697a] ml-1">Discount</label>
                          <div className="w-full h-[40px] bg-[#d7ccbe] text-[#6d5130] font-bold text-[11px] flex justify-center items-center rounded-lg shadow-sm">
                            {productFormData.mrp > 0 && productFormData.price > 0 && productFormData.mrp > productFormData.price ? `${Math.round(((productFormData.mrp - productFormData.price) / productFormData.mrp) * 100)}% OFF` : "0% OFF"}
                          </div>
                        </div>
                        <div className="flex-1 space-y-1.5 w-full">
                          <label className="text-[10px] font-bold text-[#55697a] ml-1">Stock Quantity</label>
                          <input type="number" value={productFormData.stock || ''} onChange={(e) => setProductFormData({ ...productFormData, stock: Number(e.target.value) })} placeholder="10" className="w-full h-[40px] bg-white border border-[#d6e2eb] rounded-lg px-3 text-[13.5px] font-semibold outline-none focus:border-[#0d7d6f] shadow-sm text-[#0f2130] placeholder:text-[#0f2130]" />
                        </div>
                      </div>
                    </div>

                  </div>
                )}
              </main>

              {/* Sticky bottom CTA right above the bottom nav block */}
              {fashionValidationState !== "rejected" && (
                <div className="absolute bottom-0 left-0 right-0 pt-3 pb-[18px] px-5 bg-white border-t border-[#ebf0f4] shadow-[0_-5px_15px_rgba(0,0,0,0.03)] z-[50]">
                  <button
                    onClick={handleAddProduct}
                    disabled={isSubmitting || fashionValidationState === "enhancing" || fashionValidationState === "validating"}
                    className="w-full h-[52px] bg-[#0d7d6f] text-white font-semibold rounded-[14px] flex items-center justify-center disabled:opacity-70 active:scale-[0.98] transition-all"
                  >
                    <span className="text-[15px] font-bold flex items-center justify-center gap-2">
                      <Icons.Save size={20} className="mb-0.5" />
                      {isSubmitting ? "Listing..." : "List Product Now"}
                    </span>
                  </button>
                  <div className="mt-[10px] text-center">
                    <p className="text-[9px] font-medium text-[#7d91a1]">Product will be live immediately across 5 local discovery zones.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}"""

pattern = re.compile(r"\{state\.screen === 'add_product_options'.*?</motion\.div>\s*\)\}", re.DOTALL)
result = pattern.sub(new_ui, content)

if result != content:
    with open("src/App.tsx", "w", encoding="utf-8") as f:
        f.write(result)
    print("SUCCESS")
else:
    print("MATCH NOT FOUND")
