import React from 'react';

/** General shopping literacy, deliberately separate from product evidence. */
export default function FabricGuide() {
  return <details className="product-fabric-guide rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
    <summary className="min-h-11 cursor-pointer content-center text-sm font-bold text-teal-900">Fabric learning guide</summary>
    <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600">
      <p className="font-semibold">General guidance — not verified attributes of this item.</p>
      <p><strong>Read the composition.</strong> Look for named fibers and their percentages. A fabric name or a photograph alone does not establish the exact blend.</p>
      <p><strong>Compare what is supplied.</strong> Consider the stated composition, fit, pattern and care instructions together. Missing information means unknown, not a guarantee of comfort, durability or quality.</p>
      <p><strong>Check care and sizing.</strong> Use the product’s supplied care label and size chart. Do not infer wash temperature, shrinkage or body measurements from a generic fabric guide.</p>
      <p><strong>Verification matters.</strong> “Unverified” means composition has not been marked verified in this catalog. Ask the retailer for the garment label when composition matters to your choice.</p>
    </div>
  </details>;
}
