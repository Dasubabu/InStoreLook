import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

start_pattern = r"\{\s*state\.screen\s*===\s*[\"']add_product_options[\"']\s*&&\s*\("
match = re.search(start_pattern, content)
if match:
    start_idx = match.start()
    count = 0
    in_str = False
    i = start_idx
    started = False
    in_str_single = False
    in_str_double = False
    in_str_backtick = False
    
    while i < len(content):
        c = content[i]
        if c == "'" and not in_str_double and not in_str_backtick: in_str_single = not in_str_single
        elif c == '"' and not in_str_single and not in_str_backtick: in_str_double = not in_str_double
        elif c == '`' and not in_str_single and not in_str_double: in_str_backtick = not in_str_backtick
        
        if not in_str_single and not in_str_double and not in_str_backtick:
            if c == '{':
                count += 1
                started = True
            elif c == '}':
                count -= 1
        
        if started and count == 0:
            end_idx = i + 1
            break
        i += 1

    NEW_CONTENT = """{state.screen === 'add_product_options' && (
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
                      <button className="flex-1 h-[42px] flex items-center justify-center gap-1.5 bg-[#0d7d6f] text-white rounded-xl font-bold text-[13px] active:scale-95 transition-all shadow-md shadow-[#0d7d6f]/20">
                        <Icons.Bolt size={18} className="text-white fill-white" />
                        Scan Now
                      </button>
                      <button className="flex-1 h-[42px] flex items-center justify-center gap-1.5 bg-[#ecf2fa] text-[#0d7d6f] border border-[#d2dfef] rounded-xl font-bold text-[13px] active:scale-95 transition-all">
                        <Icons.UploadFile size={18} />
                        Batch Upload
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Elements */}
                <div className="px-5 pb-6 space-y-[20px]">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#445b6b] ml-1">Product Name</label>
                    <input 
                      type="text" 
                      value={productFormData.name}
                      onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                      placeholder="Men's Classic Blue Checkered Casual Shirt"
                      className="w-full h-[46px] bg-white border border-[#e1e8ed] rounded-xl px-4 text-[13.5px] font-medium outline-none focus:border-[#0d7d6f] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc]"
                    />
                  </div>

                  {/* Category / Sub */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#445b6b] ml-1">Category</label>
                      <div className="relative">
                        <select 
                          className="w-full h-[46px] bg-white border border-[#e1e8ed] rounded-xl px-4 text-[13.5px] font-medium outline-none appearance-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130]"
                          value={productFormData.category}
                          onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                        >
                          <option value="Men's Fashion">Men's Wear</option>
                          <option value="Women's Fashion">Women's Wear</option>
                        </select>
                        <Icons.KeyboardArrowDown size={18} className="absolute right-3 top-[14px] pointer-events-none text-[#7b8f9e]"/>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#445b6b] ml-1">Subcategory</label>
                      <div className="relative">
                        <select className="w-full h-[46px] bg-white border border-[#e1e8ed] rounded-xl px-4 text-[13.5px] font-medium outline-none appearance-none shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130]">
                          <option value="Shirts">Casual Shirts</option>
                          <option value="T-Shirts">T-Shirts</option>
                        </select>
                        <Icons.KeyboardArrowDown size={18} className="absolute right-3 top-[14px] pointer-events-none text-[#7b8f9e]"/>
                      </div>
                    </div>
                  </div>

                  {/* Local Brand Toggle */}
                  <div className="bg-[#f0f6ff] border border-[#d6e4f3] rounded-xl py-3.5 px-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-[13px] text-[#0f2130]">Local Brand</h4>
                      <p className="text-[10px] text-[#6b7f90] mt-[2px]">Highlight as locally manufactured</p>
                    </div>
                    <div className="w-[42px] h-[22px] bg-[#0d7d6f] rounded-full relative cursor-pointer shadow-inner">
                      <div className="w-[18px] h-[18px] bg-white rounded-full absolute right-0.5 top-[2px] shadow-sm" />
                    </div>
                  </div>

                  {/* Brand */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[#445b6b] ml-1">Brand Name</label>
                    <input 
                      type="text" 
                      value={productFormData.brand || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                      placeholder="e.g. Urban Stitch"
                      className="w-full h-[46px] bg-white border border-[#e1e8ed] rounded-xl px-4 text-[13.5px] font-medium outline-none focus:border-[#0d7d6f] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc]"
                    />
                  </div>

                  {/* AI Description */}
                  <div className="space-y-1.5 relative">
                    <div className="flex justify-between items-center ml-1 mb-1">
                      <label className="text-[10px] font-bold text-[#445b6b]">AI-Generated Description</label>
                      <button className="text-[10.5px] font-bold text-[#0d7d6f] flex items-center gap-[3px]"><Icons.Autorenew size={14} className="text-[#0d7d6f]"/> Regenerate</button>
                    </div>
                    <textarea 
                      rows={5} 
                      placeholder="This premium blue checked shirt features a modern windowpane pattern, crafted from 100% breathable cotton for all-day comfort. Designed with a structured collar and a versatile slim fit..."
                      value={productFormData.description || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                      className="w-full bg-white border border-[#e1e8ed] rounded-xl p-4 text-[12.5px] leading-[1.65] font-medium outline-none focus:border-[#0d7d6f] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#3b4c5b] placeholder:text-[#99abbc]"
                    />
                  </div>

                  {/* Color Pattern */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#445b6b] ml-1">Primary Color</label>
                      <div className="relative">
                        <input type="text" placeholder="Navy Blue" value={productFormData.color || ''} onChange={(e) => setProductFormData({ ...productFormData, color: e.target.value })} className="w-full h-[46px] bg-white border border-[#e1e8ed] rounded-xl pl-11 pr-4 text-[13.5px] font-medium outline-none focus:border-[#0d7d6f] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc]" />
                        <div className="w-[18px] h-[18px] rounded-full bg-[#1855c4] absolute left-[14px] top-[14px]"></div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[#445b6b] ml-1">Pattern</label>
                      <input type="text" placeholder="Checkered" className="w-full h-[46px] bg-white border border-[#e1e8ed] rounded-xl px-4 text-[13.5px] font-medium outline-none focus:border-[#0d7d6f] shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-[#0f2130] placeholder:text-[#99abbc]" />
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-[#e8effa] border border-[#d6e4f3] rounded-2xl p-[18px] pb-[16px] space-y-[14px]">
                    <h3 className="text-[10px] font-bold text-[#2e4052] uppercase tracking-[0.05em] ml-0.5">PRICING & INVENTORY</h3>
                    <div className="flex gap-[10px]">
                       <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-bold text-[#55697a] ml-1">MRP</label>
                        <input type="number" value={productFormData.mrp || ''} onChange={(e) => setProductFormData({ ...productFormData, mrp: Number(e.target.value) })} placeholder="1499" className="w-full h-[40px] bg-white border border-[#d6e2eb] rounded-lg px-3 text-[13.5px] font-semibold outline-none focus:border-[#0d7d6f] shadow-sm text-[#0f2130] placeholder:text-[#0f2130]" />
                       </div>
                       <div className="flex-[1.1] space-y-1.5">
                        <label className="text-[10px] font-bold text-[#55697a] ml-1">Selling Price</label>
                        <input type="number" value={productFormData.price || ''} onChange={(e) => setProductFormData({ ...productFormData, price: Number(e.target.value) })} placeholder="899" className="w-full h-[40px] bg-white border border-[#0d7d6f]/40 rounded-lg px-3 font-bold text-[#0d7d6f] text-[13.5px] outline-none focus:border-[#0d7d6f] shadow-sm placeholder:text-[#0d7d6f]" />
                       </div>
                       <div className="flex-[0.9] space-y-1.5">
                        <label className="text-[10px] font-bold text-[#55697a] ml-1">Discount</label>
                        <div className="w-full h-[40px] bg-[#d7ccbe] text-[#6d5130] font-bold text-[11px] flex justify-center items-center rounded-lg shadow-sm">40% OFF</div>
                       </div>
                    </div>
                  </div>

                </div>
              </main>

              {/* Sticky bottom CTA right above the bottom nav block */}
              <div className="absolute bottom-0 left-0 right-0 pt-3 pb-[18px] px-5 bg-white border-t border-[#ebf0f4] shadow-[0_-5px_15px_rgba(0,0,0,0.03)] z-[50]">
                <button 
                  onClick={handleAddProduct}
                  disabled={isSubmitting}
                  className="w-full h-[52px] bg-[#0d7d6f] text-white font-semibold rounded-[14px] flex items-center justify-center disabled:opacity-70 active:scale-[0.98] transition-all"
                >
                  <span className="text-[15px] font-bold flex items-center justify-center gap-2">
                    <Icons.CloudUpload size={20} className="mb-0.5" />
                    {isSubmitting ? "Listing..." : "List Product Now"}
                  </span>
                </button>
                <div className="mt-[10px] text-center">
                  <p className="text-[9px] font-medium text-[#7d91a1]">Product will be live immediately across 5 local discovery zones.</p>
                </div>
              </div>

            </motion.div>
          )}"""
    
    content = content[:start_idx] + NEW_CONTENT + content[end_idx:]
    print("Replaced add_product_options Successfully.")
else:
    print("Could not find add_product_options block.")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
