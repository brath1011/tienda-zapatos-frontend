import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { PedidoService } from '../services/pedido.service';
import { Pedido } from '../models/api.models';

@Component({
  selector: 'app-mis-compras',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './mis-compras.component.html',
  styleUrl: './mis-compras.component.scss'
})
export class MisComprasComponent implements OnInit {
  private readonly pedidosApi = inject(PedidoService);
  
  readonly pedidos = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');

  readonly boletaSeleccionada = signal<Pedido | null>(null); // Guardará el pedido completo para mostrar detalles en la boleta

  ngOnInit(): void {
    this.cargarCompras();
  }

  cargarCompras(): void {
    this.pedidosApi.misCompras().subscribe({
      next: (data) => {
        // Ordenar del más reciente al más antiguo
        const ordenados = data.sort((a, b) => b.idPedido - a.idPedido);
        this.pedidos.set(ordenados);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar historial', err);
        this.error.set('No se pudo cargar tu historial de compras.');
        this.cargando.set(false);
      }
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

  solicitarReembolso(pedido: Pedido): void {
    const seguro = confirm('¿Estás seguro de hacer el reembolso? Si tu producto se compró en descuentos especiales (ej. Black Friday, Fiestas Patrias), no se devolverá el producto.');
    if (!seguro) return;

    this.pedidosApi.reembolsar(pedido.idPedido).subscribe({
      next: (pedidoActualizado) => {
        alert('Reembolso procesado exitosamente.');
        this.cargarCompras(); // Recargar la lista para reflejar el estado REEMBOLSADO
      },
      error: (err) => {
        console.error('Error al solicitar reembolso', err);
        const mensaje = err.error?.message || 'No se pudo procesar el reembolso.';
        alert(mensaje);
      }
    });
  }
}
