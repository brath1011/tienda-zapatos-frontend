import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CarritoService } from '../services/carrito.service';
import { ProductoService } from '../services/producto.service';
import { Zapato } from '../models/api.models';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.scss'
})
export class ProductoDetalleComponent implements OnInit {
  private readonly productosApi = inject(ProductoService);
  readonly carritoSvc = inject(CarritoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly productos = signal<Zapato[]>([]);
  readonly productoActual = signal<Zapato | null>(null);
  readonly cargando = signal(true);
  readonly cargandoVariante = signal(false);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');
  
  tallaSeleccionada = signal<string>('');
  readonly mostrarGuia = signal(false);
  readonly mostrarModalAgregado = signal(false);

  readonly variantesMismoModelo = computed(() => {
    const actual = this.productoActual();
    if (!actual) return [];
    return this.productos().filter(p => 
      p.nombre === actual.nombre && 
      p.genero === actual.genero && 
      p.categoria === actual.categoria
    );
  });

  readonly productosRelacionados = computed(() => {
    const actual = this.productoActual();
    if (!actual) return [];
    
    // Excluir el modelo exacto que estamos viendo, pero permitir cualquier otra categoría/marca
    let relacionados = this.productos().filter(p => {
      const esMismoModelo = p.nombre === actual.nombre && p.genero === actual.genero;
      return !esMismoModelo;
    });

    // Mezclar al azar y tomar máximo 8 para rellenar la sección
    relacionados = relacionados.sort(() => 0.5 - Math.random());
    return relacionados.slice(0, 8);
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    // Fetch all products to get variants too
    this.productosApi.listar().subscribe({
      next: (productos) => {
        this.productos.set(productos);
        
        // Listen to route changes
        this.route.paramMap.subscribe(params => {
          const id = Number(params.get('id'));
          const prod = this.productos().find(p => p.id === id);
          if (prod) {
            this.productoActual.set(prod);
            this.tallaSeleccionada.set(''); // Reset talla
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            this.router.navigate(['/catalogo']);
          }
          this.cargando.set(false);
          this.cargandoVariante.set(false);
        });
      },
      error: (err) => {
        this.mensajeError.set('No se pudieron cargar los datos.');
        this.cargando.set(false);
        this.cargandoVariante.set(false);
      }
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

  esMasVendido(producto: Zapato): boolean {
    if (!producto.tallasStock) return false;
    const tallasBajo12 = Object.values(producto.tallasStock).filter(stock => stock !== undefined && stock > 0 && stock < 12);
    return tallasBajo12.length >= 2;
  }

  obtenerPorcentajeDescuento(precio: number, precioDescuento?: number): number {
    if (!precioDescuento || precio <= 0) return 0;
    return Math.round(((precio - precioDescuento) / precio) * 100);
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

  seleccionarTalla(talla: string): void {
    this.tallaSeleccionada.set(talla);
  }

  seleccionarVariante(id: number): void {
    const v = this.productos().find(p => p.id === id);
    if (!v) {
      this.router.navigate(['/producto', id]);
      return;
    }

    const imgUrl = this.getPrimeraImagen(v.imagen);
    if (!imgUrl || imgUrl === 'assets/no-image.png') {
      this.router.navigate(['/producto', id]);
      return;
    }

    this.cargandoVariante.set(true);

    const img = new Image();
    img.onload = () => {
      this.router.navigate(['/producto', id]);
    };
    img.onerror = () => {
      this.router.navigate(['/producto', id]);
    };
    img.src = imgUrl;
  }

  volverCatalogo(): void {
    this.router.navigate(['/catalogo']);
  }

  agregarAlCarrito(): void {
    const prod = this.productoActual();
    if (!prod) return;

    if (!this.auth.estaAutenticado()) {
      this.mensajeError.set('Inicia sesión para agregar productos al carrito.');
      return;
    }
    const talla = this.tallaSeleccionada();
    if (!talla) {
      this.mensajeError.set(`Selecciona una talla para ${prod.nombre} antes de añadir al carrito.`);
      return;
    }
    this.mensaje.set('');
    this.mensajeError.set('');
    
    this.carritoSvc.agregarItem(prod, 1, talla).subscribe({
      next: (agregado) => {
        if (agregado) {
          this.mostrarModalAgregado.set(true);
          setTimeout(() => this.mostrarModalAgregado.set(false), 4000);
        } else {
          this.mensajeError.set(this.carritoSvc.mensaje() || 'No se pudo agregar al carrito.');
        }
      }
    });
  }
}
