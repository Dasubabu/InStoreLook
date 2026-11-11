import 'dotenv/config';

// Explicit development launcher: demo checkout never runs by production default.
if (process.env.NODE_ENV === 'production') throw new Error('Use npm start for production.');
process.env.NODE_ENV = 'development';
process.env.SHOP_APP_ORIGIN ||= `http://localhost:${process.env.PORT || '3000'}`;
process.env.SHOP_CATALOG_MODE ||= process.env.SHOP_DATABASE_URL ? 'live' : 'sample';
if (process.env.SHOP_CATALOG_MODE === 'sample') process.env.SHOP_PAYMENT_MODE ||= 'demo';
console.log(`Commerce development: ${process.env.SHOP_CATALOG_MODE} catalog; ${process.env.SHOP_PAYMENT_MODE || 'disabled'} payments. No real charges in demo mode.`);
await import('../server.js');
