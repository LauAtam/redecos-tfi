const ACCESS_TOKEN = 'APP_USR-4752904031108357-070914-c41812d653438a09e9815b6f39d559ff-1049028285';

async function capturePayment(paymentId) {
  if (!paymentId) {
    console.error('Por favor proveé el ID del pago. Ejemplo: node test_mp_capture.js 12345678');
    process.exit(1);
  }

  console.log(`1. Capturando pago en producción ID: ${paymentId}...`);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      capture: true
    })
  });

  const data = await response.json();
  console.log('   → Respuesta captura MP:', response.status, JSON.stringify(data));
  if (response.ok) {
    console.log('\n==================================================');
    console.log(`PAGO CAPTURADO CON ÉXITO!`);
    console.log(`ID del Pago: ${data.id}`);
    console.log(`Estado Final: ${data.status} (${data.status_detail})`);
    console.log('==================================================');
  }
}

const paymentId = process.argv[2];
capturePayment(paymentId);
