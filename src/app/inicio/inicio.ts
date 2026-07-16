import { Component, OnInit, OnDestroy, signal, ViewChild, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductoService } from '../services/producto.service';
import { CarritoService } from '../services/carrito.service';
import { AuthService } from '../services/auth.service';
import { Zapato } from '../models/api.models';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [RouterLink, FormsModule, CommonModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss'
})
export class InicioComponent implements OnInit, OnDestroy {
  banners = [
    { 
      id: 1,
      imagen: 'assets/img/hero1.jpg', 
      titulo: 'Camina con estilo, pisa con fuerza',
      subtitulo: 'Descubre la nueva colección. Las mejores marcas, la mejor calidad, directamente a tus pies.',
      link: '/catalogo',
      queryParams: { categoria: 'Urbano' },
      textoBoton: 'Ver Colección 2026'
    },
    { 
      id: 2,
      imagen: 'assets/img/hero2.jpg', 
      titulo: 'LO ÚLTIMO DE NIKE',
      subtitulo: 'Tecnología y confort en cada paso.',
      link: '/catalogo',
      queryParams: { categoria: 'Deportivo' },
      textoBoton: 'Comprar Nike'
    },
    { 
      id: 3,
      imagen: 'assets/img/hero3.jpg', 
      titulo: 'COLECCIÓN MUJER',
      subtitulo: 'Diseños exclusivos para destacar tu estilo.',
      link: '/catalogo',
      queryParams: { categoria: 'Correr' },
      textoBoton: 'Ver Modelos'
    },
    { 
      id: 4,
      imagen: 'assets/img/hero4.jpg', 
      titulo: 'OFERTAS DE TEMPORADA',
      subtitulo: 'Encuentra descuentos increíbles por tiempo limitado.',
      link: '/catalogo',
      queryParams: { nuevo: 'true' },
      textoBoton: 'Ver Ofertas'
    }
  ];

  slideActual = signal(0);
  private intervalo: any;

  private readonly productosApi = inject(ProductoService);
  private readonly carritoSvc = inject(CarritoService);
  readonly auth = inject(AuthService);
  
  mensaje = signal('');
  mensajeError = signal('');

  ngOnInit() {
    this.iniciarSlider();
    this.cargarProductosDestacados();
  }

  ngOnDestroy() {
    this.detenerSlider();
  }

  iniciarSlider() {
    this.intervalo = setInterval(() => {
      this.siguiente();
    }, 6000); // 6 segundos
  }

  detenerSlider() {
    if (this.intervalo) {
      clearInterval(this.intervalo);
    }
  }

  siguiente() {
    this.slideActual.set((this.slideActual() + 1) % this.banners.length);
  }

  anterior() {
    this.slideActual.set((this.slideActual() - 1 + this.banners.length) % this.banners.length);
  }

  irA(index: number) {
    this.slideActual.set(index);
    this.detenerSlider();
    this.iniciarSlider();
  }

  // --- Productos más comprados ---
  @ViewChild('productosSlider') productosSlider!: ElementRef;

  readonly productos = signal<Zapato[]>([]);
  tallaSeleccionadaPorProducto: { [id: number]: string } = {};

  cargarProductosDestacados() {
    this.productosApi.listar().subscribe({
      next: (prods) => {
        // Filtrar usando la lógica de "más vendidos" o simplemente tomar los primeros 8
        const destacados = prods.filter(p => this.esMasVendido(p) && this.calcularTotalStock(p) > 0).slice(0, 8);
        this.productos.set(destacados);
      },
      error: (e) => console.error('Error al cargar productos destacados', e)
    });
  }

  esMasVendido(producto: Zapato): boolean {
    if (!producto.tallasStock) return false;
    const tallasBajo12 = Object.values(producto.tallasStock).filter(stock => stock !== undefined && stock > 0 && stock < 12);
    return tallasBajo12.length >= 2;
  }

  obtenerPorcentajeDescuento(precio: number, precioDescuento?: number): number {
    if (!precioDescuento || precio <= 0) return 0;
    return Math.round(((precio - precioDescuento) / precio) * 100);
  }
  
  getPrimeraImagen(imagenStr?: string): string {
    if (!imagenStr) return 'assets/no-image.png';
    return imagenStr.split(',')[0];
  }

  calcularTotalStock(producto: Zapato): number {
    if (!producto.tallasStock) return 0;
    return Object.values(producto.tallasStock).reduce((acc, curr) => acc + (curr || 0), 0);
  }

  todasLasTallasDelProducto(producto: Zapato): { talla: string; stock: number }[] {
    if (!producto.tallasStock) return [];
    return Object.entries(producto.tallasStock)
      .map(([talla, stock]) => ({ talla, stock: stock || 0 }))
      .sort((a, b) => parseFloat(a.talla) - parseFloat(b.talla));
  }

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
          setTimeout(() => this.mensaje.set(''), 3000);
          return;
        }
        this.mensajeError.set(this.carritoSvc.mensaje() || 'No se pudo agregar al carrito.');
      }
    });
  }

  scrollProds(direccion: number) {
    if (this.productosSlider) {
      const slider = this.productosSlider.nativeElement;
      const scrollAmount = 300; // Ajustar según el ancho de la tarjeta
      slider.scrollBy({ left: direccion * scrollAmount, behavior: 'smooth' });
    }
  }
}
