import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { environment } from '../../environments/environment';
import { ProductoService } from '../services/producto.service';
import { Zapato } from '../models/api.models';

@Component({
  selector: 'app-admin-productos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './admin-productos.html',
  styleUrl: './admin-productos.scss'
})
export class AdminProductosComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly productosApi = inject(ProductoService);

  readonly productos = signal<Zapato[]>([]);
  readonly cargando = signal(false);
  readonly guardando = signal(false);
  readonly productoEditando = signal<boolean>(false);
  readonly productoVerStock = signal<Zapato | null>(null);
  readonly variantesDelModelo = signal<Zapato[]>([]);
  readonly imagenPreview = signal('');
  
  readonly mensaje = signal('');
  readonly mensajeError = signal('');

  readonly tallasCaballero = ['39', '40', '41', '42', '43', '44'];
  readonly tallasMujer = ['35', '36', '37', '38', '39', '40'];
  readonly tallasUnisex = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];
  readonly generoSeleccionado = signal<'Caballero' | 'Mujer' | 'Unisex'>('Caballero');

  readonly tallasFiltradas = computed(() => {
    const gen = this.generoSeleccionado();
    if (gen === 'Mujer') return this.tallasMujer;
    if (gen === 'Unisex') return this.tallasUnisex;
    return this.tallasCaballero;
  });

  // Filtro de categorías para la tabla
  readonly filtroCategoria = signal<string>('');

  // Agrupa los productos por modelo (nombre+marca+genero+categoria) para mostrar UNA fila por modelo en la tabla
  readonly productosAgrupados = computed(() => {
    let todos = this.productos();
    
    const cat = this.filtroCategoria();
    if (cat) {
      todos = todos.filter(p => p.categoria === cat);
    }
    const mapa = new Map<string, { representante: Zapato; variantes: Zapato[]; stockTotal: number }>();
    for (const p of todos) {
      const clave = `${p.nombre.trim().toLowerCase()}|${p.marca.trim().toLowerCase()}|${(p.genero||'Caballero')}|${p.categoria}`;
      if (!mapa.has(clave)) {
        mapa.set(clave, { representante: p, variantes: [], stockTotal: 0 });
      }
      const grupo = mapa.get(clave)!;
      grupo.variantes.push(p);
      grupo.stockTotal += this.calcularTotalStock(p);
    }
    return Array.from(mapa.values());
  });

  readonly categorias = ['Deportivo', 'Urbano', 'Jordan', 'Correr'];
  readonly generos = ['Caballero', 'Mujer', 'Unisex'];
  readonly tallasDisponibles = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44'];

  readonly etiquetasImagenes = [
    'Vista lateral izquierda (Principal)', 'Vista de la suela',
    'Vista lateral derecha', 'Vista superior',
    'Vista en perspectiva (3/4 frontal)', 'Vista trasera',
    'Detalle frontal', 'Detalle lateral y talón'
  ];

  readonly productoForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    marca: ['', [Validators.required, Validators.minLength(2)]],
    genero: ['Caballero', [Validators.required]],
    categoria: ['Deportivo', [Validators.required]],
    precio: [0, [Validators.required, Validators.min(1)]],
    descripcion: ['', [Validators.required, Validators.minLength(8)]],
    descripcionGeneral: ['', [Validators.required, Validators.minLength(8)]],
    variantes: this.fb.array([ this.crearVariante() ])
  });

  get variantes(): import('@angular/forms').FormArray {
    return this.productoForm.get('variantes') as import('@angular/forms').FormArray;
  }

  crearVariante() {
    return this.fb.group({
      id: [null as number | null],
      color: ['', [Validators.required]],
      imagenes: this.fb.array(Array(8).fill('')), // 8 imágenes vacías
      tallasStock: this.fb.group({
        '35': [0, [Validators.min(0)]], '36': [0, [Validators.min(0)]], '37': [0, [Validators.min(0)]],
        '38': [0, [Validators.min(0)]], '39': [0, [Validators.min(0)]], '40': [0, [Validators.min(0)]],
        '41': [0, [Validators.min(0)]], '42': [0, [Validators.min(0)]], '43': [0, [Validators.min(0)]],
        '44': [0, [Validators.min(0)]]
      })
    });
  }

  agregarVariante(): void {
    this.variantes.push(this.crearVariante());
  }

  quitarVariante(index: number): void {
    if (this.variantes.length > 1) {
      const id = this.variantes.at(index).get('id')?.value;
      if (id) {
        if (confirm('¿Seguro que deseas eliminar definitivamente este color?')) {
          this.cargando.set(true);
          this.productosApi.eliminar(id).subscribe({
            next: () => {
              this.mensaje.set('Variante eliminada correctamente.');
              this.variantes.removeAt(index);
              this.cargarProductos();
            },
            error: () => {
              this.mensajeError.set('No se pudo eliminar la variante.');
              this.cargando.set(false);
            }
          });
        }
      } else {
        this.variantes.removeAt(index);
      }
    }
  }

  getImagenesControls(varianteIndex: number): import('@angular/forms').FormArray {
    return this.variantes.at(varianteIndex).get('imagenes') as import('@angular/forms').FormArray;
  }

  ngOnInit(): void {
    this.cargarProductos();
    this.productoForm.get('genero')?.valueChanges.subscribe(val => {
      this.generoSeleccionado.set((val as any) || 'Caballero');
    });
  }

  cargarProductos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');

    this.productosApi.listar().subscribe({
      next: (productos) => this.productos.set(productos),
      error: (error) => this.mensajeError.set('No se pudo cargar el catálogo.'),
      complete: () => this.cargando.set(false)
    });
  }

  alSeleccionarImagen(event: Event, varianteIndex: number, imagenIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const archivo = input.files[0];
      this.cargando.set(true);
      this.productosApi.subirImagen(archivo).subscribe({
        next: (res) => {
          const urlCompleta = res.url.startsWith('http') ? res.url : `${environment.apiUrl}${res.url}`;
          const formArrayImagenes = this.getImagenesControls(varianteIndex);
          formArrayImagenes.at(imagenIndex).setValue(urlCompleta);
          this.cargando.set(false);
          this.mensaje.set(`Imagen ${imagenIndex + 1} subida correctamente.`);
        },
        error: () => {
          this.mensajeError.set('Error al subir la imagen.');
          this.cargando.set(false);
        }
      });
    }
  }

  guardarProducto(): void {
    if (this.productoForm.invalid) {
      this.productoForm.markAllAsTouched();
      
      const errores: string[] = [];
      
      const checkGroup = (group: any, prefix = '') => {
        for (const key in group.controls) {
          const control = group.controls[key];
          if (control.invalid) {
            errores.push(`${prefix}${key} (Error: ${JSON.stringify(control.errors)})`);
          }
          if (control.controls) { // es un FormGroup o FormArray
            if (Array.isArray(control.controls)) {
              control.controls.forEach((c: any, i: number) => checkGroup({controls: {'': c}}, `${prefix}${key}[${i}].`));
            } else {
              checkGroup(control, `${prefix}${key}.`);
            }
          }
        }
      };
      
      checkGroup(this.productoForm);
      const errorStr = `Faltan datos en: ${errores.join(', ')}`;
      console.log('FORMULARIO INVÁLIDO:', errorStr);
      this.mensajeError.set(errorStr);
      return;
    }

    const formValues = this.productoForm.getRawValue() as any;
    const baseInfo = {
      nombre: formValues.nombre,
      marca: formValues.marca,
      genero: formValues.genero,
      categoria: formValues.categoria,
      precio: Number(formValues.precio),
      descripcion: formValues.descripcion,
      descripcionGeneral: formValues.descripcionGeneral
    };
    
    this.guardando.set(true);
    this.mensaje.set('');
    this.mensajeError.set('');

    const editando = this.productoEditando();

    const requests = formValues.variantes.map((variante: any) => {
      const prodData = {
        ...baseInfo,
        id: variante.id,
        color: variante.color,
        imagen: variante.imagenes.join(','),
        tallasStock: variante.tallasStock
      };
      if (variante.id) {
        return this.productosApi.actualizar(variante.id, prodData).toPromise();
      } else {
        return this.productosApi.crear(prodData).toPromise();
      }
    });

    Promise.all(requests)
      .then(() => {
        this.mensaje.set(editando ? 'Producto y sus variantes actualizados correctamente.' : 'Zapatos (Variantes) creados correctamente.');
        this.cancelarEdicion();
        this.cargarProductos();
      })
      .catch(err => this.handleError(err))
      .finally(() => this.guardando.set(false));
  }

  handleError = (error: any) => {
    let msg = 'No se pudo guardar el producto.';
    if (error && error.error) {
       if (typeof error.error === 'string') msg = error.error;
       else if (error.error.message) msg = error.error.message;
       else if (error.error.error) msg = error.error.error;
       else if (Array.isArray(error.error.errors)) msg = error.error.errors.map((e: any) => e.defaultMessage || e.msg).join(', ');
    }
    this.mensajeError.set(msg);
    this.guardando.set(false);
  };

  editarProducto(grupo: any): void {
    const representante = grupo.representante as Zapato;
    const variantes = grupo.variantes as Zapato[];
    
    this.generoSeleccionado.set((representante.genero as any) || 'Caballero');
    this.productoEditando.set(true);

    this.variantes.clear();

    for (const producto of variantes) {
      const varGroup = this.crearVariante();
      this.variantes.push(varGroup);

      varGroup.get('id')?.setValue(producto.id || null);
      varGroup.get('color')?.setValue(producto.color || '');

      const imagenesFA = varGroup.get('imagenes') as import('@angular/forms').FormArray;
      const imgArray = (producto.imagen || '').split(',');
      for (let i = 0; i < 8; i++) {
        imagenesFA.at(i)?.setValue(imgArray[i]?.trim() || '');
      }

      const tallasStockFG = varGroup.get('tallasStock') as import('@angular/forms').FormGroup;
      for (const talla of this.tallasDisponibles) {
        const val = producto.tallasStock?.[talla] ?? 0;
        tallasStockFG.get(talla)?.setValue(Number(val));
      }
    }

    this.productoForm.patchValue({
      nombre: representante.nombre,
      marca: representante.marca,
      genero: representante.genero || 'Caballero',
      categoria: representante.categoria,
      precio: representante.precio,
      descripcion: representante.descripcion || '',
      descripcionGeneral: representante.descripcionGeneral || ''
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminarProducto(grupo: any): void {
    const variantes = grupo.variantes as Zapato[];
    if (!confirm(`¿Estás seguro de que deseas eliminar TODOS los colores (${variantes.length}) de este modelo?`)) return;

    this.cargando.set(true);
    const requests = variantes.map(v => this.productosApi.eliminar(v.id!).toPromise());

    Promise.all(requests).then(() => {
        this.mensaje.set('Producto y todas sus variantes eliminadas correctamente.');
        this.cargarProductos();
    }).catch(() => {
        this.mensajeError.set('No se pudo eliminar completamente el producto.');
        this.cargando.set(false);
    });
  }

  cancelarEdicion(): void {
    this.generoSeleccionado.set('Caballero');
    this.productoEditando.set(false);
    this.productoForm.reset({
      nombre: '',
      marca: '',
      genero: 'Caballero',
      categoria: 'Deportivo',
      precio: 0,
      descripcion: '',
      descripcionGeneral: ''
    });
    this.variantes.clear();
    this.variantes.push(this.crearVariante());
    this.imagenPreview.set('');
  }

  calcularTotalStock(producto: Zapato): number {
    if (!producto.tallasStock) return 0;
    return Object.values(producto.tallasStock).reduce((acc, curr) => acc + (curr || 0), 0);
  }

  calcularStockTotalTodasVariantes(): number {
    return this.variantesDelModelo().reduce((sum, v) => sum + this.calcularTotalStock(v), 0);
  }

  verStockDetalle(producto: Zapato): void {
    this.productoVerStock.set(producto);
    // Agrupar variantes del mismo modelo: mismo nombre + marca + genero + categoria
    const todasVariantes = this.productos().filter(p =>
      p.nombre.trim().toLowerCase() === producto.nombre.trim().toLowerCase() &&
      p.marca.trim().toLowerCase() === producto.marca.trim().toLowerCase() &&
      (p.genero || 'Caballero') === (producto.genero || 'Caballero') &&
      p.categoria === producto.categoria
    );
    this.variantesDelModelo.set(todasVariantes);
  }

  cerrarModalStock(): void {
    this.productoVerStock.set(null);
  }

  getTallasPorGenero(genero?: string): string[] {
    if (genero === 'Mujer') return this.tallasMujer;
    if (genero === 'Unisex') return this.tallasUnisex;
    return this.tallasCaballero;
  }

  getTallasBajoStock(producto: Zapato): string[] {
    if (!producto.tallasStock) return [];
    const tallas = this.getTallasPorGenero(producto.genero);
    return tallas.filter(t => {
      const stock = producto.tallasStock![t];
      return stock !== undefined && stock <= 10;
    });
  }

  getPrimeraImagen(imagenStr?: string): string {
    if (!imagenStr) return 'assets/no-image.png';
    return imagenStr.split(',')[0];
  }
}
