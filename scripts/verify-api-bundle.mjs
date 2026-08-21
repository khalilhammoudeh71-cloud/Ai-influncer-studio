process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';

const apiModule = await import('../api/index.mjs');

if (typeof apiModule.default !== 'function') {
  throw new Error('API bundle default export is not a request handler');
}

console.log('API bundle import OK');
