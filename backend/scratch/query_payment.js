const ACCESS_TOKEN = 'APP_USR-4752904031108357-070914-c41812d653438a09e9815b6f39d559ff-1049028285';

async function queryPayment(paymentId) {
  if (!paymentId) {
    console.error('Por favor proveé el ID del pago.');
    process.exit(1);
  }

  console.log(`Consultando pago ID: ${paymentId}...`);
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`
    }
  });

  const data = await response.json();
  console.log('Respuesta MP status:', response.status);
  console.log('Detalle del pago:', JSON.stringify(data, null, 2));
}

const paymentId = process.argv[2] || '168413969559';
queryPayment(paymentId);
