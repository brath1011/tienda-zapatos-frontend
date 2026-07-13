import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DireccionService } from '../services/direccion.service';
import { PerfilService } from '../services/perfil.service';
import { AuthService } from '../services/auth.service';
import { Direccion } from '../models/api.models';
import { MisComprasComponent } from '../mis-compras/mis-compras.component';
import { UBIGEO_DATA } from '../utils/ubigeo.data';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MisComprasComponent],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss'
})
export class PerfilComponent implements OnInit {
  private readonly perfilApi = inject(PerfilService);
  private readonly direccionApi = inject(DireccionService);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly direcciones = signal<Direccion[]>([]);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');
  readonly mostrarPasswordActual = signal(false);
  readonly mostrarNuevaPassword = signal(false);
  readonly contactoAdmin = signal<any>(null);
  readonly ventas = signal<any[]>([]);
  
  readonly pestanaActiva = signal<'DATOS' | 'COMPRAS'>('DATOS');

  togglePasswordActual(): void {
    this.mostrarPasswordActual.update(v => !v);
  }

  toggleNuevaPassword(): void {
    this.mostrarNuevaPassword.update(v => !v);
  }

  readonly perfilForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipoDocumento: [''],
    numeroDocumento: [''],
    telefono: [''],
    emailContacto: [''],
    telefonoSecundario: ['']
  });

  readonly passwordForm = this.fb.nonNullable.group({
    passwordActual: ['', Validators.required],
    nuevaPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  readonly direccionForm = this.fb.nonNullable.group({
    departamento: ['', Validators.required],
    provincia: [{ value: '', disabled: true }, Validators.required],
    distrito: [{ value: '', disabled: true }, Validators.required],
    calleJiron: ['', Validators.required],
    numero: ['', Validators.required],
    dptoInterior: ['']
  });

  departamentos = Object.keys(UBIGEO_DATA);
  provincias: string[] = [];
  distritos: string[] = [];

  ngOnInit(): void {
    this.cargarPerfil();
    if (!this.authService.esAdmin() && !this.authService.esVentas() && !this.authService.esRepartidor()) {
      this.cargarDirecciones();
    }
    if (this.authService.esVentas()) {
      this.cargarContactoAdmin();
    }
    if (this.authService.esRepartidor()) {
      this.cargarVentas();
    }

    // Ubigeo listeners
    this.direccionForm.controls.departamento.valueChanges.subscribe(dep => {
      this.direccionForm.controls.provincia.setValue('');
      this.direccionForm.controls.distrito.setValue('');
      this.direccionForm.controls.distrito.disable();
      
      if (dep && UBIGEO_DATA[dep]) {
        this.provincias = Object.keys(UBIGEO_DATA[dep]);
        this.direccionForm.controls.provincia.enable();
      } else {
        this.provincias = [];
        this.direccionForm.controls.provincia.disable();
      }
    });

    this.direccionForm.controls.provincia.valueChanges.subscribe(prov => {
      this.direccionForm.controls.distrito.setValue('');
      
      const dep = this.direccionForm.controls.departamento.value;
      if (dep && prov && UBIGEO_DATA[dep] && UBIGEO_DATA[dep][prov]) {
        this.distritos = UBIGEO_DATA[dep][prov];
        this.direccionForm.controls.distrito.enable();
      } else {
        this.distritos = [];
        this.direccionForm.controls.distrito.disable();
      }
    });
  }

  cargarContactoAdmin(): void {
    this.perfilApi.obtenerContactoAdmin().subscribe({
      next: (contacto) => this.contactoAdmin.set(contacto),
      error: () => console.error('Error al cargar contacto del administrador')
    });
  }

  cargarVentas(): void {
    this.perfilApi.obtenerVentas().subscribe({
      next: (data) => this.ventas.set(data),
      error: () => console.error('Error al cargar lista de ventas')
    });
  }

  cargarPerfil(): void {
    this.perfilApi.obtenerPerfil().subscribe({
      next: (perfil) => {
        this.perfilForm.patchValue({
          nombre: perfil.nombre || '',
          tipoDocumento: perfil.tipoDocumento || '',
          numeroDocumento: perfil.numeroDocumento || '',
          telefono: perfil.telefono || '',
          emailContacto: perfil.emailContacto || '',
          telefonoSecundario: perfil.telefonoSecundario || ''
        });
      },
      error: () => this.mensajeError.set('Error al cargar tu perfil.')
    });
  }

  cargarDirecciones(): void {
    this.direccionApi.obtenerMisDirecciones().subscribe({
      next: (dirs) => this.direcciones.set(dirs),
      error: () => this.mensajeError.set('Error al cargar direcciones.')
    });
  }

  actualizarPerfil(): void {
    if (this.perfilForm.invalid) return;
    this.mensaje.set('');
    this.mensajeError.set('');
    this.perfilApi.actualizarPerfil(this.perfilForm.getRawValue()).subscribe({
      next: () => this.mensaje.set('Perfil actualizado exitosamente.'),
      error: () => this.mensajeError.set('No se pudo actualizar el perfil.')
    });
  }

  cambiarPassword(): void {
    if (this.passwordForm.invalid) return;
    this.mensaje.set('');
    this.mensajeError.set('');
    this.perfilApi.actualizarPassword(this.passwordForm.getRawValue()).subscribe({
      next: () => {
        this.mensaje.set('Contraseña actualizada.');
        this.passwordForm.reset();
      },
      error: (err) => {
        if (err.error && typeof err.error === 'string') {
           try {
             const parsed = JSON.parse(err.error);
             this.mensajeError.set(parsed.error || parsed.message || err.error);
           } catch {
             this.mensajeError.set(err.error);
           }
        } else if (err.error && err.error.error) {
           this.mensajeError.set(err.error.error);
        } else if (err.error && err.error.message) {
           this.mensajeError.set(err.error.message);
        } else {
           this.mensajeError.set('Error al cambiar contraseña. Verifica que tu contraseña actual sea correcta.');
        }
      }
    });
  }

  direccionEditandoId = signal<number | null>(null);

  agregarDireccion(): void {
    if (this.direccionForm.invalid) {
      this.direccionForm.markAllAsTouched();
      return;
    }
    
    this.mensaje.set('');
    this.mensajeError.set('');
    
    const formValues = this.direccionForm.getRawValue();
    const dpto = formValues.dptoInterior ? ` Dpto ${formValues.dptoInterior}` : '';
    const direccionExactaStr = `${formValues.departamento}, ${formValues.provincia}, ${formValues.distrito} - ${formValues.calleJiron} #${formValues.numero}${dpto}`;

    const payload = {
      direccionExacta: direccionExactaStr,
      distrito: formValues.distrito,
      referencia: formValues.calleJiron + ' ' + formValues.numero + dpto // Guardamos esto crudo para luego poder editarlo si lo necesitamos, aunque mejor parsear
    };

    const id = this.direccionEditandoId();
    if (id) {
      // Actualizar
      this.direccionApi.actualizarDireccion(id, payload).subscribe({
        next: (dirActualizada) => {
          this.direcciones.update(dirs => dirs.map(d => d.idDireccion === id ? dirActualizada : d));
          this.cancelarEdicionDireccion();
          this.mensaje.set('Dirección actualizada.');
        },
        error: () => this.mensajeError.set('Error al actualizar dirección.')
      });
    } else {
      // Agregar nuevo
      this.direccionApi.agregarDireccion(payload).subscribe({
        next: (dir) => {
          this.direcciones.update(dirs => [...dirs, dir]);
          this.direccionForm.reset();
          this.mensaje.set('Dirección agregada.');
        },
        error: () => this.mensajeError.set('Error al agregar dirección.')
      });
    }
  }

  editarDireccion(dir: Direccion): void {
    this.direccionEditandoId.set(dir.idDireccion ?? null);
    
    // Intentar desarmar el string "LIMA, Lima, Ate - Av. Sol #123 Dpto 2"
    // Es un poco frágil, pero funciona para el demo
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

    this.direccionForm.patchValue({
      departamento: dep,
      provincia: prov,
      distrito: dist,
      calleJiron: calle,
      numero: num,
      dptoInterior: dpto
    });
  }

  cancelarEdicionDireccion(): void {
    this.direccionEditandoId.set(null);
    this.direccionForm.reset();
  }

  eliminarDireccion(id?: number): void {
    if (!id) return;
    this.direccionApi.eliminarDireccion(id).subscribe({
      next: () => {
        this.direcciones.update(dirs => dirs.filter(d => d.idDireccion !== id));
        this.mensaje.set('Dirección eliminada.');
      },
      error: () => this.mensajeError.set('Error al eliminar dirección.')
    });
  }
}
