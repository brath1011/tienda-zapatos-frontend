import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../services/pedido.service';
import { AuthService } from '../services/auth.service';
import { Pedido } from '../models/api.models';
import { obtenerZonaPorDistrito } from '../utils/ubigeo.data';

import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-pedidos.html',
  styleUrl: './admin-pedidos.scss'
})
export class AdminPedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  readonly authService = inject(AuthService); // Expuesto para HTML

  readonly pedidos = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly mensaje = signal('');
  readonly boletaSeleccionada = signal<Pedido | null>(null); // Añadido para ver boleta
  readonly pedidoInfoSeleccionado = signal<Pedido | null>(null); // Añadido para ver info extra (repartidor y entrega)
  readonly getZonaPedido = obtenerZonaPorDistrito; // Expuesto al HTML
  
  // Repartidores
  readonly repartidores = signal<any[]>([]);
  
  // Modal de estado
  readonly pedidoAEditar = signal<Pedido | null>(null);
  readonly nuevoEstadoPropuesto = signal<string>('');
  readonly repartidorSeleccionado = signal<number | null>(null);

  // Modal de eliminar
  readonly pedidoAEliminar = signal<Pedido | null>(null);

  ngOnInit(): void {
    this.cargarPedidos();
    this.cargarRepartidores();
  }

  cargarRepartidores(): void {
    this.pedidoService.listarRepartidores().subscribe({
      next: (data) => this.repartidores.set(data),
      error: () => console.error('Error al cargar repartidores')
    });
  }

  cargarPedidos(): void {
    this.cargando.set(true);
    this.pedidoService.listarTodos().subscribe({
      next: (data) => {
        // Ordenar por ID descendente (más recientes primero)
        this.pedidos.set(data.sort((a, b) => b.idPedido - a.idPedido));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  fechaInicioFiltro = signal<string>('');
  fechaFinFiltro = signal<string>('');

  buscarPorFechas(): void {
    const inicio = this.fechaInicioFiltro();
    let fin = this.fechaFinFiltro();
    
    if (!inicio) {
      alert('Por favor selecciona una fecha (Inicio) para buscar.');
      return;
    }
    if (!fin) {
      fin = inicio; // Si solo seleccionan una fecha, busca por ese único día
    }

    this.cargando.set(true);
    this.pedidoService.listarPorFechas(inicio, fin).subscribe({
      next: (data) => {
        this.pedidos.set(data.sort((a, b) => b.idPedido - a.idPedido));
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        alert('Error al buscar pedidos por fecha');
      }
    });
  }

  limpiarFiltros(): void {
    this.fechaInicioFiltro.set('');
    this.fechaFinFiltro.set('');
    this.cargarPedidos();
  }

  abrirModalEstado(pedido: Pedido): void {
    this.pedidoAEditar.set(pedido);
    this.nuevoEstadoPropuesto.set(pedido.estado);
    this.repartidorSeleccionado.set(null);
  }

  cerrarModalEstado(): void {
    this.pedidoAEditar.set(null);
    this.nuevoEstadoPropuesto.set('');
    this.repartidorSeleccionado.set(null);
  }

  confirmarCambioEstado(): void {
    const pedido = this.pedidoAEditar();
    const nuevoEstado = this.nuevoEstadoPropuesto();
    
    if (!pedido || !nuevoEstado || pedido.estado === nuevoEstado) {
      this.cerrarModalEstado();
      return;
    }
    
    let idRepartidor: number | undefined = undefined;
    if (nuevoEstado === 'LISTO_PARA_ENVIO') {
      const repartidorSel = this.repartidorSeleccionado();
      if (!repartidorSel) {
        alert('Debes seleccionar un repartidor para enviar el pedido a reparto.');
        return;
      }
      
      const repartidorObj = this.repartidores().find(r => r.id === repartidorSel);
      const distritoPedido = pedido.direccion?.distrito;
      const zonaPedido = distritoPedido ? obtenerZonaPorDistrito(distritoPedido) : null;
      const zonaRepartidor = this.getZonaRepartidor(repartidorObj).toUpperCase();
      const zonaPedidoUpperCase = zonaPedido ? zonaPedido.toUpperCase() : null;

      if (repartidorObj && zonaPedidoUpperCase && zonaRepartidor) {
        if (!zonaRepartidor.includes(zonaPedidoUpperCase)) {
          const confirmar = confirm(`⚠️ ADVERTENCIA DE LOGÍSTICA:\nEste pedido pertenece al distrito de ${distritoPedido} (Zona ${zonaPedidoUpperCase}).\nEstás intentando asignarlo a ${repartidorObj.nombre} que cubre la Zona ${zonaRepartidor}.\n\n¿Estás seguro de continuar con esta asignación cruzada?`);
          if (!confirmar) {
            return;
          }
        }
      }
      
      idRepartidor = repartidorSel;
    }

    this.pedidoService.cambiarEstado(pedido.idPedido, nuevoEstado, idRepartidor).subscribe({
      next: () => {
        this.mensaje.set(`El estado del pedido #${pedido.idPedido} se cambió a ${nuevoEstado}.`);
        this.cargarPedidos();
        this.cerrarModalEstado();
        setTimeout(() => this.mensaje.set(''), 4000);
      },
      error: () => alert('Error al cambiar el estado')
    });
  }

  // --- LÓGICA DE ELIMINAR (SOLO ADMIN) ---
  abrirModalEliminar(pedido: Pedido): void {
    this.pedidoAEliminar.set(pedido);
  }

  cerrarModalEliminar(): void {
    this.pedidoAEliminar.set(null);
  }

  confirmarEliminar(): void {
    const pedido = this.pedidoAEliminar();
    if (!pedido) return;

    this.pedidoService.eliminar(pedido.idPedido).subscribe({
      next: () => {
        this.mensaje.set(`✅ El pedido #${pedido.idPedido} ha sido eliminado y el stock fue devuelto.`);
        this.cargarPedidos();
        this.cerrarModalEliminar();
        setTimeout(() => this.mensaje.set(''), 5000);
      },
      error: () => alert('Error al eliminar el pedido.')
    });
  }

  verBoleta(pedido: Pedido): void {
    if (pedido.comprobante) {
      this.boletaSeleccionada.set(pedido);
    } else {
      alert('Este pedido aún no tiene una boleta generada.');
    }
  }

  cerrarBoleta(): void {
    this.boletaSeleccionada.set(null);
  }

  getEstadoClase(estado: string): string {
    switch(estado.toUpperCase()) {
      case 'PENDIENTE': return 'badge-pendiente';
      case 'DESPACHADO': 
      case 'LISTO_PARA_ENVIO': return 'badge-despachado';
      case 'ENTREGADO': 
      case 'ENTREGADO_PRESENCIAL': return 'badge-entregado';
      default: return 'badge-default';
    }
  }

  getZonaRepartidor(repartidor: any): string {
    if (repartidor?.zona) return repartidor.zona;
    
    // Fallback por si el backend aún no se ha reiniciado y 'zona' viene null
    const email = (repartidor?.email || '').toLowerCase();
    if (email === 'repartidor@gmail.com') return 'NORTE';
    if (email === 'repartidor2@gmail.com') return 'SUR';
    if (email === 'repartidor3@gmail.com') return 'ESTE';
    if (email === 'repartidor4@gmail.com' || email.includes('daniel') || email.includes('kevin')) return 'CENTRO';
    
    return '';
  }
}
