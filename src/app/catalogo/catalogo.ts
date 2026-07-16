import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CarritoService } from '../services/carrito.service';
import { OfertaService } from '../services/oferta.service';
import { ProductoService } from '../services/producto.service';
import { Zapato } from '../models/api.models';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss'
})
export class CatalogoComponent implements OnInit {
  private readonly productosApi = inject(ProductoService);
  private readonly ofertasApi = inject(OfertaService);
  private readonly carritoSvc = inject(CarritoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly auth = inject(AuthService);
  readonly productos = signal<Zapato[]>([]);
  readonly cargando = signal(false);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');

  // ─── FILTROS ACTIVOS ───────────────────────────────────────────
  readonly filtroGenero = signal<string>('Todos');
  readonly filtroBusqueda = signal<string>('');
  readonly filtroNuevo = signal<boolean>(false);
  readonly filtroCategoria = signal<string>('');    // '' = todas
  readonly filtroColor = signal<string>('');         // '' = todos
  readonly filtroTalla = signal<string>('');         // '' = todas
  readonly filtroMarca = signal<string>('');         // '' = todas
  readonly filtroPrecioMax = signal<number>(9999);
  readonly filtroSoloEnDescuento = signal<boolean>(false);

  // ─── ACORDEONES ABIERTOS/CERRADOS ──────────────────────────────
  readonly filtroGeneroAbierto = signal(true);
  readonly filtroTallaAbierto = signal(false);
  readonly filtroCategoriaAbierto = signal(false);
  readonly filtroColorAbierto = signal(false);
  readonly filtroPrecioAbierto = signal(false);
  readonly filtroDescuentoAbierto = signal(false);
  readonly filtroMarcaAbierto = signal(false);

  toggleFiltro(filtro: string): void {
    switch (filtro) {
      case 'genero': this.filtroGeneroAbierto.update(v => !v); break;
      case 'talla': this.filtroTallaAbierto.update(v => !v); break;
      case 'categoria': this.filtroCategoriaAbierto.update(v => !v); break;
      case 'color': this.filtroColorAbierto.update(v => !v); break;
      case 'precio': this.filtroPrecioAbierto.update(v => !v); break;
      case 'descuento': this.filtroDescuentoAbierto.update(v => !v); break;
      case 'marca': this.filtroMarcaAbierto.update(v => !v); break;
    }
  }

  // ─── OPCIONES DINÁMICAS EXTRAÍDAS DE LOS PRODUCTOS ─────────────
  readonly coloresDisponibles = computed(() =>
    [...new Set(this.productos().map(p => p.color).filter(c => !!c))].sort()
  );

  readonly marcasDisponibles = computed(() =>
    [...new Set(this.productos().map(p => p.marca).filter(m => !!m))].sort()
  );

  readonly categoriasDisponibles = computed(() =>
    [...new Set(this.productos().map(p => p.categoria).filter(c => !!c))].sort()
  );

  // Todas las tallas únicas que existen en todos los productos
  readonly tallasDisponiblesGlobal = computed(() => {
    const set = new Set<string>();
    for (const p of this.productos()) {
      if (p.tallasStock) {
        Object.keys(p.tallasStock).forEach(t => set.add(t));
      }
    }
    return [...set].sort((a, b) => parseFloat(a) - parseFloat(b));
  });

  // Stock total de una talla en todos los productos (para saber si mostrar opaca)
  stockGlobalDeTalla(talla: string): number {
    return this.productos().reduce((total, p) => {
      return total + (p.tallasStock?.[talla] || 0);
    }, 0);
  }

  readonly precioMaxDisponible = computed(() => {
    const precios = this.productos().map(p => p.precio);
    return precios.length ? Math.ceil(Math.max(...precios)) : 9999;
  });

  // ─── FILTRADO COMPLETO ─────────────────────────────────────────
  readonly productosFiltrados = computed(() => {
    let prods = this.productos();

    // 1. Filtro de género (desde URL o barra lateral)
    const gen = this.filtroGenero();
    if (gen !== 'Todos') {
      prods = prods.filter(p => {
        const pGen = (p.genero || 'Caballero').toLowerCase();
        if (gen.toLowerCase() === 'hombre') return pGen === 'caballero' || pGen === 'unisex';
        if (gen.toLowerCase() === 'mujer') return pGen === 'mujer' || pGen === 'unisex';
        return pGen === gen.toLowerCase();
      });
    }

    // 2. Filtro de búsqueda por texto
    const query = this.filtroBusqueda().trim().toLowerCase();
    if (query) {
      prods = prods.filter(p =>
        p.nombre.toLowerCase().includes(query) ||
        p.marca.toLowerCase().includes(query) ||
        p.categoria.toLowerCase().includes(query) ||
        (p.color && p.color.toLowerCase().includes(query))
      );
    }

    // 3. Filtro "Lo nuevo"
    const nuevo = this.filtroNuevo();
    if (nuevo && prods.length > 0) {
      const sortedIds = [...prods].map(p => p.id || 0).sort((a, b) => b - a);
      const thresholdId = sortedIds[Math.min(3, sortedIds.length - 1)];
      prods = prods.filter(p => (p.id || 0) >= thresholdId);
    }

    // 4. Filtro por CATEGORÍA
    const cat = this.filtroCategoria();
    if (cat) {
      prods = prods.filter(p => p.categoria.toLowerCase() === cat.toLowerCase());
    }

    // 5. Filtro por COLOR
    const color = this.filtroColor();
    if (color) {
      prods = prods.filter(p => p.color.toLowerCase() === color.toLowerCase());
    }

    // 6. Filtro por TALLA (que tenga stock en esa talla)
    const talla = this.filtroTalla();
    if (talla) {
      prods = prods.filter(p => (p.tallasStock?.[talla] || 0) > 0);
    }

    // 7. Filtro por MARCA
    const marca = this.filtroMarca();
    if (marca) {
      prods = prods.filter(p => p.marca.toLowerCase() === marca.toLowerCase());
    }

    // 8. Filtro por PRECIO MÁXIMO
    const precioMax = this.filtroPrecioMax();
    if (precioMax < this.precioMaxDisponible()) {
      prods = prods.filter(p => p.precio <= precioMax);
    }

    // 9. Filtro "solo en descuento" (placeholder — cuando se agregue campo descuento)
    // if (this.filtroSoloEnDescuento()) { ... }

    return prods;
  });

  readonly productosConStock = computed(() =>
    this.productosFiltrados().filter(p => this.calcularTotalStock(p) > 0).length
  );

  readonly tarjetasPorCategoria = computed(() => {
    const productosArray = this.productosFiltrados();
    const todosProductos = this.productos();

    // 1. Agrupar TODOS los productos para saber qué variantes (colores) existen para cada modelo
    const mapVariantes = new Map<string, Zapato[]>();
    for (const p of todosProductos) {
      const clave = `${p.nombre.trim().toLowerCase()}|${(p.genero || 'Caballero')}|${p.categoria}`;
      if (!mapVariantes.has(clave)) mapVariantes.set(clave, []);
      mapVariantes.get(clave)!.push(p);
    }

    // 2. Agrupar los productos FILTRADOS por modelo para asegurar que se muestran juntos
    const mapFiltradosPorModelo = new Map<string, Zapato[]>();
    for (const p of productosArray) {
      const clave = `${p.nombre.trim().toLowerCase()}|${(p.genero || 'Caballero')}|${p.categoria}`;
      if (!mapFiltradosPorModelo.has(clave)) mapFiltradosPorModelo.set(clave, []);
      mapFiltradosPorModelo.get(clave)!.push(p);
    }

    // 3. Crear las tarjetas respetando el orden por modelo
    const catMap = new Map<string, { base: Zapato; variantes: Zapato[] }[]>();
    // Ordenamos las claves para que los modelos salgan alfabéticamente
    const clavesOrdenadas = Array.from(mapFiltradosPorModelo.keys()).sort();
    
    for (const clave of clavesOrdenadas) {
      const productosDelModelo = mapFiltradosPorModelo.get(clave)!;
      const variantesDelModelo = mapVariantes.get(clave) || [];
      
      for (const p of productosDelModelo) {
        const cat = p.categoria || 'Otros';
        if (!catMap.has(cat)) catMap.set(cat, []);
        catMap.get(cat)!.push({ base: p, variantes: variantesDelModelo });
      }
    }
    return Array.from(catMap.entries()).map(([cat, tarjetas]) => ({ cat, tarjetas }));
  });

  readonly categoriasOrden = ['Deportivo', 'Urbano', 'Jordan', 'Correr'];

  get modelosPorCategoriaOrdenados() {
    return this.tarjetasPorCategoria().sort((a, b) =>
      (this.categoriasOrden.indexOf(a.cat) ?? 99) - (this.categoriasOrden.indexOf(b.cat) ?? 99)
    );
  }

  // ─── CONTEO DE FILTROS ACTIVOS ─────────────────────────────────
  readonly filtrosActivos = computed(() => {
    let n = 0;
    if (this.filtroGenero() !== 'Todos') n++;
    if (this.filtroCategoria()) n++;
    if (this.filtroColor()) n++;
    if (this.filtroTalla()) n++;
    if (this.filtroMarca()) n++;
    if (this.filtroPrecioMax() < this.precioMaxDisponible()) n++;
    return n;
  });

  limpiarFiltros(): void {
    this.filtroGenero.set('Todos');
    this.filtroCategoria.set('');
    this.filtroColor.set('');
    this.filtroTalla.set('');
    this.filtroMarca.set('');
    this.filtroPrecioMax.set(this.precioMaxDisponible());
    this.filtroSoloEnDescuento.set(false);
  }

  seleccionarFiltroGenero(genero: string): void {
    this.filtroGenero.set(this.filtroGenero() === genero ? 'Todos' : genero);
  }

  toggleFiltroCheck<T>(señal: ReturnType<typeof signal<T>>, valor: T, vacio: T): void {
    señal.set(señal() === valor ? vacio : valor);
  }

  // ─── ESTADO DE DETALLE ─────────────────────────────────────────
  varianteSeleccionadaPorTarjeta = signal<{ [idTarjeta: number]: number }>({});
  cargandoVariantePorTarjeta = signal<{ [tarjetaId: string]: boolean }>({});
  mostrarFiltrosMobile = signal(false);
  productoDetalle = signal<Zapato | null>(null);
  cargandoDetalle = signal<boolean>(false);

  esMasVendido(producto: Zapato): boolean {
    if (!producto.tallasStock) return false;
    const tallasBajo12 = Object.values(producto.tallasStock).filter(stock => stock !== undefined && stock > 0 && stock < 12);
    return tallasBajo12.length >= 2;
  }

  obtenerPorcentajeDescuento(precio: number, precioDescuento?: number): number {
    if (!precioDescuento || precio <= 0) return 0;
    return Math.round(((precio - precioDescuento) / precio) * 100);
  }

  toggleFiltrosMobile(): void {
    this.mostrarFiltrosMobile.update(v => !v);
  }

  ngOnInit(): void {
    this.cargarProductos();

    this.route.queryParams.subscribe(params => {
      this.filtroGenero.set(params['genero'] || 'Todos');
      this.filtroBusqueda.set(params['buscar'] || '');
      this.filtroNuevo.set(params['nuevo'] === 'true');
      this.filtroCategoria.set(params['categoria'] || '');
    });
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
    this.router.navigate(['/producto', producto.id]);
  }

  cerrarDetalle(): void {
    this.productoDetalle.set(null);
  }

  obtenerVarianteParaTarjeta(idTarjeta: number, base: Zapato, variantes: Zapato[]): Zapato {
    const idSeleccionado = this.varianteSeleccionadaPorTarjeta()[idTarjeta];
    if (idSeleccionado) {
      const variante = variantes.find(v => v.id === idSeleccionado);
      if (variante) return variante;
    }
    return base;
  }

  seleccionarVariante(idTarjeta: number, varianteUrl: string, idProducto: number): void {
    if (this.varianteSeleccionadaPorTarjeta()[idTarjeta] === idProducto) return;
    
    const imgUrl = this.getPrimeraImagen(varianteUrl);
    if (!imgUrl || imgUrl === 'assets/no-image.png') {
      this.varianteSeleccionadaPorTarjeta.update(current => ({ ...current, [idTarjeta]: idProducto }));
      return;
    }

    this.cargandoVariantePorTarjeta.update(c => ({ ...c, [idTarjeta]: true }));

    const img = new Image();
    img.onload = () => {
      this.varianteSeleccionadaPorTarjeta.update(current => ({ ...current, [idTarjeta]: idProducto }));
      this.cargandoVariantePorTarjeta.update(c => ({ ...c, [idTarjeta]: false }));
    };
    img.onerror = () => {
      this.varianteSeleccionadaPorTarjeta.update(current => ({ ...current, [idTarjeta]: idProducto }));
      this.cargandoVariantePorTarjeta.update(c => ({ ...c, [idTarjeta]: false }));
    };
    img.src = imgUrl;
  }

  calcularTotalStock(producto: Zapato): number {
    if (!producto.tallasStock) return 0;
    return Object.values(producto.tallasStock).reduce((acc, curr) => acc + (curr || 0), 0);
  }

  tallasDisponibles(producto: Zapato): string[] {
    if (!producto.tallasStock) return [];
    return Object.entries(producto.tallasStock)
      .filter(([_, stock]) => stock > 0)
      .map(([talla]) => talla)
      .sort((a, b) => parseFloat(a) - parseFloat(b));
  }

  todasLasTallasDelProducto(producto: Zapato): { talla: string; stock: number }[] {
    if (!producto.tallasStock) return [];
    return Object.entries(producto.tallasStock)
      .map(([talla, stock]) => ({ talla, stock: stock || 0 }))
      .sort((a, b) => parseFloat(a.talla) - parseFloat(b.talla));
  }

  cargarProductos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.productosApi.listar().subscribe({
      next: (productos) => {
        this.productos.set(productos);
        this.filtroPrecioMax.set(Math.ceil(Math.max(...productos.map(p => p.precio), 0)));
      },
      error: (error) => this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo cargar el catálogo.')),
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
