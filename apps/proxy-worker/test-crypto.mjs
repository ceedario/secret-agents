// Test crypto in Cloudflare Workers environment
const testUrl = 'http://localhost:8787/test-crypto';

const response = await fetch(testUrl);
const result = await response.text();
console.log(result);
