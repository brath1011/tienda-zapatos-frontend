import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { CarritoItem, Zapato } from '../models/api.models';

type ApiRecord = Record<string, unknown>;

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  private readonly baseUrl = `${environment.apiUrl}/carrito`;

  readonly items = signal<CarritoItem[]>([]);
  readonly cargando = signal(false);
  readonly mensaje = signal('');

  readonly cantidadGlobal = computed(() =>
    this.items().reduce((total, item) => total + item.cantidad, 0)
  );

  readonly totalGlobal = computed(() =>
    this.items().reduce((total, item) => total + this.getSubtotal(item), 0)
  );

  constructor(private readonly http: HttpClient) {}

  cargar(): Observable<CarritoItem[]> {
    this.cargando.set(true);
    this.mensaje.set('');

    return this.http.get(this.baseUrl, { responseType: 'text' }).pipe(
      map((response) => this.parsearRespuesta(response)),
      map((response) => this.normalizarRespuesta(response)),
      tap((items) => this.items.set(items)),
      catchError((error) => {
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo cargar el carrito.'));
        return of(this.items());
      }),
      finalize(() => this.cargando.set(false))
    );
  }

  agregarItem(producto: Zapato, cantidad = 1): Observable<boolean> {
    if (!producto.id) {
      this.mensaje.set('El producto no tiene un ID valido.');
      return of(false);
    }

    this.mensaje.set('');

    return this.http.post(`${this.baseUrl}/agregar?idProducto=${producto.id}&cantidad=${cantidad}`, null, {
      responseType: 'text'
    }).pipe(
      tap(() => {
        this.agregarLocalmente(producto, cantidad);
        this.cargar().subscribe();
      }),
      map(() => true),
      catchError((error) => {
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo agregar el producto al carrito.'));
        return of(false);
      })
    );
  }

  eliminarProducto(idProducto: number): Observable<boolean> {
    return this.http.delete(`${this.baseUrl}/${idProducto}`, { responseType: 'text' }).pipe(
      tap(() => {
        this.items.update((items) => items.filter((item) => item.producto.id !== idProducto));
        this.cargar().subscribe();
      }),
      map(() => true),
      catchError((error) => {
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo eliminar el producto.'));
        return of(false);
      })
    );
  }

  vaciar(): Observable<boolean> {
    return this.http.delete(`${this.baseUrl}/vaciar`, { responseType: 'text' }).pipe(
      tap(() => this.items.set([])),
      map(() => true),
      catchError((error) => {
        this.mensaje.set(this.obtenerMensajeError(error, 'No se pudo vaciar el carrito.'));
        return of(false);
      })
    );
  }

  obtenerTotalBackend(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/total`).pipe(
      catchError(() => of(this.totalGlobal()))
    );
  }

  getProducto(item: CarritoItem): Zapato {
    return item.producto;
  }

  getSubtotal(item: CarritoItem): number {
    return item.subtotal ?? item.producto.precio * item.cantidad;
  }

  private normalizarRespuesta(response: unknown): CarritoItem[] {
    if (Array.isArray(response)) {
      return response.map((item) => this.normalizarItem(item)).filter((item): item is CarritoItem => item !== null);
    }

    if (!this.esRegistro(response)) return [];

    const posiblesListas = [response['items'], response['carrito'], response['contenido'], response['content']];
    const lista = posiblesListas.find(Array.isArray);

    if (!lista) return [];

    return lista.map((item) => this.normalizarItem(item)).filter((item): item is CarritoItem => item !== null);
  }

  private parsearRespuesta(response: string): unknown {
    const texto = response.trim();
    if (!texto) return [];

    try {
      return JSON.parse(texto);
    } catch {
      return [];
    }
  }

  private normalizarItem(item: unknown): CarritoItem | null {
    if (!this.esRegistro(item)) return null;

    const producto = this.normalizarProducto(item['producto'] ?? item['zapato'] ?? item);
    if (!producto) return null;

    const cantidad = this.obtenerNumero(item['cantidad']) ?? 1;
    const subtotal = this.obtenerNumero(item['subtotal']) ?? producto.precio * cantidad;

    return {
      id: this.obtenerNumero(item['id']),
      producto,
      cantidad,
      subtotal
    };
  }

  private normalizarProducto(value: unknown): Zapato | null {
    if (!this.esRegistro(value)) return null;

    const id = this.obtenerNumero(value['id'] ?? value['idZapato'] ?? value['idProducto'] ?? value['productoId']);
    const nombre = this.obtenerTexto(value['nombre']);

    if (!id && !nombre) return null;

    return {
      id,
      nombre: nombre || 'Producto',
      marca: this.obtenerTexto(value['marca']) || 'Sin marca',
      talla: this.obtenerTexto(value['talla']) || '',
      color: this.obtenerTexto(value['color']) || '',
      categoria: this.obtenerTexto(value['categoria']) || '',
      precio: this.obtenerNumero(value['precio']) ?? 0,
      stock: this.obtenerNumero(value['stock']) ?? 0,
      descripcion: this.obtenerTexto(value['descripcion']) || '',
      imagenUrl: this.obtenerTexto(value['imagenUrl']) || this.obtenerTexto(value['imagen']) || ''
    };
  }

  private esRegistro(value: unknown): value is ApiRecord {
    return typeof value === 'object' && value !== null;
  }

  private obtenerNumero(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      const numero = Number(value);
      return Number.isFinite(numero) ? numero : undefined;
    }

    return undefined;
  }

  private obtenerTexto(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }

  private agregarLocalmente(producto: Zapato, cantidad: number): void {
    this.items.update((items) => {
      const existente = items.find((item) => item.producto.id === producto.id);

      if (existente) {
        return items.map((item) =>
          item.producto.id === producto.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidad,
                subtotal: item.producto.precio * (item.cantidad + cantidad)
              }
            : item
        );
      }

      return [...items, { producto, cantidad, subtotal: producto.precio * cantidad }];
    });
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const apiError = (error as { error?: unknown }).error;
      if (typeof apiError === 'string') return apiError;
    }

    if (typeof error === 'object' && error && 'status' in error) {
      const status = (error as { status?: number }).status;
      return status ? `${fallback} Código HTTP ${status}.` : fallback;
    }

    return fallback;
  }
}
