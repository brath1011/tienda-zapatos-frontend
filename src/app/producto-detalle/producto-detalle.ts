import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { CarritoService } from '../services/carrito.service';
import { ProductoService } from '../services/producto.service';
import { Zapato } from '../models/api.models';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './producto-detalle.html',
  styleUrl: './producto-detalle.scss'
})
export class ProductoDetalleComponent implements OnInit {
  private readonly productosApi = inject(ProductoService);
  private readonly carritoSvc = inject(CarritoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  readonly productos = signal<Zapato[]>([]);
  readonly productoActual = signal<Zapato | null>(null);
  readonly cargando = signal(true);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');
  
  tallaSeleccionada = signal<string>('');

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
    
    // Buscar productos de la misma categoría o marca, excluyendo las variantes exactas del mismo modelo
    let relacionados = this.productos().filter(p => {
      const esMismoModelo = p.nombre === actual.nombre && p.genero === actual.genero;
      if (esMismoModelo) return false; // Ya se muestran en variantes
      
      const mismaCategoria = p.categoria === actual.categoria;
      const mismaMarca = p.marca === actual.marca;
      const mismoGenero = p.genero === actual.genero;
      
      return (mismaCategoria || mismaMarca) && mismoGenero;
    });

    // Mezclar al azar y tomar máximo 4
    relacionados = relacionados.sort(() => 0.5 - Math.random());
    return relacionados.slice(0, 4);
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
        });
      },
      error: (err) => {
        this.mensajeError.set('No se pudieron cargar los datos.');
        this.cargando.set(false);
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
    return producto.nombre.toLowerCase().includes('force') || (producto.id || 0) % 2 === 0;
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
    this.router.navigate(['/producto', id]);
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
          this.mensaje.set(`Talla ${talla} agregada al carrito exitosamente.`);
          setTimeout(() => this.mensaje.set(''), 3000);
        } else {
          this.mensajeError.set(this.carritoSvc.mensaje() || 'No se pudo agregar al carrito.');
        }
      }
    });
  }
}
