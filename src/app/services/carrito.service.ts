import { Injectable, computed, signal } from '@angular/core';
import { Observable, of } from 'rxjs';
import { CarritoItem, Zapato } from '../models/api.models';

const CARRITO_STORAGE_KEY = 'tienda_zapatos_carrito';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  // Estado reactivo
  readonly items = signal<CarritoItem[]>([]);
  readonly cargando = signal(false);
  readonly mensaje = signal('');

  // Propiedades computadas
  readonly cantidadGlobal = computed(() =>
    this.items().reduce((total, item) => total + item.cantidad, 0)
  );

  readonly totalGlobal = computed(() =>
    this.items().reduce((total, item) => total + this.getSubtotal(item), 0)
  );

  constructor() {
    // Carga inicial sincrónica (pero también mantenemos el método cargar para compatibilidad)
    this.cargarDesdeStorage();
  }

  cargar(): Observable<CarritoItem[]> {
    this.cargando.set(true);
    this.cargarDesdeStorage();
    this.cargando.set(false);
    return of(this.items());
  }

  agregarItem(producto: Zapato, cantidad = 1, tallaSeleccionada: string): Observable<boolean> {
    if (!producto.id) {
      this.mensaje.set('El producto no tiene un ID valido.');
      return of(false);
    }
    
    if (!tallaSeleccionada) {
      this.mensaje.set('Debes seleccionar una talla.');
      return of(false);
    }

    this.mensaje.set('');
    this.items.update((itemsActuales) => {
      const existente = itemsActuales.find((item) => item.producto.id === producto.id && item.tallaSeleccionada === tallaSeleccionada);
      
      let nuevosItems: CarritoItem[];
      if (existente) {
        nuevosItems = itemsActuales.map((item) =>
          item.producto.id === producto.id && item.tallaSeleccionada === tallaSeleccionada
            ? {
                ...item,
                cantidad: item.cantidad + cantidad,
                subtotal: item.producto.precio * (item.cantidad + cantidad)
              }
            : item
        );
      } else {
        nuevosItems = [...itemsActuales, { producto, cantidad, tallaSeleccionada, subtotal: producto.precio * cantidad }];
      }
      
      this.guardarEnStorage(nuevosItems);
      return nuevosItems;
    });

    this.mensaje.set('Producto agregado al carrito.');
    return of(true);
  }

  eliminarProducto(idProducto: number, tallaSeleccionada: string): Observable<boolean> {
    this.items.update((itemsActuales) => {
      const nuevosItems = itemsActuales.filter((item) => !(item.producto.id === idProducto && item.tallaSeleccionada === tallaSeleccionada));
      this.guardarEnStorage(nuevosItems);
      return nuevosItems;
    });
    this.mensaje.set('Producto eliminado.');
    return of(true);
  }

  vaciar(): Observable<boolean> {
    this.items.set([]);
    this.guardarEnStorage([]);
    this.mensaje.set('Carrito vaciado.');
    return of(true);
  }

  obtenerTotalBackend(): Observable<number> {
    return of(this.totalGlobal());
  }

  getProducto(item: CarritoItem): Zapato {
    return item.producto;
  }

  getSubtotal(item: CarritoItem): number {
    return item.subtotal ?? item.producto.precio * item.cantidad;
  }

  private cargarDesdeStorage(): void {
    try {
      const stored = localStorage.getItem(CARRITO_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as CarritoItem[];
        this.items.set(parsed);
      }
    } catch {
      this.items.set([]);
    }
  }

  private guardarEnStorage(items: CarritoItem[]): void {
    localStorage.setItem(CARRITO_STORAGE_KEY, JSON.stringify(items));
  }
}