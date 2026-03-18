

class AlgoritmoPrecios {
    
    /**
     * Calcula la recomendación de precio para un producto
     * @param {Object} producto - Datos del producto
     * @returns {Object} Recomendación con precio y acción
     */
    calcularRecomendacion(producto) {
        // Extraer datos del producto
        const { 
            id, 
            nombre, 
            sku, 
            precioActual, 
            precioBase, 
            stock, 
            ventas = [] 
        } = producto;

        // PASO 1: Calcular métricas básicas
        const metricas = this.calcularMetricas(ventas, stock);
        
        // PASO 2: Determinar factor de ajuste basado en múltiples variables
        const factorAjuste = this.calcularFactorAjuste(metricas);
        
        // PASO 3: Calcular precio recomendado
        let precioRecomendado = this.calcularPrecioRecomendado(
            precioActual, 
            precioBase, 
            factorAjuste,
            metricas
        );
        
        // PASO 4: Redondear a número con 2 decimales (formato monetario)
        precioRecomendado = Math.round(precioRecomendado * 100) / 100;
        
        // PASO 5: Determinar acción recomendada
        const accion = this.determinarAccion(precioActual, precioRecomendado);
        
        // PASO 6: Calcular porcentaje de cambio
        const porcentajeCambio = ((precioRecomendado - precioActual) / precioActual * 100);
        const porcentajeRedondeado = Math.round(porcentajeCambio * 100) / 100;

        return {
            precioRecomendado: precioRecomendado,
            accion: accion,
            porcentajeCambio: porcentajeRedondeado,
            metricas: metricas,
            explicacion: this.generarExplicacion(accion, metricas, porcentajeRedondeado)
        };
    }

    /**
     * Calcula métricas clave a partir de ventas históricas
     * @param {Array} ventas - Array de ventas del producto
     * @param {Number} stock - Stock actual
     * @returns {Object} Métricas calculadas
     */
    calcularMetricas(ventas, stock) {
        const hoy = new Date();
        
        // Filtrar ventas por períodos
        const ventasUltimos7Dias = this.filtrarVentasPorDias(ventas, 7);
        const ventasUltimos15Dias = this.filtrarVentasPorDias(ventas, 15);
        const ventasUltimos30Dias = this.filtrarVentasPorDias(ventas, 30);
        
        // Calcular total de unidades vendidas
        const unidadesVendidas7 = this.sumarUnidades(ventasUltimos7Dias);
        const unidadesVendidas15 = this.sumarUnidades(ventasUltimos15Dias);
        const unidadesVendidas30 = this.sumarUnidades(ventasUltimos30Dias);
        
        // Calcular demanda diaria promedio
        const demandaDiariaPromedio = unidadesVendidas30 / 30;
        
        // Calcular rotación de stock (veces que se vendería todo el stock al ritmo actual)
        const rotacionStock = demandaDiariaPromedio > 0 
            ? stock / demandaDiariaPromedio 
            : 999; // Si no hay ventas, rotación infinita
        
        // Calcular tendencia (comparar últimas 2 semanas con las 2 anteriores)
        const ventasUltimos15DiasArray = this.filtrarVentasPorDias(ventas, 15);
        const ventasDias15a30 = this.filtrarVentasPorRango(ventas, 30, 15);
        
        const unidadesUltimos15 = this.sumarUnidades(ventasUltimos15DiasArray);
        const unidadesDias15a30 = this.sumarUnidades(ventasDias15a30);
        
        let tendencia = 0;
        if (unidadesDias15a30 > 0) {
            tendencia = ((unidadesUltimos15 - unidadesDias15a30) / unidadesDias15a30) * 100;
        }
        
        // Determinar nivel de stock
        let nivelStock = 'normal';
        if (stock === 0) nivelStock = 'agotado';
        else if (stock < demandaDiariaPromedio * 3) nivelStock = 'bajo';
        else if (stock > demandaDiariaPromedio * 30) nivelStock = 'alto';
        
        return {
            ventas: {
                ultimos7Dias: unidadesVendidas7,
                ultimos15Dias: unidadesVendidas15,
                ultimos30Dias: unidadesVendidas30,
                promedioDiario: parseFloat(demandaDiariaPromedio.toFixed(2))
            },
            stock: {
                actual: stock,
                rotacionDias: Math.round(rotacionStock * 10) / 10,
                nivel: nivelStock
            },
            tendencia: {
                porcentaje: Math.round(tendencia * 100) / 100,
                direccion: tendencia > 5 ? 'creciendo' : (tendencia < -5 ? 'decreciendo' : 'estable')
            },
            recomendacionBase: this.recomendacionBase(rotacionStock, stock, demandaDiariaPromedio)
        };
    }

    /**
     * Calcula el factor de ajuste basado en todas las métricas
     * @param {Object} metricas -
     * @returns {Number} 
     */
    calcularFactorAjuste(metricas) {
        let factor = 1.0; // Factor neutro
        
        const { ventas, stock, tendencia } = metricas;
        
        // 1. AJUSTE POR STOCK
        if (stock.nivel === 'agotado') {
            factor *= 1.15; 
        } else if (stock.nivel === 'bajo') {
            factor *= 1.08; 
        } else if (stock.nivel === 'alto') {
            factor *= 0.92; 
        }
        
        // 2. AJUSTE POR ROTACIÓN
        if (stock.rotacionDias < 7) {
            factor *= 1.10; 
        } else if (stock.rotacionDias > 60) {
            factor *= 0.85;
        } else if (stock.rotacionDias > 30) {
            factor *= 0.95; 
        }
        
        // 3. AJUSTE POR DEMANDA
        if (ventas.ultimos7Dias > ventas.ultimos15Dias / 2 * 1.2) {
            factor *= 1.05; 
        }
        
        if (ventas.ultimos7Dias < ventas.ultimos15Dias / 2 * 0.8) {
            factor *= 0.95; 
        }
        
        // 4. AJUSTE POR TENDENCIA
        if (tendencia.direccion === 'creciendo' && tendencia.porcentaje > 20) {
            factor *= 1.08; 
        } else if (tendencia.direccion === 'decreciendo' && tendencia.porcentaje < -20) {
            factor *= 0.92; 
        }
        
        // 5. CASOS ESPECIALES
        // Si no hay ventas en 30 días
        if (ventas.ultimos30Dias === 0) {
            factor *= 0.75; 
        }
        
        // Si hay mucho stock y pocas ventas
        if (stock.nivel === 'alto' && ventas.ultimos30Dias < 5) {
            factor *= 0.70; 
        }
        
        // Limitar factor entre 0.7 y 1.3 para evitar cambios extremos
        return Math.min(Math.max(factor, 0.7), 1.3);
    }

    /**
     * Calcula el precio recomendado
     * @param {Number} precioActual 
     * @param {Number} precioBase 
     * @param {Number} factorAjuste 
     * @param {Object} metricas 
     * @returns {Number} Precio recomendado
     */
    calcularPrecioRecomendado(precioActual, precioBase, factorAjuste, metricas) {
        // El precio no debe bajar del precio base (costo)
        const precioMinimo = precioBase * 0.9; 
        const precioMaximo = precioBase * 2.5; 
        
        // Calcular precio basado en el actual
        let precioRecomendado = precioActual * factorAjuste;
        
        // Ajustes adicionales basados en métricas específicas
        if (metricas.stock.nivel === 'agotado' && metricas.ventas.promedioDiario > 0) {
            // Si está agotado y hay demanda, subir más
            precioRecomendado = Math.max(precioRecomendado, precioActual * 1.1);
        }
        
        if (metricas.stock.rotacionDias > 90) {
            // Si rota muy lento, forzar baja
            precioRecomendado = Math.min(precioRecomendado, precioBase * 1.1);
        }
        
        // Asegurar que esté dentro de los límites
        return Math.min(Math.max(precioRecomendado, precioMinimo), precioMaximo);
    }

    /**
     * Determina la acción a tomar (subir/bajar/mantener)
     * @param {Number} precioActual 
     * @param {Number} precioRecomendado 
     * @returns {String} 
     */
    determinarAccion(precioActual, precioRecomendado) {
        const diferencia = ((precioRecomendado - precioActual) / precioActual) * 100;
        
        if (diferencia > 3) {
            return 'subir';
        } else if (diferencia < -3) {
            return 'bajar';
        } else {
            return 'mantener';
        }
    }

    /**
     * Genera una explicación legible de la recomendación
     * @param {String} accion 
     * @param {Object} metricas 
     * @param {Number} porcentaje 
     * @returns {String} Explicación
     */
    generarExplicacion(accion, metricas, porcentaje) {
        const { stock, ventas, tendencia } = metricas;
        
        let explicacion = '';
        
        switch(accion) {
            case 'subir':
                explicacion = '📈 Se recomienda SUBIR el precio ';
                if (stock.nivel === 'bajo') {
                    explicacion += 'porque el stock es bajo ';
                }
                if (tendencia.direccion === 'creciendo') {
                    explicacion += 'y la demanda está creciendo ';
                }
                if (ventas.ultimos7Dias > ventas.promedioDiario * 7 * 1.2) {
                    explicacion += '(ventas superiores al promedio)';
                }
                break;
                
            case 'bajar':
                explicacion = '📉 Se recomienda BAJAR el precio ';
                if (stock.nivel === 'alto') {
                    explicacion += 'para liquidar el exceso de inventario ';
                }
                if (tendencia.direccion === 'decreciendo') {
                    explicacion += 'porque la demanda está disminuyendo ';
                }
                if (stock.rotacionDias > 60) {
                    explicacion += '(rotación muy lenta)';
                }
                break;
                
            case 'mantener':
                explicacion = '✅ Se recomienda MANTENER el precio ';
                if (stock.nivel === 'normal') {
                    explicacion += 'porque el equilibrio stock-demanda es adecuado ';
                }
                if (tendencia.direccion === 'estable') {
                    explicacion += 'y el mercado está estable';
                }
                break;
        }
        
        return explicacion + ` (${Math.abs(porcentaje)}% de cambio)`;
    }

    /**
     * Recomendación base basada en reglas simples
     */
    recomendacionBase(rotacionDias, stock, demandaDiaria) {
        if (stock === 0) return 'URGENTE: Producto agotado';
        if (rotacionDias < 5) return 'VENTA RÁPIDA: Rotación muy alta';
        if (rotacionDias > 90) return 'LIQUIDAR: Rotación muy baja';
        if (demandaDiaria === 0) return 'SIN VENTAS: Revisar producto';
        return 'NORMAL: Monitorear';
    }

    // ============ FUNCIONES AUXILIARES ============

    filtrarVentasPorDias(ventas, dias) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - dias);
        
        return ventas.filter(v => new Date(v.fecha) >= fechaLimite);
    }

    filtrarVentasPorRango(ventas, diasInicio, diasFin) {
        const fechaInicio = new Date();
        fechaInicio.setDate(fechaInicio.getDate() - diasInicio);
        
        const fechaFin = new Date();
        fechaFin.setDate(fechaFin.getDate() - diasFin);
        
        return ventas.filter(v => {
            const fechaVenta = new Date(v.fecha);
            return fechaVenta >= fechaInicio && fechaVenta < fechaFin;
        });
    }

    sumarUnidades(ventas) {
        return ventas.reduce((total, venta) => total + venta.cantidad, 0);
    }

    /**
     * Calcula la elasticidad precio-demanda
     * @param {Array} ventasHistoricas - Ventas con diferentes precios
     * @returns {Number} Elasticidad
     */
    calcularElasticidad(ventasHistoricas) {
        if (ventasHistoricas.length < 10) return -1; // Elasticidad por defecto
        
        // Agrupar por precio
        const grupos = {};
        ventasHistoricas.forEach(v => {
            if (!grupos[v.precioUnitario]) {
                grupos[v.precioUnitario] = {
                    totalUnidades: 0,
                    count: 0
                };
            }
            grupos[v.precioUnitario].totalUnidades += v.cantidad;
            grupos[v.precioUnitario].count++;
        });
        
        // Calcular promedio por precio
        const precios = Object.keys(grupos).map(p => parseFloat(p));
        if (precios.length < 2) return -1;
        
        // Ordenar precios
        precios.sort((a, b) => a - b);
        
        // Calcular elasticidad básica
        const precioBajo = precios[0];
        const precioAlto = precios[precios.length - 1];
        
        const demandaBaja = grupos[precioBajo].totalUnidades / grupos[precioBajo].count;
        const demandaAlta = grupos[precioAlto].totalUnidades / grupos[precioAlto].count;
        
        if (precioAlto === precioBajo) return -1;
        
        const cambioPrecio = (precioAlto - precioBajo) / precioBajo;
        const cambioDemanda = (demandaAlta - demandaBaja) / demandaBaja;
        
        if (cambioPrecio === 0) return -1;
        
        return cambioDemanda / cambioPrecio;
    }
}

// Exportar una instancia única
module.exports = new AlgoritmoPrecios();























/**
 * ALGORITMO DE PRECIOS DINÁMICOS
 * SmartPrice Pyme - Corazón del sistema
 * 
 * Este algoritmo analiza:
 * - Stock disponible
 * - Ventas históricas (últimos 7, 15, 30 días)
 * - Demanda promedio
 * - Rotación de inventario
 * - Estacionalidad
 */