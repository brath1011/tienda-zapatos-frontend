import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoItem } from '../models/api.models';
import { CarritoService } from '../services/carrito.service';
import { PedidoService } from '../services/pedido.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss'
})
export class CarritoComponent implements OnInit {
  readonly carritoSvc = inject(CarritoService);
  private readonly pedidosApi = inject(PedidoService);

  readonly procesando = signal(false);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');

  ngOnInit(): void {
    this.carritoSvc.cargar().subscribe();
  }

  eliminar(item: CarritoItem): void {
    const producto = this.carritoSvc.getProducto(item);
    const idProducto = producto.id;

    if (!idProducto) {
      this.mensajeError.set('No se pudo identificar el producto a eliminar.');
      return;
    }

    this.carritoSvc.eliminarProducto(idProducto).subscribe({
      next: () => this.mensaje.set('Producto eliminado del carrito.')
    });
  }

  vaciar(): void {
    this.carritoSvc.vaciar().subscribe({
      next: () => this.mensaje.set('Carrito vacío.')
    });
  }

  comprar(): void {
    const detalles = this.carritoSvc.items()
      .map((item) => {
        const producto = this.carritoSvc.getProducto(item);
        const idProducto = producto.id;

        return idProducto
          ? { producto: { id: idProducto }, cantidad: item.cantidad ?? 1 }
          : null;
      })
      .filter((detalle): detalle is { producto: { id: number }; cantidad: number } => detalle !== null);

    if (detalles.length === 0) {
      this.mensajeError.set('El carrito no tiene productos válidos para comprar.');
      return;
    }

    this.procesando.set(true);
    this.mensaje.set('');
    this.mensajeError.set('');

    this.pedidosApi.comprar({ detalles }).subscribe({
      next: () => {
        this.mensaje.set('Compra registrada correctamente.');
        this.carritoSvc.vaciar().subscribe();
      },
      error: (error) => this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo registrar la compra.')),
      complete: () => this.procesando.set(false)
    });
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const apiError = (error as { error?: unknown }).error;
      if (typeof apiError === 'string') return apiError;
    }

    return fallback;
  }
}
