const algoritmo = require('./algoritmoPrecios');

// Datos de ejemplo para probar
const productoEjemplo = {
    id: '123',
    nombre: 'Camiseta Básica',
    sku: 'CAM-001',
    precioActual: 25000,
    precioBase: 15000, // Costo + margen base
    stock: 45,
    ventas: [
        // Simular 60 días de ventas
        ...Array.from({ length: 45 }, (_, i) => ({
            cantidad: Math.floor(Math.random() * 3) + 1,
            fecha: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            precioUnitario: 25000
        }))
    ]
};

// Probar diferentes escenarios
console.log('🔍 ESCENARIO 1: Producto normal');
console.log(algoritmo.calcularRecomendacion(productoEjemplo));
console.log('\n');

// Escenario 2: Stock bajo
console.log('🔍 ESCENARIO 2: Stock bajo');
const stockBajo = {...productoEjemplo, stock: 5};
console.log(algoritmo.calcularRecomendacion(stockBajo));
console.log('\n');

// Escenario 3: Stock alto
console.log('🔍 ESCENARIO 3: Stock alto');
const stockAlto = {...productoEjemplo, stock: 200};
console.log(algoritmo.calcularRecomendacion(stockAlto));
console.log('\n');

// Escenario 4: Sin ventas
console.log('🔍 ESCENARIO 4: Sin ventas');
const sinVentas = {...productoEjemplo, ventas: [], stock: 50};
console.log(algoritmo.calcularRecomendacion(sinVentas));