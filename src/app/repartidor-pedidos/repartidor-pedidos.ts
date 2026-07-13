import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PedidoService } from '../services/pedido.service';
import { AuthService } from '../services/auth.service';
import { Pedido } from '../models/api.models';

@Component({
  selector: 'app-repartidor-pedidos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './repartidor-pedidos.html',
  styleUrl: './repartidor-pedidos.scss'
})
export class RepartidorPedidosComponent implements OnInit {
  private readonly pedidoService = inject(PedidoService);
  readonly authService = inject(AuthService);
  
  readonly pestanaActiva = signal<'PENDIENTES' | 'HISTORIAL'>('PENDIENTES');
  readonly pedidos = signal<Pedido[]>([]);
  readonly historial = signal<Pedido[]>([]);
  readonly cargando = signal(true);
  readonly cargandoHistorial = signal(false);
  readonly mensaje = signal('');

  get zonaRepartidor(): string {
    return this.authService.usuario()?.zona || '';
  }

  intervalId: any;

  ngOnInit(): void {
    this.cargarPedidos();
    this.cargarHistorial();
    
    // Auto-refresh cada 10 segundos
    this.intervalId = setInterval(() => {
      if (this.pestanaActiva() === 'PENDIENTES') {
        this.cargarPedidos();
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cambiarPestana(pestana: 'PENDIENTES' | 'HISTORIAL'): void {
    this.pestanaActiva.set(pestana);
    if (pestana === 'HISTORIAL') {
      this.cargarHistorial();
    } else {
      this.cargarPedidos();
    }
  }

  cargarPedidos(): void {
    this.cargando.set(true);
    this.pedidoService.listarParaReparto().subscribe({
      next: (data) => {
        // Ordenar por ID descendente
        this.pedidos.set(data.sort((a, b) => b.idPedido - a.idPedido));
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  cargarHistorial(): void {
    this.cargandoHistorial.set(true);
    this.pedidoService.misEntregas().subscribe({
      next: (data) => {
        this.historial.set(data.sort((a, b) => b.idPedido - a.idPedido));
        this.cargandoHistorial.set(false);
      },
      error: () => this.cargandoHistorial.set(false)
    });
  }

  buscarHistorial(fecha: string): void {
    if (!fecha) {
      this.cargarHistorial();
      return;
    }
    
    this.cargandoHistorial.set(true);
    this.pedidoService.misEntregasFechas(fecha, fecha).subscribe({
      next: (data) => {
        this.historial.set(data.sort((a, b) => b.idPedido - a.idPedido));
        this.cargandoHistorial.set(false);
      },
      error: () => this.cargandoHistorial.set(false)
    });
  }

  entregar(pedido: Pedido): void {
    if (!confirm(`¿Entregaste el paquete a ${pedido.usuario?.nombre}?`)) return;
    
    this.pedidoService.entregar(pedido.idPedido).subscribe({
      next: () => {
        this.mensaje.set(`✅ El pedido #${pedido.idPedido} ha sido marcado como ENTREGADO.`);
        this.cargarPedidos();
        this.cargarHistorial(); // Refrescar historial
        setTimeout(() => this.mensaje.set(''), 4000);
      },
      error: () => alert('Error al registrar la entrega. Revisa tu conexión.')
    });
  }
}
