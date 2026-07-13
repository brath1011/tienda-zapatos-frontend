import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CarritoService } from '../services/carrito.service';
import { OfertaService } from '../services/oferta.service';
import { ProductoService } from '../services/producto.service';
import { Zapato } from '../models/api.models';
import { DescuentoPricePipe } from '../pipes/descuento.pipe';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss'
})
export class CatalogoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productosApi = inject(ProductoService);
  private readonly ofertasApi = inject(OfertaService);
  private readonly carritoSvc = inject(CarritoService);

  readonly auth = inject(AuthService);
  readonly productos = signal<Zapato[]>([]);
  readonly cargando = signal(false);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');
  
  readonly categorias = ['Deportivo', 'Casual', 'Formal', 'Urbano', 'Botas'];
  readonly productosConStock = computed(() => this.productos().filter((producto) => this.calcularTotalStock(producto) > 0).length);

  readonly modelosAgrupados = computed(() => {
    const productosArray = this.productos();
    const map = new Map<string, Zapato[]>();
    for (const p of productosArray) {
      const clave = `${p.nombre.trim().toLowerCase()}|${(p.genero || 'Caballero')}|${p.categoria}`;
      if (!map.has(clave)) map.set(clave, []);
      map.get(clave)!.push(p);
    }
    return Array.from(map.values());
  });

  // Agrupar por categoría para mostrar secciones en el catálogo
  readonly modelosPorCategoria = computed(() => {
    const grupos = this.modelosAgrupados();
    const catMap = new Map<string, Zapato[][]>();
    for (const grupo of grupos) {
      const cat = grupo[0].categoria || 'Otros';
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(grupo);
    }
    return Array.from(catMap.entries()).map(([cat, grupos]) => ({ cat, grupos }));
  });

  readonly categoriasOrden = ['Deportivo', 'Urbano', 'Casual', 'Formal', 'Botas'];

  get modelosPorCategoriaOrdenados() {
    return this.modelosPorCategoria().sort((a, b) =>
      (this.categoriasOrden.indexOf(a.cat) ?? 99) - (this.categoriasOrden.indexOf(b.cat) ?? 99)
    );
  }

  varianteSeleccionadaPorModelo = signal<{ [nombre: string]: number }>({});
  productoDetalle = signal<Zapato | null>(null);

  ngOnInit(): void {
    this.cargarProductos();
  }

  getPrimeraImagen(imagenStr?: string): string {
    if (!imagenStr) return 'assets/no-image.png';
    return imagenStr.split(',')[0];
  }

  getImagenesGaleria(imagenStr?: string): string[] {
    if (!imagenStr) return [];
    return imagenStr.split(',').filter(url => url.trim() !== '');
  }

  verDetalle(producto: Zapato): void {
    this.productoDetalle.set(producto);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cerrarDetalle(): void {
    this.productoDetalle.set(null);
  }

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
    // Actualizar el detalle si está abierto
    const abierto = this.productoDetalle();
    if (abierto && abierto.nombre === modeloNombre) {
       const variantesDelModelo = this.modelosAgrupados().find(v => v[0].nombre === modeloNombre);
       if (variantesDelModelo) {
         const nueva = variantesDelModelo.find(v => v.id === idProducto);
         if (nueva) this.productoDetalle.set(nueva);
       }
    }
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

  cargarProductos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.productosApi.listar().subscribe({
      next: (productos) => this.productos.set(productos),
      error: (error) => this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo cargar el catálogo. Verifica que el backend esté en http://localhost:8090.')),
      complete: () => this.cargando.set(false)
    });
  }

  tallaSeleccionadaPorProducto: { [id: number]: string } = {};

  seleccionarTalla(idProducto: number, talla: string): void {
    this.tallaSeleccionadaPorProducto[idProducto] = talla;
  }

  agregarAlCarrito(producto: Zapato): void {
    if (!this.auth.estaAutenticado()) {
      this.mensajeError.set('Inicia sesión para agregar productos al carrito.');
      return;
    }

    const tallaSeleccionada = this.tallaSeleccionadaPorProducto[producto.id!];
    if (!tallaSeleccionada) {
      this.mensajeError.set(`Selecciona una talla para ${producto.nombre} antes de añadir al carrito.`);
      return;
    }

    this.mensaje.set('');
    this.mensajeError.set('');

    this.carritoSvc.agregarItem(producto, 1, tallaSeleccionada).subscribe({
      next: (agregado) => {
        if (agregado) {
          this.mensaje.set(`Talla ${tallaSeleccionada} de ${producto.nombre} agregada al carrito.`);
          return;
        }

        this.mensajeError.set(this.carritoSvc.mensaje() || 'No se pudo agregar el producto al carrito.');
      }
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
