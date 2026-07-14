import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CampanaService, Campana } from '../services/campana.service';
import { ProductoService } from '../services/producto.service';
import { Zapato } from '../models/api.models';

@Component({
  selector: 'app-admin-descuentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-descuentos.html',
  styleUrl: './admin-descuentos.scss'
})
export class AdminDescuentosComponent implements OnInit {
  private readonly campanaService = inject(CampanaService);
  private readonly productoService = inject(ProductoService);

  campanasActivas = signal<Campana[]>([]);
  productos = signal<Zapato[]>([]);
  
  cargando = signal(false);
  mensaje = signal('');
  mensajeError = signal('');

  // Formulario de nueva campaña
  modeloSeleccionado = signal<string>('');
  porcentajeDescuento = signal<number>(10);
  sinReembolso = signal<boolean>(true);
  coloresSeleccionados = signal<Set<string>>(new Set());

  // Derivados
  modelosUnicos = computed(() => {
    return [...new Set(this.productos().map(p => p.nombre))].sort();
  });

  coloresDelModelo = computed(() => {
    const modelo = this.modeloSeleccionado();
    if (!modelo) return [];
    const prodsDeModelo = this.productos().filter(p => p.nombre === modelo);
    // Devolver objetos con color e imagen para mostrar en la UI
    const mapaColores = new Map<string, string>();
    prodsDeModelo.forEach(p => {
       if (p.color && !mapaColores.has(p.color)) {
         mapaColores.set(p.color, p.imagen.split(',')[0]);
       }
    });
    return Array.from(mapaColores.entries()).map(([color, imagen]) => ({ color, imagen }));
  });

  productosEnDescuentoTotal = computed(() => {
    // Calculo aproximado de cuántos productos se ven afectados
    let total = 0;
    const campanas = this.campanasActivas();
    const prods = this.productos();

    for (const p of prods) {
       for (const c of campanas) {
         let aplica = true;
         if (c.filtroModelo && c.filtroModelo !== p.nombre) aplica = false;
         if (c.filtroColor) {
           const colores = c.filtroColor.split(',');
           if (!colores.some(col => col.trim() === p.color)) aplica = false;
         }
         if (aplica) {
           total++;
           break; // Ya está en descuento
         }
       }
    }
    return total;
  });

  ngOnInit() {
    this.cargarDatos();
  }

  cargarDatos() {
    this.cargando.set(true);
    this.productoService.listar().subscribe({
      next: (prods) => {
        this.productos.set(prods);
        this.cargarCampanas();
      },
      error: () => {
        this.mensajeError.set('Error al cargar productos');
        this.cargando.set(false);
      }
    });
  }

  cargarCampanas() {
    this.campanaService.listarCampanas().subscribe({
      next: (campanas) => {
        this.campanasActivas.set(campanas);
        this.cargando.set(false);
      },
      error: () => {
        this.mensajeError.set('Error al cargar descuentos');
        this.cargando.set(false);
      }
    });
  }

  alSeleccionarModelo(modelo: string) {
    this.modeloSeleccionado.set(modelo);
    this.coloresSeleccionados.set(new Set()); // Resetear colores
  }

  toggleColor(color: string) {
    const nuevosColores = new Set(this.coloresSeleccionados());
    if (nuevosColores.has(color)) {
      nuevosColores.delete(color);
    } else {
      nuevosColores.add(color);
    }
    this.coloresSeleccionados.set(nuevosColores);
  }

  aplicarDescuento() {
    if (!this.modeloSeleccionado()) {
      this.mensajeError.set('Debes seleccionar un modelo');
      return;
    }
    if (this.coloresSeleccionados().size === 0) {
      this.mensajeError.set('Debes seleccionar al menos un color');
      return;
    }
    if (this.porcentajeDescuento() <= 0 || this.porcentajeDescuento() > 100) {
      this.mensajeError.set('El porcentaje debe ser entre 1 y 100');
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');

    const nuevaCampana: Campana = {
      nombre: `Descuento Especial: ${this.modeloSeleccionado()}`,
      porcentajeDescuento: this.porcentajeDescuento(),
      filtroModelo: this.modeloSeleccionado(),
      filtroColor: Array.from(this.coloresSeleccionados()).join(','),
      sinReembolso: this.sinReembolso(),
      activa: true
    };

    this.campanaService.crearCampana(nuevaCampana).subscribe({
      next: () => {
        this.mensaje.set('Descuento aplicado correctamente');
        this.modeloSeleccionado.set('');
        this.coloresSeleccionados.set(new Set());
        this.porcentajeDescuento.set(10);
        this.sinReembolso.set(false);
        this.cargarCampanas();
      },
      error: () => {
        this.mensajeError.set('Error al aplicar el descuento');
        this.cargando.set(false);
      }
    });
  }

  quitarDescuento(id: number) {
    if (confirm('¿Estás seguro de quitar este descuento? Los precios volverán a la normalidad.')) {
      this.cargando.set(true);
      this.campanaService.eliminarCampana(id).subscribe({
        next: () => {
          this.mensaje.set('Descuento eliminado');
          this.cargarCampanas();
        },
        error: () => {
          this.mensajeError.set('Error al eliminar el descuento');
          this.cargando.set(false);
        }
      });
    }
  }
}
