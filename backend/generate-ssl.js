const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir);
}

async function main() {
  console.log('Generando certificados SSL autofirmados...');
  const attrs = [{ name: 'commonName', value: '192.168.18.21' }];
  try {
    const pems = await selfsigned.generate(attrs, { days: 365 });
    fs.writeFileSync(path.join(sslDir, 'key.pem'), pems.private);
    fs.writeFileSync(path.join(sslDir, 'cert.pem'), pems.cert);
    console.log('Certificados creados con éxito en backend/ssl');
  } catch (error) {
    console.error('Error al generar los certificados:', error);
  }
}

main();
