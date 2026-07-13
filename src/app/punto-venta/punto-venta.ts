import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductoService } from '../services/producto.service';
import { PedidoService } from '../services/pedido.service';
import { Zapato } from '../models/api.models';

@Component({
  selector: 'app-punto-venta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './punto-venta.html',
  styleUrls: ['./punto-venta.scss']
})
export class PuntoVentaComponent implements OnInit {
  // Productos y búsqueda
  productos = signal<Zapato[]>([]);
  terminoBusqueda = signal('');
  
  // Carrito
  carrito = signal<{ producto: Zapato, cantidad: number, precioUnitario: number, tallaSeleccionada: string }[]>([]);
  
  // Formulario de Cliente
  clienteForm = {
    email: '',
    dni: '',
    metodoPago: 'EFECTIVO'
  };

  // Estados
  cargando = signal(false);
  mensaje = signal<{ texto: string, tipo: 'exito' | 'error' } | null>(null);

  constructor(
    private readonly productoService: ProductoService,
    private readonly pedidoService: PedidoService
  ) {}

  ngOnInit(): void {
    this.cargarProductos();
  }

  cargarProductos(): void {
    this.productoService.listar().subscribe({
      next: (data) => this.productos.set(data),
      error: () => this.mostrarMensaje('Error al cargar productos', 'error')
    });
  }

  productosFiltradosPorVariante(): Zapato[] {
    const termino = this.terminoBusqueda().toLowerCase();
    const list = this.productos();
    const map = new Map<string, Zapato[]>();
    for (const p of list) {
      if (termino && !p.nombre.toLowerCase().includes(termino) && !p.marca.toLowerCase().includes(termino)) {
        continue; // filter out if doesn't match
      }
      if (!map.has(p.nombre)) map.set(p.nombre, []);
      map.get(p.nombre)!.push(p);
    }
    
    return Array.from(map.values()).map(variantes => this.obtenerVarianteActiva(variantes));
  }

  varianteSeleccionadaPorModelo = signal<{ [nombre: string]: number }>({});

  obtenerVarianteActiva(variantes: Zapato[]): Zapato {
    const modeloNombre = variantes[0].nombre;
    const idSeleccionado = this.varianteSeleccionadaPorModelo()[modeloNombre];
    if (idSeleccionado) {
      const variante = variantes.find(v => v.id === idSeleccionado);
      if (variante) return variante;
    }
    return variantes[0];
  }

  seleccionarVariante(modeloNombre: string, idProducto: number): void {
    this.varianteSeleccionadaPorModelo.update(current => ({
      ...current,
      [modeloNombre]: idProducto
    }));
  }

  calcularTotalStock(producto: Zapato): number {
    if (!producto.tallasStock) return 0;
    return Object.values(producto.tallasStock).reduce((acc, curr) => acc + (curr || 0), 0);
  }

  tallasDisponibles(producto: Zapato): string[] {
    if (!producto.tallasStock) return [];
    return Object.entries(producto.tallasStock)
      .filter(([_, stock]) => stock > 0)
      .map(([talla, _]) => talla)
      .sort((a, b) => parseInt(a) - parseInt(b));
  }

  obtenerVariantesDeProductoActivo(productoActivo: Zapato): Zapato[] {
    return this.productos().filter(p => p.nombre === productoActivo.nombre);
  }

  tallaSeleccionadaPorProducto: { [id: number]: string } = {};

  seleccionarTalla(idProducto: number, talla: string): void {
    this.tallaSeleccionadaPorProducto[idProducto] = talla;
  }

  getPrimeraImagen(imagenStr?: string): string {
    if (!imagenStr) return 'assets/no-image.png';
    return imagenStr.split(',')[0];
  }

  agregarAlCarrito(producto: Zapato): void {
    if (this.calcularTotalStock(producto) <= 0) {
      this.mostrarMensaje('No hay stock disponible', 'error');
      return;
    }

    const tallaSeleccionada = this.tallaSeleccionadaPorProducto[producto.id!];
    if (!tallaSeleccionada) {
      this.mostrarMensaje(`Seleccione una talla para ${producto.nombre}`, 'error');
      return;
    }

    const stockDeTalla = producto.tallasStock ? (producto.tallasStock[tallaSeleccionada] || 0) : 0;

    const currentCarrito = this.carrito();
    const itemExistente = currentCarrito.find(item => item.producto.id === producto.id && item.tallaSeleccionada === tallaSeleccionada);
    const precio = producto.precio;

    if (itemExistente) {
      if (itemExistente.cantidad >= stockDeTalla) {
        this.mostrarMensaje('Límite de stock alcanzado para esa talla', 'error');
        return;
      }
      this.carrito.update(c => c.map(item => 
        item.producto.id === producto.id && item.tallaSeleccionada === tallaSeleccionada
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      this.carrito.update(c => [...c, { producto, cantidad: 1, precioUnitario: precio, tallaSeleccionada }]);
    }
  }

  quitarDelCarrito(productoId?: number, tallaSeleccionada?: string): void {
    if (productoId && tallaSeleccionada) {
      this.carrito.update(c => c.filter(item => !(item.producto.id === productoId && item.tallaSeleccionada === tallaSeleccionada)));
    }
  }

  calcularTotal(): number {
    return this.carrito().reduce((total, item) => total + (item.precioUnitario * item.cantidad), 0);
  }

  procesarVenta(): void {
    if (this.carrito().length === 0) {
      this.mostrarMensaje('El carrito está vacío', 'error');
      return;
    }
    if (!this.clienteForm.email || !this.clienteForm.dni) {
      this.mostrarMensaje('Complete todos los datos del cliente', 'error');
      return;
    }

    this.cargando.set(true);

    const detalles = this.carrito().map(item => ({
      producto: { id: item.producto.id },
      cantidad: item.cantidad,
      tallaSeleccionada: item.tallaSeleccionada
    }));

    const request = {
      emailCliente: this.clienteForm.email,
      dniCliente: this.clienteForm.dni,
      nombreCliente: 'Cliente',
      metodoPago: this.clienteForm.metodoPago,
      pedido: {
        detalles: detalles
      }
    };

    this.pedidoService.registrarPresencial(request).subscribe({
      next: (pedido: any) => {
        this.cargando.set(false);
        this.mostrarMensaje(`Venta #${pedido.idPedido || ''} registrada exitosamente. Boleta electrónica enviada.`, 'exito');
        this.limpiarFormulario();
        this.cargarProductos(); // Refrescar stock
      },
      error: (err) => {
        console.error("ERROR REGISTRANDO VENTA PRESENCIAL:", err);
        this.cargando.set(false);
        const mensajeServidor = err.error?.error || err.error || 'Error al procesar la venta. Verifique stock o conexión.';
        this.mostrarMensaje(mensajeServidor, 'error');
      }
    });
  }

  imprimirUltimoTicket(): void {
      window.print();
  }

  limpiarFormulario(): void {
    this.carrito.set([]);
    this.clienteForm = {
      email: '',
      dni: '',
      metodoPago: 'EFECTIVO'
    };
  }

  mostrarMensaje(texto: string, tipo: 'exito' | 'error'): void {
    this.mensaje.set({ texto, tipo });
    setTimeout(() => this.mensaje.set(null), 5000);
  }
}
