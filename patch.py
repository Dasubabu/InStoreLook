import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

def remove_screen(content, screen_name):
    start_pattern = r"\{\s*state\.screen\s*===\s*'" + screen_name + r"'\s*&&\s*\("
    match = re.search(start_pattern, content)
    if not match:
        print(f"Screen {screen_name} not found.")
        return content
    
    start_idx = match.start()
    count = 0
    in_str_single = False
    in_str_double = False
    in_str_backtick = False
    i = start_idx
    started = False
    
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
        
    if started and count == 0:
        return content[:start_idx] + "\n{/* REMOVED " + screen_name + " */}\n" + content[end_idx:]
    else:
        print(f"Could not balance braces for {screen_name}")
        return content

content = remove_screen(content, "product_details_edit")
content = remove_screen(content, "photo_review")
content = remove_screen(content, "price_stock")
content = remove_screen(content, "review_publish")

start_pattern = r"\{\s*state\.screen\s*===\s*'add_product_options'\s*&&\s*\("
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
              className="absolute inset-0 flex flex-col bg-[#f8fbfa] overflow-hidden"
            >
              <header className="flex items-center justify-between px-6 h-16 bg-white border-b border-outline-variant sticky top-0 z-50">
                <div className="flex items-center gap-3">
                  <button onClick={handleProductFlowBack} className="p-2 -ml-2 text-primary active:bg-surface-container rounded-full transition-all"><Icons.ArrowLeft size={24} /></button>
                  <h1 className="text-lg font-extrabold text-primary">Unified AI Upload Hub</h1>
                </div>
                <div className="flex gap-4 items-center">
                  <Icons.HelpOutline size={22} className="text-on-surface-variant"/>
                  <Icons.CheckCircle size={22} className="text-primary"/>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto pb-32">
                {/* Top Hub Feature Block */}
                <div className="bg-white px-6 py-8 shadow-sm rounded-b-3xl">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-primary text-white rounded-full flex flex-col justify-center items-center shadow-lg mb-4">
                      <Icons.Camera size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-on-surface mb-2">Quick Scan & List</h2>
                    <p className="text-xs font-semibold text-on-surface-variant max-w-[280px] leading-relaxed mb-6">
                      AI identifies items, crops backgrounds, and writes descriptions in 3 seconds.
                    </p>
                    <div className="flex gap-4 w-full justify-center">
                      <button className="flex-1 max-w-[160px] h-12 flex items-center justify-center gap-2 bg-primary text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-md shadow-primary/30">
                        <Icons.AutoAwesome size={18} />
                        Scan Now
                      </button>
                      <button className="flex-1 max-w-[160px] h-12 flex items-center justify-center gap-2 bg-primary/5 text-primary border-2 border-primary/20 rounded-2xl font-black text-sm active:scale-95 transition-all outline-none">
                        <Icons.Menu size={18} />
                        Batch Upload
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form Elements */}
                <div className="p-6 space-y-6">
                  {/* Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Product Name</label>
                    <input 
                      type="text" 
                      value={productFormData.name}
                      onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                      placeholder="e.g. Men's Classic Blue Checkered Casual Shirt"
                      className="w-full h-14 bg-white border border-outline-variant rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary shadow-sm"
                    />
                  </div>

                  {/* Category / Sub */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Category</label>
                      <div className="relative">
                        <select 
                          className="w-full h-14 bg-white border border-outline-variant rounded-2xl px-4 font-bold text-sm outline-none appearance-none shadow-sm"
                          value={productFormData.category}
                          onChange={(e) => setProductFormData({ ...productFormData, category: e.target.value })}
                        >
                          <option value="Men's Fashion">Men's Wear</option>
                          <option value="Women's Fashion">Women's Wear</option>
                        </select>
                        <Icons.KeyboardArrowDown size={20} className="absolute right-4 top-4 pointer-events-none text-on-surface-variant"/>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Subcategory</label>
                      <div className="relative">
                        <select className="w-full h-14 bg-white border border-outline-variant rounded-2xl px-4 font-bold text-sm outline-none appearance-none shadow-sm">
                          <option value="Shirts">Casual Shirts</option>
                          <option value="T-Shirts">T-Shirts</option>
                        </select>
                        <Icons.KeyboardArrowDown size={20} className="absolute right-4 top-4 pointer-events-none text-on-surface-variant"/>
                      </div>
                    </div>
                  </div>

                  {/* Local Brand Toggle & Brand */}
                  <div className="bg-white border text-primary border-outline-variant shadow-sm rounded-2xl p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-on-surface mb-0.5">Local Brand</h4>
                      <p className="text-[10px] text-on-surface-variant font-semibold">Highlight as locally manufactured</p>
                    </div>
                    <div className="w-12 h-6 bg-primary rounded-full relative shadow-inner">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1 shadow-sm border border-primary/20" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Brand Name</label>
                    <input 
                      type="text" 
                      value={productFormData.brand || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, brand: e.target.value })}
                      placeholder="e.g. Urban Stitch"
                      className="w-full h-14 bg-white border border-outline-variant rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary shadow-sm"
                    />
                  </div>

                  {/* AI Description */}
                  <div className="space-y-1 relative">
                    <div className="flex justify-between items-center ml-1 mb-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-1"><Icons.AutoAwesome size={12} className="text-primary"/> AI-Generated Description</label>
                      <button className="text-[10px] font-bold text-primary flex items-center gap-1 active:scale-95 transition-all">Generate <Icons.Refresh size={12}/></button>
                    </div>
                    <textarea 
                      rows={3} 
                      placeholder="Product description generated by AI..."
                      value={productFormData.description || ''}
                      onChange={(e) => setProductFormData({ ...productFormData, description: e.target.value })}
                      className="w-full bg-white border border-outline-variant rounded-2xl p-4 font-medium text-sm outline-none focus:border-primary shadow-sm"
                    />
                  </div>

                  {/* Color Pattern */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Primary Color</label>
                      <div className="relative">
                        <input type="text" placeholder="Navy Blue" value={productFormData.color || ''} onChange={(e) => setProductFormData({ ...productFormData, color: e.target.value })} className="w-full h-14 bg-white border border-outline-variant rounded-2xl pl-12 pr-4 font-bold text-sm outline-none focus:border-primary shadow-sm" />
                        <div className="w-4 h-4 rounded-full bg-blue-900 absolute left-4 top-5 shadow-sm border border-outline-variant/50"></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-outline uppercase tracking-widest ml-1">Pattern</label>
                      <input type="text" placeholder="Checkered" className="w-full h-14 bg-white border border-outline-variant rounded-2xl px-4 font-bold text-sm outline-none focus:border-primary shadow-sm" />
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="bg-surface-container-low border border-outline-variant rounded-3xl p-5 space-y-4">
                    <h3 className="text-xs font-black text-on-surface uppercase tracking-widest">Pricing & Inventory</h3>
                    <div className="flex gap-4">
                       <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-on-surface-variant ml-1 uppercase tracking-widest">MRP (₹)</label>
                        <input type="number" value={productFormData.mrp || ''} onChange={(e) => setProductFormData({ ...productFormData, mrp: Number(e.target.value) })} className="w-full h-12 bg-white border border-outline-variant rounded-xl px-3 font-bold text-sm outline-none focus:border-primary shadow-sm" />
                       </div>
                       <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-on-surface-variant ml-1 uppercase tracking-widest">Selling Price (₹)</label>
                        <input type="number" value={productFormData.price || ''} onChange={(e) => setProductFormData({ ...productFormData, price: Number(e.target.value) })} className="w-full h-12 bg-white border border-outline-variant rounded-xl px-3 font-black text-primary text-sm outline-none focus:border-primary shadow-sm" />
                       </div>
                       <div className="w-[70px] space-y-1">
                        <label className="text-[10px] font-bold text-on-surface-variant ml-1 uppercase tracking-widest">Off</label>
                        <div className="w-full h-12 bg-primary/10 text-primary font-black text-xs flex justify-center items-center rounded-xl border border-primary/20 shadow-sm cursor-default">40%</div>
                       </div>
                    </div>
                    <div className="space-y-1 pt-2">
                       <label className="text-[10px] font-bold text-on-surface-variant ml-1 uppercase tracking-widest">Quantity in Hand</label>
                       <input type="number" value={productFormData.stock || ''} onChange={(e) => setProductFormData({ ...productFormData, stock: Number(e.target.value) })} className="w-full h-12 bg-white border border-outline-variant rounded-xl px-3 font-bold text-sm outline-none focus:border-primary shadow-sm" />
                    </div>
                  </div>

                </div>
              </main>

              {/* Sticky bottom CTA */}
              <div className="absolute bottom-0 left-0 w-full p-4 bg-white border-t border-outline-variant/30 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] z-[60]">
                <button 
                  onClick={handleAddProduct}
                  disabled={isSubmitting}
                  className="w-full h-16 bg-primary text-white font-black rounded-2xl flex flex-col items-center justify-center disabled:opacity-70 active:scale-[0.98] transition-all shadow-[0_4px_15px_rgba(0,104,95,0.4)]"
                >
                  <span className="text-sm tracking-wide gap-2 flex items-center">
                    <Icons.CloudUpload size={18} />
                    {isSubmitting ? "LISTING..." : "LIST PRODUCT NOW"}
                  </span>
                  <p className="text-[9px] font-bold text-white/80 tracking-wide mt-0.5">Product will be live immediately across 5 local discovery zones</p>
                </button>
              </div>

            </motion.div>
          )}"""
    
    content = content[:start_idx] + NEW_CONTENT + content[end_idx:]
    print("Replaced add_product_options Successfully.")
else:
    print("Could not find add_product_options block.")

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)
