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

  // Identificadores de pedidos ordenados y fijados
  readonly pedidosOrdenadosIds = signal<number[]>([]);
  readonly pedidosFijadosIds = signal<number[]>([]);

  get zonaRepartidor(): string {
    return this.authService.usuario()?.zona || '';
  }

  get keyStoragePrefijo(): string {
    const userEmail = this.authService.usuario()?.email || 'default';
    return `repartidor_${userEmail}`;
  }

  // Conexión SSE (reemplaza el setInterval de 10 segundos)
  private sseEmitter: EventSource | null = null;

  ngOnInit(): void {
    this.cargarConfiguracionLocal();
    this.cargarPedidos();
    this.cargarHistorial();
    this.conectarSSE();
  }

  ngOnDestroy(): void {
    // Cerrar la conexión SSE limpiamente al salir del panel
    if (this.sseEmitter) {
      this.sseEmitter.close();
      this.sseEmitter = null;
    }
  }

  /**
   * Abre la conexión SSE con el backend.
   * El servidor empujará el evento 'nuevo-pedido' cuando Ventas asigne un pedido.
   * Si la conexión cae (red cortada), el navegador la reintenta automáticamente.
   */
  conectarSSE(): void {
    const token = this.authService.getToken();
    if (!token) return;

    this.sseEmitter = this.pedidoService.suscribirNotificaciones(token);

    // El servidor confirma la conexión inicial con el evento 'conectado'
    this.sseEmitter.addEventListener('conectado', () => {
      console.log('[SSE] Conexión SSE establecida con el servidor.');
    });

    // Cuando llega un pedido nuevo asignado, refrescar la lista
    this.sseEmitter.addEventListener('nuevo-pedido', () => {
      console.log('[SSE] Nuevo pedido asignado recibido.');
      this.cargarPedidos();
    });

    // Manejo de errores de red (el navegador reintenta automáticamente)
    this.sseEmitter.onerror = (error) => {
      console.warn('[SSE] Error de conexión, el navegador reintentará automáticamente.', error);
    };
  }

  cargarConfiguracionLocal(): void {
    try {
      const ordStr = localStorage.getItem(`${this.keyStoragePrefijo}_orden`);
      const fixStr = localStorage.getItem(`${this.keyStoragePrefijo}_fijados`);
      
      if (ordStr) {
        this.pedidosOrdenadosIds.set(JSON.parse(ordStr));
      }
      if (fixStr) {
        this.pedidosFijadosIds.set(JSON.parse(fixStr));
      }
    } catch (e) {
      console.error('Error al cargar configuración local de ruta:', e);
    }
  }

  guardarConfiguracionLocal(): void {
    try {
      localStorage.setItem(`${this.keyStoragePrefijo}_orden`, JSON.stringify(this.pedidosOrdenadosIds()));
      localStorage.setItem(`${this.keyStoragePrefijo}_fijados`, JSON.stringify(this.pedidosFijadosIds()));
    } catch (e) {
      console.error('Error al guardar configuración local de ruta:', e);
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
        const savedIds = this.pedidosOrdenadosIds();
        const incomingMap = new Map<number, Pedido>();
        data.forEach(p => incomingMap.set(p.idPedido, p));

        const finalOrdered: Pedido[] = [];
        const activeSavedIds: number[] = [];

        // 1. Respetar el orden guardado para los pedidos existentes
        savedIds.forEach(id => {
          if (incomingMap.has(id)) {
            finalOrdered.push(incomingMap.get(id)!);
            incomingMap.delete(id);
            activeSavedIds.push(id);
          }
        });

        // 2. Pedidos nuevos se añaden al final (ordenados por ID descendente)
        const newPedidos = Array.from(incomingMap.values()).sort((a, b) => b.idPedido - a.idPedido);
        const newIds: number[] = [];
        newPedidos.forEach(p => {
          finalOrdered.push(p);
          newIds.push(p.idPedido);
        });

        // 3. Guardar el orden unificado
        const updatedIds = [...activeSavedIds, ...newIds];
        this.pedidosOrdenadosIds.set(updatedIds);
        this.guardarConfiguracionLocal();

        this.pedidos.set(finalOrdered);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  moverPedido(index: number, direccion: 'ARRIBA' | 'ABAJO'): void {
    const currentList = [...this.pedidos()];
    const targetIndex = direccion === 'ARRIBA' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= currentList.length) return;

    const item1 = currentList[index];
    const item2 = currentList[targetIndex];

    // Si alguno de los dos pedidos está fijado con candado, no permitir el movimiento
    if (this.esPedidoFijado(item1.idPedido) || this.esPedidoFijado(item2.idPedido)) {
      return;
    }

    // Intercambiar posiciones
    currentList[index] = item2;
    currentList[targetIndex] = item1;

    this.pedidos.set(currentList);
    this.pedidosOrdenadosIds.set(currentList.map(p => p.idPedido));
    this.guardarConfiguracionLocal();
  }

  cambiarFijacion(idPedido: number): void {
    const currentFijados = [...this.pedidosFijadosIds()];
    const index = currentFijados.indexOf(idPedido);

    if (index >= 0) {
      currentFijados.splice(index, 1);
    } else {
      currentFijados.push(idPedido);
    }

    this.pedidosFijadosIds.set(currentFijados);
    this.guardarConfiguracionLocal();
  }

  esPedidoFijado(idPedido: number): boolean {
    return this.pedidosFijadosIds().includes(idPedido);
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
