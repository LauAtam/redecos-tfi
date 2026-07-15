async function main() {
  console.log('Sending GET to http://localhost:3000/products?page=1&limit=20 ...');
  try {
    const res = await fetch('http://localhost:3000/products?page=1&limit=20');
    console.log('Response Status:', res.status);
    const body = await res.json();
    console.log('Response Body:', JSON.stringify(body, null, 2));
  } catch (error) {
    console.error('Fetch failed:', error);
  }
}

main();
