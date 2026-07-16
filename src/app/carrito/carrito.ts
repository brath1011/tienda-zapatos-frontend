import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoItem } from '../models/api.models';
import { CarritoService } from '../services/carrito.service';
import { PedidoService } from '../services/pedido.service';
import { AuthService } from '../services/auth.service';
import { DireccionService } from '../services/direccion.service';
import { InfoModalService } from '../services/info-modal.service';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UBIGEO_DATA } from '../utils/ubigeo.data';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss'
})
export class CarritoComponent implements OnInit {
  readonly carritoSvc = inject(CarritoService);
  private readonly pedidosApi = inject(PedidoService);
  readonly authSvc = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  readonly infoModal = inject(InfoModalService);

  readonly procesando = signal(false);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');
  readonly costoEnvio = signal<number>(0);
  
  // 1 = Carro de compra, 2 = Detalles de pago, 3 = Orden completada
  readonly pasoActual = signal<number>(1);
  readonly reservaId = signal<number | null>(null);

  readonly pagoForm = this.fb.nonNullable.group({
    departamento: ['', Validators.required],
    provincia: [{ value: '', disabled: true }, Validators.required],
    distrito: [{ value: '', disabled: true }, Validators.required],
    calleJiron: ['', Validators.required],
    numero: ['', Validators.required],
    dptoInterior: [''],
    metodoPago: ['TARJETA', Validators.required],
    numeroTarjeta: ['', [Validators.required, Validators.pattern(/^(\d{4}\s?){3}\d{4}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3}$/)]],
    terminos: [false, Validators.requiredTrue]
  });

  departamentos = Object.keys(UBIGEO_DATA);
  provincias: string[] = [];
  distritos: string[] = [];

  // Lógica de Direcciones Guardadas
  misDirecciones = signal<any[]>([]);
  direccionOriginalId = signal<number | null>(null);
  direccionOriginalString = signal<string>('');
  readonly direccionApi = inject(DireccionService);

  ngOnInit(): void {
    this.carritoSvc.cargar().subscribe();

    this.pagoForm.controls.departamento.valueChanges.subscribe(dep => {
      this.pagoForm.controls.provincia.setValue('');
      this.pagoForm.controls.distrito.setValue('');
      this.pagoForm.controls.distrito.disable();
      
      if (dep && UBIGEO_DATA[dep]) {
        this.provincias = Object.keys(UBIGEO_DATA[dep]);
        this.pagoForm.controls.provincia.enable();
        
        // Calcular costo de envío dinámicamente
        let costo = 0;
        const d = dep.toUpperCase();
        if (d.includes('LIMA') || d.includes('CALLAO')) {
            costo = 0;
        } else if (d.includes('ICA') || d.includes('ANCASH') || d.includes('LIBERTAD') || d.includes('LAMBAYEQUE') || d.includes('JUNIN')) {
            costo = 15;
        } else if (d.includes('LORETO')) {
            costo = 35;
        } else {
            costo = 28;
        }
        this.costoEnvio.set(costo);

      } else {
        this.provincias = [];
        this.pagoForm.controls.provincia.disable();
        this.costoEnvio.set(0);
      }
    });

    this.pagoForm.controls.provincia.valueChanges.subscribe(prov => {
      this.pagoForm.controls.distrito.setValue('');
      
      const dep = this.pagoForm.controls.departamento.value;
      if (dep && prov && UBIGEO_DATA[dep] && UBIGEO_DATA[dep][prov]) {
        this.distritos = UBIGEO_DATA[dep][prov];
        this.pagoForm.controls.distrito.enable();
      } else {
        this.distritos = [];
        this.pagoForm.controls.distrito.disable();
      }
    });

    if (!this.authSvc.esAdmin() && !this.authSvc.esVentas() && !this.authSvc.esRepartidor()) {
      this.direccionApi.obtenerMisDirecciones().subscribe({
        next: (dirs) => {
          this.misDirecciones.set(dirs);
          if (dirs.length > 0) {
            const dir = dirs[0];
            this.direccionOriginalId.set(dir.idDireccion ?? null);
            
            // Intentar desarmar el string para pre-llenar el formulario
            let dep = '', prov = '', dist = '', calle = '', num = '', dpto = '';
            try {
              const parts = dir.direccionExacta.split(' - ');
              const ubigeoParts = parts[0].split(', ');
              dep = ubigeoParts[0] || '';
              prov = ubigeoParts[1] || '';
              dist = ubigeoParts[2] || '';

              if (parts.length > 1) {
                const calleParts = parts[1].split(' #');
                calle = calleParts[0] || '';
                if (calleParts.length > 1) {
                  const numParts = calleParts[1].split(' Dpto ');
                  num = numParts[0] || '';
                  dpto = numParts[1] || '';
                }
              }
            } catch (e) {
              console.error('Error parseando direccion', e);
            }

            // Aplicar valores (esto disparará los valueChanges y cargará provincias y distritos automáticamente)
            this.pagoForm.patchValue({
              departamento: dep
            });
            
            setTimeout(() => {
              this.pagoForm.patchValue({ provincia: prov });
              setTimeout(() => {
                this.pagoForm.patchValue({
                  distrito: dist,
                  calleJiron: calle,
                  numero: num,
                  dptoInterior: dpto
                });
                
                // Guardar cómo quedó el formulario pre-llenado para comparar después
                const formVals = this.pagoForm.getRawValue();
                const dptoStr = formVals.dptoInterior ? ` Dpto ${formVals.dptoInterior}` : '';
                this.direccionOriginalString.set(`${formVals.departamento}, ${formVals.provincia}, ${formVals.distrito} - ${formVals.calleJiron} #${formVals.numero}${dptoStr}`);
              }, 50);
            }, 50);
          }
        }
      });
    }

    this.pagoForm.controls.numeroTarjeta.valueChanges.subscribe(val => {
      if (val) {
        const num = val.replace(/\D/g, '');
        const numLimitado = num.substring(0, 16);
        const formateado = numLimitado.match(/.{1,4}/g)?.join(' ') || '';
        
        if (formateado !== val) {
          this.pagoForm.controls.numeroTarjeta.setValue(formateado, { emitEvent: false });
        }
      }
    });
  }

  eliminar(item: CarritoItem): void {
    const producto = this.carritoSvc.getProducto(item);
    const idProducto = producto.id;

    if (!idProducto) {
      this.mensajeError.set('No se pudo identificar el producto a eliminar.');
      return;
    }

    this.carritoSvc.eliminarProducto(idProducto, item.tallaSeleccionada).subscribe({
      next: () => this.mensaje.set('Producto eliminado del carrito.')
    });
  }

  siguientePaso(): void {
    const pForm = this.pagoForm.controls;
    
    if (
      pForm.departamento.invalid || pForm.provincia.invalid || pForm.distrito.invalid || 
      pForm.calleJiron.invalid || pForm.numero.invalid
    ) {
      this.mensajeError.set('Por favor completa todos los campos obligatorios de la dirección.');
      this.pagoForm.markAllAsTouched();
      return;
    }
    
    if (this.carritoSvc.items().length === 0) {
      this.mensajeError.set('El carrito está vacío.');
      return;
    }
    
    this.mensajeError.set('');
    
    const detallesReserva = this.carritoSvc.items()
      .map((item) => {
        const producto = this.carritoSvc.getProducto(item);
        const idProducto = producto.id;
        return idProducto ? { zapatoId: idProducto, talla: item.tallaSeleccionada, cantidad: item.cantidad ?? 1 } : null;
      })
      .filter((detalle): detalle is { zapatoId: number; talla: string, cantidad: number } => detalle !== null);

    this.procesando.set(true);
    this.pedidosApi.reservar({ detalles: detallesReserva }).subscribe({
      next: (res) => {
        this.reservaId.set(res.reservaId);
        this.pasoActual.set(2);
      },
      error: (error) => {
        this.mensajeError.set(this.obtenerMensajeError(error, 'Error al reservar el stock. Es posible que alguien más haya comprado la última unidad.'));
      },
      complete: () => this.procesando.set(false)
    });
  }

  volverPaso(): void {
    if (this.reservaId()) {
      this.procesando.set(true);
      this.pedidosApi.cancelarReserva(this.reservaId()!).subscribe({
        next: () => {
          this.reservaId.set(null);
          this.pasoActual.set(1);
          this.mensajeError.set('');
        },
        error: () => {
          this.pasoActual.set(1);
        },
        complete: () => this.procesando.set(false)
      });
    } else {
      this.pasoActual.set(1);
      this.mensajeError.set('');
    }
  }

  comprar(): void {
    const pForm = this.pagoForm.controls;
    if (pForm.numeroTarjeta.invalid || pForm.cvv.invalid || pForm.terminos.invalid) {
      this.pagoForm.markAllAsTouched();
      this.mensajeError.set('Por favor completa los datos de pago y acepta los términos y condiciones.');
      return;
    }

    const detalles = this.carritoSvc.items()
      .map((item) => {
        const producto = this.carritoSvc.getProducto(item);
        const idProducto = producto.id;
        return idProducto ? { producto: { id: idProducto }, cantidad: item.cantidad ?? 1, tallaSeleccionada: item.tallaSeleccionada } : null;
      })
      .filter((detalle): detalle is { producto: { id: number }; cantidad: number, tallaSeleccionada: string } => detalle !== null);

    this.procesando.set(true);
    this.mensaje.set('');
    this.mensajeError.set('');

    const formValues = this.pagoForm.getRawValue();
    const dptoStr = formValues.dptoInterior ? ` Dpto ${formValues.dptoInterior}` : '';
    const formString = `${formValues.departamento}, ${formValues.provincia}, ${formValues.distrito} - ${formValues.calleJiron} #${formValues.numero}${dptoStr}`;

    const pedidoPayload: any = { detalles };
    let enviandoNuevaDir = true;

    // Si el texto final es idéntico a la dirección guardada original, reusamos el ID
    if (this.direccionOriginalId() && this.direccionOriginalString() === formString) {
      pedidoPayload.direccion = { idDireccion: this.direccionOriginalId() };
      enviandoNuevaDir = false;
    }

    this.pedidosApi.comprar({
      pedido: pedidoPayload,
      metodoPago: formValues.metodoPago,
      numeroTarjeta: formValues.numeroTarjeta,
      cvv: formValues.cvv,
      reservaId: this.reservaId() ?? undefined,
      departamento: enviandoNuevaDir ? formValues.departamento : undefined,
      provincia: enviandoNuevaDir ? formValues.provincia : undefined,
      distrito: enviandoNuevaDir ? formValues.distrito : undefined,
      calleJiron: enviandoNuevaDir ? formValues.calleJiron : undefined,
      numero: enviandoNuevaDir ? formValues.numero : undefined,
      dptoInterior: enviandoNuevaDir ? formValues.dptoInterior : undefined
    }).subscribe({
      next: () => {
        this.pasoActual.set(3);
        this.carritoSvc.vaciar().subscribe();
      },
      error: (error) => {
        console.error('COMPRA FALLIDA:', error);
        this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo registrar la compra.'));
      },
      complete: () => this.procesando.set(false)
    });
  }

  private obtenerMensajeError(err: any, fallback: string): string {
    if (err && err.error) {
      if (typeof err.error === 'string') return err.error;
      if (typeof err.error.error === 'string') return err.error.error;
    }
    return fallback;
  }
}
