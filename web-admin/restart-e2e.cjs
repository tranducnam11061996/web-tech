const { spawn, execSync } = require('child_process');

// Kill all node processes first
try { execSync('cmd /c taskkill /F /IM node.exe', { encoding: 'utf8' }); } catch(e) {}
console.log('Processes killed');

// Give a moment
const start = Date.now();

const server = spawn('cmd', ['/c', 'npm run dev'], {
  cwd: 'D:/web-tech/web-admin',
  shell: false,
  stdio: ['pipe', 'inherit', 'inherit'],
  detached: false,
});

let serverReady = false;

server.stdout.on('data', (data) => {
  const text = data.toString();
  if (text.includes('Ready in')) serverReady = true;
});

server.on('error', (err) => console.error('Server error:', err));

// Wait for ready then test
const check = setInterval(() => {
  if (serverReady) {
    clearInterval(check);
    runTests();
  }
}, 500);

// Safety timeout
setTimeout(() => {
  clearInterval(check);
  runTests();
}, 25000);

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const http = require('http');
    http.get(url, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve(data); }
      });
    }).on('error', reject);
  });
}

async function runTests() {
  console.log('\n=== Running E2E Tests ===\n');
  try {
    // Wait for cache to warm
    console.log('Waiting for cache to warm (35s)...');
    await new Promise(r => setTimeout(r, 35000));

    // Test 1: Search "laptop"
    console.log('\n--- Test 1: search?q=laptop ---');
    const r1 = await httpGet('http://localhost:3000/api/search?q=laptop&limit=3');
    console.log('total:', r1.pagination?.total);
    (r1.data || []).forEach((p,i) => console.log(`  ${i+1}. ${p.name} [${p.brand}] ${p.price?.toLocaleString()} VNĐ`));

    // Test 2: Search "pc gaming"
    console.log('\n--- Test 2: search?q=pc+gaming ---');
    const r2 = await httpGet('http://localhost:3000/api/search?q=pc+gaming&limit=3');
    console.log('total:', r2.pagination?.total);
    (r2.data || []).forEach((p,i) => console.log(`  ${i+1}. ${p.name} [${p.brand}] ${p.price?.toLocaleString()} VNĐ`));

    // Test 3: Search "lap" (should match "lắp")
    console.log('\n--- Test 3: search?q=lap ---');
    const r3 = await httpGet('http://localhost:3000/api/search?q=lap&limit=3');
    console.log('total:', r3.pagination?.total);
    (r3.data || []).forEach((p,i) => console.log(`  ${i+1}. ${p.name}`));

    // Test 4: Search attributes
    console.log('\n--- Test 4: search-attributes ---');
    const ids = (r1.data || []).map(p => p.id).join(',');
    if (ids) {
      const r4 = await httpGet('http://localhost:3000/api/search-attributes?productIds=' + ids);
      console.log('attributes:', r4.data?.length || 0);
      (r4.data || []).forEach(a => console.log(`  - ${a.name}: ${a.values?.length} values`));
    }

    console.log('\n=== Tests Complete ===');
  } catch(e) {
    console.error('Test error:', e.message);
  }
}
