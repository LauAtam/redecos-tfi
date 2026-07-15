"""
Script de scraping para extraer productos, precios, tamaños de bulto y categorías del catálogo mayorista de Davelcor (https://davelcor.com.ar).
Genera un archivo CSV limpio y formateado listo para ser importado en la base de datos de Redecos.
"""
import csv
import requests
from bs4 import BeautifulSoup
import time
import re

# Configuraciones
BASE_URL = "https://davelcor.com.ar/catalogo/page/"
TOTAL_PAGINAS = 54  # Catálogo actual
ARCHIVO_CSV = 'davelcor_catalogo.csv'

CABECERAS = [
    'Categoria', 
    'Nombre_Producto', 
    'Descripcion', 
    'Precio_Mayorista', 
    'Tamano_Bulto', 
    'URL_Imagen', 
    'Precio_Minorista', 
    'Stock'
]

def limpiar_precio(precio_str):
    """
    Limpia strings de precios como '$2.550,00' o '$ 12.300' 
    y los convierte a formato decimal estándar de SQL (ej: '2550.00' o '12300.00').
    """
    if not precio_str:
        return '0.00'
    
    # Quitamos el signo $, espacios en blanco y cualquier otro carácter no numérico excepto punto y coma
    limpio = precio_str.replace('$', '').replace(' ', '').strip()
    
    # Manejo del formato de miles y decimales argentino:
    # Caso 1: Tiene puntos de miles y coma de decimales (ej. 2.550,00 -> 2550.00)
    if ',' in limpio:
        limpio = limpio.replace('.', '').replace(',', '.')
    # Caso 2: No tiene coma pero sí puntos de miles (ej. 2.550 -> 2550.00)
    else:
        limpio = limpio.replace('.', '')
        
    # Extraemos solo el número decimal usando regex por seguridad (+ IVA u otros textos)
    match = re.search(r'\d+(?:\.\d+)?', limpio)
    if match:
        valor = float(match.group(0))
        return f"{valor:.2f}"
    
    return '0.00'

def extraer_bulto(texto):
    """
    Extrae de forma robusta las unidades por bulto a partir del texto del producto.
    Si no encuentra información o falla, devuelve 1 (entero).
    """
    if not texto:
        return 1
    # Buscamos "Unidades por bulto: [número]" de forma insensible a mayúsculas
    match = re.search(r'Unidades\s*por\s*bulto:\s*(\d+)', texto, re.IGNORECASE)
    if match:
        try:
            return int(match.group(1))
        except ValueError:
            return 1
    return 1

def iniciar_scraping():
    print(f"[*] Iniciando scraping de {BASE_URL}...")
    
    with open(ARCHIVO_CSV, mode='w', newline='', encoding='utf-8') as archivo:
        writer = csv.writer(archivo)
        writer.writerow(CABECERAS)

        # Encabezado para simular comportamiento de un navegador común
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }

        # Iteramos por cada una de las páginas
        for pagina in range(1, TOTAL_PAGINAS + 1):
            url = f"{BASE_URL}{pagina}/"
            print(f"[INFO] Extrayendo pagina {pagina} de {TOTAL_PAGINAS}...")
            
            try:
                respuesta = requests.get(url, headers=headers, timeout=15)
                
                if respuesta.status_code == 200:
                    soup = BeautifulSoup(respuesta.text, 'html.parser')
                    
                    # En el tema Flatsome, los productos están en divs con la clase 'product-small col'
                    # Usamos selector CSS específico para evitar duplicaciones por divs anidados
                    productos = soup.select('div.product-small.col')
                    
                    if not productos:
                        print(f"[WARN] No se encontraron productos en la pagina {pagina}. Finalizando scraping de forma preventiva.")
                        break
                    
                    print(f"[INFO] Se encontraron {len(productos)} productos en esta pagina.")
                    
                    for prod in productos:
                        # 1. Categoría
                        # En Flatsome suele ser un elemento <p> con clase 'product-cat' o 'category'
                        cat_elem = prod.find('p', class_='product-cat')
                        categoria = cat_elem.text.strip() if cat_elem else 'General'

                        # 2. Nombre
                        # En Flatsome suele ser un <p> con clase 'woocommerce-loop-product__title'
                        nombre_elem = prod.find('p', class_='woocommerce-loop-product__title')
                        nombre = nombre_elem.text.strip() if nombre_elem else 'Sin nombre'

                        # 3. Precio Mayorista
                        # WooCommerce: si hay descuento, el precio actual está dentro del tag <ins>
                        ins_elem = prod.find('ins')
                        if ins_elem:
                            precio_elem = ins_elem.find('span', class_='woocommerce-Price-amount')
                        else:
                            precio_elem = prod.find('span', class_='woocommerce-Price-amount')
                        
                        precio_raw = precio_elem.text.strip() if precio_elem else '0'
                        precio_mayorista = limpiar_precio(precio_raw)

                        # 4. Tamaño de Bulto
                        bulto = extraer_bulto(prod.text)

                        # 5. URL de la Imagen (Soporte para Lazy Loading de WooCommerce)
                        img_elem = prod.find('img')
                        url_imagen = ''
                        if img_elem:
                            if 'data-src' in img_elem.attrs:
                                url_imagen = img_elem['data-src']
                            elif 'src' in img_elem.attrs:
                                url_imagen = img_elem['src']

                        # 6. Descripción (fallback al nombre al estar en grilla)
                        descripcion = nombre 
                        
                        # 7. Precio Minorista (por defecto vacío para ser null en BD)
                        precio_minorista = '' 
                        
                        # 8. Stock (entero)
                        stock = 100 

                        # Guardamos la fila limpia en el CSV
                        writer.writerow([
                            categoria, 
                            nombre, 
                            descripcion, 
                            precio_mayorista, 
                            bulto, 
                            url_imagen, 
                            precio_minorista, 
                            stock
                        ])
                    
                    # Pausa respetuosa para no saturar
                    time.sleep(1.5)
                    
                elif respuesta.status_code == 404:
                    print(f"[STOP] Pagina {pagina} no encontrada (404). Asumiendo fin del catalogo.")
                    break
                else:
                    print(f"[WARN] Error HTTP {respuesta.status_code} en la pagina {pagina}")
                    
            except Exception as e:
                print(f"[ERROR] Error conectando a la pagina {pagina}: {e}")

    print(f"[OK] Completado! Los productos corregidos fueron guardados en {ARCHIVO_CSV}")

if __name__ == '__main__':
    iniciar_scraping()