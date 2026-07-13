import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RolUsuario } from '../models/api.models';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss'
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly mensaje = signal('');
  readonly mensajeError = signal('');

  readonly registroForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  registrar(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      this.mensajeError.set('Completa los datos requeridos.');
      return;
    }

    this.cargando.set(true);
    this.mensaje.set('');
    this.mensajeError.set('');

    const formValues = this.registroForm.getRawValue();
    const payload = { ...formValues, rol: 'CLIENTE' as const };

    this.auth.register(payload).subscribe({
      next: (respuesta) => {
        this.mensaje.set(respuesta || 'Usuario registrado correctamente.');
        setTimeout(() => this.router.navigate(['/login']), 700);
      },
      error: (error) => {
        this.cargando.set(false);
        this.mensajeError.set(this.obtenerMensajeError(error, 'No se pudo registrar el usuario.'));
      },
      complete: () => this.cargando.set(false)
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
