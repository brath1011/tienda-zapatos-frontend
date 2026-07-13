import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UsuarioService } from '../services/usuario.service';
import { AuthService } from '../services/auth.service';
import { Cliente } from '../models/api.models';

@Component({
  selector: 'app-admin-usuarios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-usuarios.html',
  styleUrl: './admin-usuarios.scss'
})
export class AdminUsuariosComponent implements OnInit {
  private readonly usuarioService = inject(UsuarioService);
  private readonly fb = inject(FormBuilder);
  readonly authService = inject(AuthService);

  readonly usuarios = signal<any[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');
  readonly usuarioSeleccionado = signal<any>(null);

  verDetalles(usuario: any): void {
    this.usuarioSeleccionado.set(usuario);
  }

  cerrarModal(): void {
    this.usuarioSeleccionado.set(null);
  }

  cambiarEstado(usuario: any, nuevoEstado: boolean): void {
    const accion = nuevoEstado ? 'reactivar' : 'suspender';
    if (!confirm(`¿Estás seguro que deseas ${accion} la cuenta de ${usuario.nombre}?`)) {
      return;
    }
    
    this.usuarioService.cambiarEstado(usuario.id, nuevoEstado).subscribe({
      next: (res) => {
        this.mensaje.set(`Usuario ${nuevoEstado ? 'reactivado' : 'suspendido'} exitosamente.`);
        this.cargarUsuarios();
        this.cerrarModal(); // Cerrar la ficha al cambiar el estado
      },
      error: () => this.mensajeError.set(`Error al intentar ${accion} el usuario.`)
    });
  }

  actualizarZona(usuario: any, selectElement: HTMLSelectElement): void {
    const seleccionadas = Array.from(selectElement.selectedOptions).map(o => o.value);
    const zonaStr = seleccionadas.join(', ');
    
    this.usuarioService.actualizarZona(usuario.id, zonaStr).subscribe({
      next: () => {
        this.mensaje.set(`Zonas de ${usuario.nombre} actualizadas a: ${zonaStr}`);
        this.cargarUsuarios();
        this.cerrarModal();
      },
      error: () => this.mensajeError.set('Error al actualizar las zonas')
    });
  }

  readonly usuarioForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rol: ['VENTAS', [Validators.required]],
    zona: [[] as string[]]
  });

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.cargando.set(true);
    this.usuarioService.listarTodos().subscribe({
      next: (data) => {
        this.usuarios.set(data);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false)
    });
  }

  crearUsuario(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    this.mensaje.set('');
    this.mensajeError.set('');

    // Castear al tipo correcto para satisfacer la interfaz, y unir zonas
    const rawVal = this.usuarioForm.getRawValue();
    let zonaStr = null;
    if (rawVal.rol === 'REPARTIDOR' && rawVal.zona && rawVal.zona.length > 0) {
      zonaStr = rawVal.zona.join(', ');
    }

    const req = {
      ...rawVal,
      rol: rawVal.rol as 'VENTAS' | 'REPARTIDOR',
      zona: zonaStr
    };

    this.usuarioService.crearUsuarioAdmin(req).subscribe({
      next: (res) => {
        this.mensaje.set('Usuario creado exitosamente.');
        this.usuarioForm.reset({ rol: 'VENTAS' });
        this.cargarUsuarios();
      },
      error: (err) => {
        let errorMsg = 'Error al crear usuario.';
        if (typeof err.error === 'string') errorMsg = err.error;
        this.mensajeError.set(errorMsg);
        this.guardando.set(false);
      },
      complete: () => this.guardando.set(false)
    });
  }
}
