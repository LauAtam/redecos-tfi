import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bounding box que cubre Córdoba y su circunvalación
const CORDOBA_BOUNDING_BOX = '-31.48,-64.28,-31.33,-64.10';

const OVERPASS_QUERY = `
[out:json];
(
  node["shop"="convenience"](${CORDOBA_BOUNDING_BOX});
  node["shop"="kiosk"](${CORDOBA_BOUNDING_BOX});
);
out body;
`;

const CORDOBA_CENTRO = { lat: -31.416667, lon: -64.183333 };
const MAX_RADIO_CIRCUNVALACION_KM = 6.5; // Radio aproximado de la circunvalación de Córdoba
const MIN_DISTANCIA_NODOS_KM = 1.0;     // Distancia mínima de 1 km entre nodos (aprox. 10 cuadras)

const MANAGERS = [
  'Juan Gómez', 'María Rodríguez', 'Carlos Fernández', 'Ana Martínez',
  'Diego Díaz', 'Laura Pérez', 'José Romero', 'Patricia Álvarez',
  'Gustavo Herrera', 'Marta Benítez', 'Luis Giménez', 'Sofía Medina',
  'Facundo Silva', 'Lucía Toledo', 'Martín Castro', 'Estela Torres'
];

const STREETS = [
  'Av. Colón', 'Av. General Paz', 'Av. Vélez Sarsfield', 'Av. Duarte Quirós',
  'Av. San Martín', 'Av. Chacabuco', 'Av. Pueyrredón', 'Av. Emilio Caraffa',
  'Av. Rafael Núñez', 'Belgrano', 'Caseros', 'Mariano Moreno', 'Dean Funes'
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomAddress(): string {
  const street = getRandomElement(STREETS);
  const number = Math.floor(Math.random() * 2500) + 100;
  return `${street} ${number}`;
}

// Fórmula de Haversine para calcular distancia en km entre dos coordenadas geográficas
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface NodeCandidate {
  lat: number;
  lon: number;
  name: string;
  address: string;
}

async function main() {
  console.log('Fetching nodes from OpenStreetMap (Overpass API)...');

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'RedecoTFIStudentProject/1.0 (407926@tecnicatura.frc.utn.edu.ar)',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API returned status ${response.status}`);
    }

    const data = await response.json();
    const elements = data.elements || [];

    console.log(`Found ${elements.length} raw nodes from OpenStreetMap.`);

    const selectedNodes: NodeCandidate[] = [];

    for (const element of elements) {
      const latitude = element.lat;
      const longitude = element.lon;

      if (!latitude || !longitude) continue;

      // 1. Filtrar si está fuera de la circunvalación (más de 6.5 km del centro)
      const distToCentro = getDistanceKm(
        CORDOBA_CENTRO.lat,
        CORDOBA_CENTRO.lon,
        latitude,
        longitude
      );
      if (distToCentro > MAX_RADIO_CIRCUNVALACION_KM) {
        continue;
      }

      // 2. Filtrar si está a menos de 1 km de cualquier nodo ya seleccionado
      let isTooClose = false;
      for (const selected of selectedNodes) {
        const distToSelected = getDistanceKm(
          selected.lat,
          selected.lon,
          latitude,
          longitude
        );
        if (distToSelected < MIN_DISTANCIA_NODOS_KM) {
          isTooClose = true;
          break;
        }
      }

      if (isTooClose) continue;

      // Procesar datos para insertar
      let name = element.tags?.name;
      if (!name) {
        const type = element.tags?.shop === 'convenience' ? 'Despensa' : 'Kiosco';
        name = `${type} de barrio`;
      }

      let address = '';
      const street = element.tags?.['addr:street'];
      const housenumber = element.tags?.['addr:housenumber'];
      if (street) {
        address = housenumber ? `${street} ${housenumber}` : street;
      } else {
        address = generateRandomAddress();
      }

      selectedNodes.push({
        lat: latitude,
        lon: longitude,
        name: name.substring(0, 100),
        address: address.substring(0, 200),
      });
    }

    console.log(
      `Filtered down to ${selectedNodes.length} nodes within Circumvallation spaced at least 1km apart.`
    );

    let insertedCount = 0;
    for (const node of selectedNodes) {
      const manager_name = getRandomElement(MANAGERS);

      await prisma.nodos.create({
        data: {
          name: node.name,
          address: node.address,
          manager_name,
          latitude: node.lat,
          longitude: node.lon,
        },
      });
      insertedCount++;
    }

    console.log(`Successfully seeded ${insertedCount} distribution nodes!`);
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
