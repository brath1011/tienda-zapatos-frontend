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
  imports: [CommonModule, ReactiveFormsModule, DescuentoPricePipe],
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
  readonly guardando = signal(false);
  readonly productoEditando = signal<Zapato | null>(null);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');

  readonly categorias = ['Deportivo', 'Casual', 'Formal', 'Urbano', 'Botas'];
  readonly tallas = this.fb.array(['38', '39', '40', '41', '42'].map((talla) => this.fb.nonNullable.control(talla)));

  readonly productosConStock = computed(() => this.productos().filter((producto) => producto.stock > 0).length);

  readonly productoForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    marca: ['', [Validators.required, Validators.minLength(2)]],
    talla: ['42', [Validators.required]],
    color: ['', [Validators.required]],
    categoria: ['Deportivo', [Validators.required]],
    precio: [0, [Validators.required, Validators.min(1)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    descripcion: ['', [Validators.required, Validators.minLength(8)]],
    imagenUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]]
  });

  readonly ofertaForm = this.fb.nonNullable.group({
    idProducto: [0, [Validators.required, Validators.min(1)]],
    porcentaje: [10, [Validators.required, Validators.min(1), Validators.max(90)]]
  });

  ngOnInit(): void {
    this.cargarProductos();
  }

  get tallasArray(): FormArray<FormControl<string>> {
    return this.tallas;
  }

  agregarTalla(): void {
    this.tallas.push(this.fb.nonNullable.control(''));
  }

  eliminarTalla(index: number): void {
    if (this.tallas.length > 1) {
      this.tallas.removeAt(index);
    }
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

  agregarAlCarrito(producto: Zapato): void {
    if (!this.auth.estaAutenticado()) {
      this.mensajeError.set('Inicia sesión para agregar productos al carrito.');
      return;
    }

    this.mensaje.set('');
    this.mensajeError.set('');

    this.carritoSvc.agregarItem(producto, 1).subscribe({
      next: (agregado) => {
        if (agregado) {
          this.mensaje.set(`${producto.nombre} agregado al carrito.`);
          return;
        }

        this.mensajeError.set(this.carritoSvc.mensaje() || 'No se pudo agregar el producto al carrito.');
      }
    });
  }

  guardarProducto(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      this.mensajeError.set('Completa correctamente el formulario de producto.');
      return;
    }

    const producto = this.productoForm.getRawValue();
    const editando = this.productoEditando();
    this.guardando.set(true);
    this.mensaje.set('');
    this.mensajeError.set('');

    const request = editando?.id
      ? this.productosApi.actualizar(editando.id, { ...producto, id: editando.id })
      : this.productosApi.crear(producto);

    request.subscribe({
      next: () => {
        this.mensaje.set(editando ? 'Producto actualizado correctamente.' : 'Producto creado correctamente.');
        this.cancelarEdicion();
        this.cargarProductos();
      },
      error: (error) => this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo guardar el producto.')),
      complete: () => this.guardando.set(false)
    });
  }

  editarProducto(producto: Zapato): void {
    this.productoEditando.set(producto);
    this.productoForm.patchValue({
      nombre: producto.nombre,
      marca: producto.marca,
      talla: producto.talla,
      color: producto.color,
      categoria: producto.categoria,
      precio: producto.precio,
      stock: producto.stock,
      descripcion: producto.descripcion,
      imagenUrl: producto.imagenUrl
    });
  }

  eliminarProducto(producto: Zapato): void {
    if (!producto.id) return;

    this.productosApi.eliminar(producto.id).subscribe({
      next: () => {
        this.mensaje.set('Producto eliminado correctamente.');
        this.cargarProductos();
      },
      error: (error) => this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo eliminar el producto.'))
    });
  }

  aplicarOferta(): void {
    if (this.ofertaForm.invalid) {
      this.ofertaForm.markAllAsTouched();
      return;
    }

    const { idProducto, porcentaje } = this.ofertaForm.getRawValue();
    this.ofertasApi.aplicarDescuento(idProducto, porcentaje).subscribe({
      next: () => {
        this.mensaje.set('Descuento aplicado correctamente.');
        this.cargarProductos();
      },
      error: (error) => this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo aplicar el descuento.'))
    });
  }

  cancelarEdicion(): void {
    this.productoEditando.set(null);
    this.productoForm.reset({
      nombre: '',
      marca: '',
      talla: '42',
      color: '',
      categoria: 'Deportivo',
      precio: 0,
      stock: 0,
      descripcion: '',
      imagenUrl: ''
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
