import { Component, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PedidoService } from '../services/pedido.service';
import { ReporteService } from '../services/reporte.service';
import { AuthService } from '../services/auth.service';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss'
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  private readonly pedidoService = inject(PedidoService);
  private readonly reporteService = inject(ReporteService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly gananciasTotales = signal<number>(0);
  readonly filtroActual = signal<string>('hoy');
  readonly pedidosLista = signal<import('../models/api.models').Pedido[]>([]);

  // 1. Desglose de Ventas por Género
  readonly ventasPorGenero = computed(() => {
    const pedidos = this.pedidosLista();
    const generoMap: { [gen: string]: number } = { 'Caballero': 0, 'Mujer': 0, 'Unisex': 0 };
    let totalVendidos = 0;
    
    for (const pedido of pedidos) {
      if (pedido.estado === 'DEVUELTO') continue;
      if (pedido.detalles) {
        for (const det of pedido.detalles) {
          const gen = det.producto?.genero || 'Caballero';
          generoMap[gen] = (generoMap[gen] || 0) + det.cantidad;
          totalVendidos += det.cantidad;
        }
      }
    }
    
    return Object.entries(generoMap).map(([genero, cantidad]) => ({
      genero,
      cantidad,
      porcentaje: totalVendidos > 0 ? Math.round((cantidad / totalVendidos) * 100) : 0
    })).sort((a, b) => b.cantidad - a.cantidad);
  });

  // 2. Tallas más vendidas (Top 5)
  readonly tallasMasVendidas = computed(() => {
    const pedidos = this.pedidosLista();
    const tallaMap: { [talla: string]: number } = {};
    let totalVendidos = 0;

    for (const pedido of pedidos) {
      if (pedido.estado === 'DEVUELTO') continue;
      if (pedido.detalles) {
        for (const det of pedido.detalles) {
          if (det.tallaSeleccionada) {
            tallaMap[det.tallaSeleccionada] = (tallaMap[det.tallaSeleccionada] || 0) + det.cantidad;
            totalVendidos += det.cantidad;
          }
        }
      }
    }

    return Object.entries(tallaMap).map(([talla, cantidad]) => ({
      talla,
      cantidad,
      porcentaje: totalVendidos > 0 ? Math.round((cantidad / totalVendidos) * 100) : 0
    })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  });

  // 3. Zapatilla más vendida (Estrella)
  readonly zapatoMasVendido = computed(() => {
    const pedidos = this.pedidosLista();
    const zapatoMap: { [nombre: string]: { cantidad: number, marca: string } } = {};

    for (const pedido of pedidos) {
      if (pedido.estado === 'DEVUELTO') continue;
      if (pedido.detalles) {
        for (const det of pedido.detalles) {
          if (det.producto?.nombre) {
            const current = zapatoMap[det.producto.nombre] || { cantidad: 0, marca: det.producto.marca || 'Genérico' };
            current.cantidad += det.cantidad;
            zapatoMap[det.producto.nombre] = current;
          }
        }
      }
    }

    const sorted = Object.entries(zapatoMap).map(([nombre, info]) => ({
      nombre,
      marca: info.marca,
      cantidad: info.cantidad
    })).sort((a, b) => b.cantidad - a.cantidad);

    return sorted.length > 0 ? sorted[0] : null;
  });
  
  @ViewChild('graficoCanvas') graficoCanvas!: ElementRef;
  private chartInstance: Chart | null = null;

  readonly reporteForm = this.fb.group({
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required]
  });

  readonly fechaBusqueda = this.fb.control('');
  readonly fechaBusquedaFin = this.fb.control('');

  ngOnInit(): void {
    const hoy = new Date();
    const haceUnMes = new Date();
    haceUnMes.setMonth(hoy.getMonth() - 1);
    
    this.reporteForm.patchValue({
      fechaInicio: this.obtenerFechaLocal(haceUnMes),
      fechaFin: this.obtenerFechaLocal(hoy)
    });

    this.aplicarFiltro('hoy');
  }

  ngAfterViewInit(): void {
    if (this.authService.esAdmin()) {
      setTimeout(() => {
        const { fechaInicio, fechaFin } = this.reporteForm.value;
        if (fechaInicio && fechaFin) {
          this.cargarGrafico(fechaInicio, fechaFin);
        }
      }, 100);
    }
  }

  private obtenerFechaLocal(fecha: Date): string {
    const tzOffset = fecha.getTimezoneOffset() * 60000;
    return new Date(fecha.getTime() - tzOffset).toISOString().split('T')[0];
  }

  aplicarFiltro(rango: string): void {
    this.filtroActual.set(rango);
    const hoy = new Date();
    let inicio = '';
    let fin = this.obtenerFechaLocal(hoy);

    if (rango === 'hoy') {
      inicio = fin;
    } else if (rango === 'semana') {
      const semana = new Date();
      semana.setDate(hoy.getDate() - 7);
      inicio = this.obtenerFechaLocal(semana);
    } else if (rango === 'mes') {
      const mes = new Date();
      mes.setMonth(hoy.getMonth() - 1);
      inicio = this.obtenerFechaLocal(mes);
    } else if (rango === 'anio') {
      const anio = new Date();
      anio.setFullYear(hoy.getFullYear() - 1);
      inicio = this.obtenerFechaLocal(anio);
    } else if (['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'].includes(rango)) {
      // Calcular el día de la semana actual
      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const targetDay = dias.indexOf(rango);
      const currentDay = hoy.getDay();
      
      const diff = currentDay >= targetDay ? currentDay - targetDay : currentDay + 7 - targetDay;
      const targetDate = new Date();
      targetDate.setDate(hoy.getDate() - diff);
      
      inicio = this.obtenerFechaLocal(targetDate);
      fin = inicio; // Queremos solo ese día
    }

    if (rango === 'historico') {
      this.pedidoService.ganancias().subscribe({
        next: (total) => this.gananciasTotales.set(total || 0),
        error: () => console.error('Error al cargar ganancias historicas')
      });
      this.pedidoService.listarTodos().subscribe({
        next: (pedidos) => this.pedidosLista.set(pedidos),
        error: () => console.error('Error al cargar tabla historica')
      });
      // Para histórico, ponemos un rango muy amplio en el form
      this.reporteForm.patchValue({ fechaInicio: '2020-01-01', fechaFin: fin });
    } else {
      this.pedidoService.gananciasFechas(inicio, fin).subscribe({
        next: (total) => this.gananciasTotales.set(total || 0),
        error: () => console.error('Error al cargar ganancias por fecha')
      });
      this.pedidoService.listarPorFechas(inicio, fin).subscribe({
        next: (pedidos) => this.pedidosLista.set(pedidos),
        error: () => console.error('Error al cargar tabla de pedidos')
      });
      this.reporteForm.patchValue({ fechaInicio: inicio, fechaFin: fin });
    }

    if (this.authService.esAdmin()) {
      this.cargarGrafico(inicio, fin);
    }
  }

  buscarPorFecha(): void {
    const fecha = this.fechaBusqueda.value;
    let fechaFin = this.fechaBusquedaFin.value;
    
    if (!fecha) {
      alert('Por favor selecciona una fecha de inicio.');
      return;
    }
    
    if (!fechaFin) {
      fechaFin = fecha;
    }
    
    this.filtroActual.set('custom');
    
    this.pedidoService.gananciasFechas(fecha, fechaFin).subscribe({
      next: (total) => this.gananciasTotales.set(total || 0),
      error: () => console.error('Error al cargar ganancias por fecha')
    });

    this.pedidoService.listarPorFechas(fecha, fechaFin).subscribe({
      next: (pedidos) => this.pedidosLista.set(pedidos),
      error: () => console.error('Error al cargar tabla de pedidos')
    });

    // Sincronizar el formulario de reporte para que Excel descargue exactamente esta fecha
    this.reporteForm.patchValue({ fechaInicio: fecha, fechaFin: fechaFin });

    if (this.authService.esAdmin()) {
      // Para el gráfico
      this.pedidoService.gananciasGrafico(fecha, fechaFin).subscribe({
        next: (datos) => {
          const labels = datos.map(d => d.fecha);
          const data = datos.map(d => d.total);
          this.renderizarGrafico(labels, data);
        }
      });
    }
  }

  cargarGrafico(inicio: string, fin: string): void {
    if (!this.graficoCanvas) return;

    // Si es histórico, pedimos un rango súper amplio para el gráfico
    if (this.filtroActual() === 'historico') {
      inicio = '2020-01-01';
    }

    this.pedidoService.gananciasGrafico(inicio, fin).subscribe({
      next: (datos) => {
        const labels = datos.map(d => d.fecha);
        const data = datos.map(d => d.total);
        this.renderizarGrafico(labels, data);
      },
      error: () => console.error('Error al cargar datos del grafico')
    });
  }

  renderizarGrafico(labels: string[], data: number[]): void {
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
    
    const ctx = this.graficoCanvas.nativeElement.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Ventas por Día (S/.)',
          data: data,
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          pointBackgroundColor: '#2563eb',
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }

  descargarReporte(): void {
    if (this.reporteForm.invalid) {
      this.reporteForm.markAllAsTouched();
      return;
    }

    const { fechaInicio, fechaFin } = this.reporteForm.value;
    if (fechaInicio && fechaFin) {
      this.reporteService.descargarExcelVentas(fechaInicio, fechaFin);
    }
  }
}
