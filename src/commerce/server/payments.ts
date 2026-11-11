import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ShopOrder } from '../contracts.js';
import { ShopError } from './validation.js';
import type { ShopRepository } from './repository.js';

export interface PaymentConfig { secretKey: string; webhookSecret: string; origin: string; fetch?: typeof fetch }
export class StripePayments {
  constructor(private config: PaymentConfig, private repository: ShopRepository) {}
  private async request(path: string, body?: URLSearchParams, key?: string) {
    let response: Response;
    try {
      response = await (this.config.fetch || fetch)(`https://api.stripe.com/v1/checkout/sessions${path}`,{
        method: body?'POST':'GET', headers:{Authorization:`Bearer ${this.config.secretKey}`,'Stripe-Version':'2024-06-20',
          ...(body?{'Content-Type':'application/x-www-form-urlencoded'}:{}),...(key?{'Idempotency-Key':key}:{})},
        ...(body?{body:body.toString()}:{}),signal:AbortSignal.timeout(15000),redirect:'error',
      });
    } catch { throw new ShopError(502,'PAYMENT_UNAVAILABLE','Payment provider unavailable. Your reservation is retained; retry this checkout with the same key.'); }
    if (!response.ok) {
      const error=new ShopError(502,'PAYMENT_UNAVAILABLE','Payment provider could not complete the request. Check your order status before retrying.');
      Object.assign(error,{definitelyNotCreated:response.status>=400&&response.status<500&&![409,429].includes(response.status)});
      throw error;
    }
    try { return await response.json(); }
    catch { throw new ShopError(502,'PAYMENT_UNAVAILABLE','Invalid payment provider response'); }
  }
  async create(order: ShopOrder): Promise<string|undefined> {
    return this.repository.providerCheckout(order.id,async row=>{
    // Never reuse a pruned Stripe idempotency key to create a second payable session.
    if (Date.now()-Number(row.created_at)>23*3600000) throw new ShopError(409,'PAYMENT_RECONCILIATION_REQUIRED','This payment reservation requires store reconciliation');
    const body=new URLSearchParams({mode:'payment',success_url:`${this.config.origin}/orders?checkout=returned`,cancel_url:`${this.config.origin}/orders?checkout=cancelled`,client_reference_id:order.id,'metadata[order_id]':order.id,'payment_method_types[0]':'card',expires_at:String(Math.floor(Number(row.reservation_until)/1000))});
    order.items.forEach((item,i)=>{
      body.set(`line_items[${i}][price_data][currency]`,'inr');
      body.set(`line_items[${i}][price_data][unit_amount]`,String(item.unitPriceMinor));
      body.set(`line_items[${i}][price_data][product_data][name]`,`${item.name} · ${item.size}`);
      body.set(`line_items[${i}][quantity]`,String(item.quantity));
    });
    const session=await this.request('',body,`shop-order-${order.id}`);
    if (typeof session.id!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(session.id)||typeof session.url!=='string') throw new ShopError(502,'PAYMENT_UNAVAILABLE','Invalid payment provider response');
    let url: URL;
    try { url=new URL(session.url); } catch { throw new ShopError(502,'PAYMENT_UNAVAILABLE','Invalid checkout URL'); }
    if (url.protocol!=='https:'||url.hostname!=='checkout.stripe.com') throw new ShopError(502,'PAYMENT_UNAVAILABLE','Invalid checkout URL');
    return {id:session.id,url:url.href};
    });
  }
  async cancel(order: ShopOrder) {
    if (order.paymentMode!=='stripe'||order.status!=='awaiting_payment') throw new ShopError(409,'ORDER_STATE','Only an awaiting-payment order can be cancelled');
    let row=await this.repository.orderRecord(order.id);
    if (!row.provider_session) { await this.create(order); row=await this.repository.orderRecord(order.id); }
    const id=String(row.provider_session);
    let session=await this.request(`/${encodeURIComponent(id)}`);
    if (session.status==='open') {
      try { session=await this.request(`/${encodeURIComponent(id)}/expire`,new URLSearchParams(),`expire-${order.id}`); }
      catch { session=await this.request(`/${encodeURIComponent(id)}`); }
    }
    if (session.status!=='expired') throw new ShopError(409,'PAYMENT_PENDING','Payment is complete or processing; wait for the verified payment event');
    await this.repository.paymentEvent(`cancel-${id}`,order.id,session,'cancelled');
  }
  async webhook(raw: Buffer, signature?: string) {
    if (!Buffer.isBuffer(raw)||!signature||signature.length>2000) throw new ShopError(400,'INVALID_SIGNATURE','Invalid webhook signature');
    const parts=signature.split(',').map(p=>p.trim().split('='));
    const timestamp=parts.find(([key])=>key==='t')?.[1];
    const ts=Number(timestamp);
    if (!timestamp||!/^\d+$/.test(timestamp)||!Number.isSafeInteger(ts)||Math.abs(Date.now()/1000-ts)>300) throw new ShopError(400,'INVALID_SIGNATURE','Invalid webhook timestamp');
    const expected=createHmac('sha256',this.config.webhookSecret).update(timestamp+'.').update(raw).digest();
    const valid=parts.filter(([key,value])=>key==='v1'&&/^[a-fA-F0-9]{64}$/.test(value)).some(([,value])=>timingSafeEqual(expected,Buffer.from(value,'hex')));
    if (!valid) throw new ShopError(400,'INVALID_SIGNATURE','Invalid webhook signature');
    let event:any;
    try { event=JSON.parse(raw.toString('utf8')); } catch { throw new ShopError(400,'INVALID_EVENT','Invalid webhook event'); }
    if (!event||typeof event.id!=='string'||!/^evt_[A-Za-z0-9_]+$/.test(event.id)||typeof event.type!=='string') throw new ShopError(400,'INVALID_EVENT','Invalid webhook event');
    if (event.livemode!==this.config.secretKey.startsWith('sk_live_')) throw new ShopError(400,'PAYMENT_MODE_MISMATCH','Wrong payment environment');
    if (!['checkout.session.completed','checkout.session.async_payment_succeeded','checkout.session.expired'].includes(event.type)) return;
    const session=event.data?.object;
    if (!session||typeof session.id!=='string'||!/^cs_[A-Za-z0-9_]+$/.test(session.id)||typeof session.metadata?.order_id!=='string'||!Number.isSafeInteger(session.amount_total)) throw new ShopError(400,'INVALID_EVENT','Invalid checkout event');
    if (event.type!=='checkout.session.expired'&&session.payment_status!=='paid') return; // no redirect/unpaid completion establishes payment
    await this.repository.paymentEvent(event.id,session.metadata.order_id,session,event.type==='checkout.session.expired'?'cancelled':'paid');
  }
}
