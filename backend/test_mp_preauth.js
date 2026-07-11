const PUBLIC_KEY = 'APP_USR-f9252b9c-3093-4dfd-9944-e7a901d0a337';
const ACCESS_TOKEN = 'APP_USR-4752904031108357-070914-c41812d653438a09e9815b6f39d559ff-1049028285';

async function tokenizeCard() {
  console.log('1. Tokenizando tarjeta en producción...');
  const body = {
    card_number: '5212190063088456',
    cardholder: {
      name: 'Atampiz Lautaro',
      identification: {
        type: 'DNI',
        number: '45450408' // DNI ficticio para la prueba o el del titular
      }
    },
    expiration_month: 8,
    expiration_year: 2030,
    security_code: '174'
  };

  const response = await fetch(`https://api.mercadopago.com/v1/card_tokens?public_key=${PUBLIC_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Error en tokenización: ${JSON.stringify(data)}`);
  }
  console.log('   → Card Token generado:', data.id);
  return data.id;
}

async function createPreauthPayment(token) {
  const email = 'lautaroatampiz@gmail.com'; // Usamos un email real del comprador
  console.log(`2. Creando pago pre-autorizado de $1.00 ARS para email: ${email}...`);
  const body = {
    transaction_amount: 1.00,
    token: token,
    description: 'Redecos Test Production Pre-Auth',
    installments: 1,
    payment_method_id: 'master', // Red mastercard
    payer: {
      email: email,
      first_name: 'Lautaro',
      last_name: 'Atampiz',
      identification: {
        type: 'DNI',
        number: '12345678'
      }
    },
    capture: false
  };

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log('   → Respuesta MP:', response.status, JSON.stringify(data));
  if (response.ok) {
    console.log('\n==================================================');
    console.log(`PAGO PRE-AUTORIZADO CREADO CON ÉXITO!`);
    console.log(`ID del Pago: ${data.id}`);
    console.log(`Estado: ${data.status} (${data.status_detail})`);
    console.log(`Para capturar este pago, ejecutá:`);
    console.log(`node test_mp_capture.js ${data.id}`);
    console.log('==================================================');
  }
}

async function run() {
  try {
    const token = await tokenizeCard();
    await createPreauthPayment(token);
  } catch (e) {
    console.error('Error durante la prueba:', e.message);
  }
}

run();
