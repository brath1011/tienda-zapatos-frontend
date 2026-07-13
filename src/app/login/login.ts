import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CarritoService } from '../services/carrito.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly carrito = inject(CarritoService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly mensajeError = signal('');

  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  enviar(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.mensajeError.set('Completa los campos correctamente.');
      return;
    }

    this.cargando.set(true);
    this.mensajeError.set('');

    this.auth.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.carrito.cargar().subscribe();
        this.router.navigate(['/catalogo']);
      },
      error: (error) => {
        this.cargando.set(false);
        this.mensajeError.set(this.obtenerMensajeError(error, 'Credenciales incorrectas o backend no disponible.'));
      },
      complete: () => this.cargando.set(false)
    });
  }

  private obtenerMensajeError(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error && 'error' in error) {
      const apiError = (error as { error?: unknown }).error;
      if (typeof apiError === 'string') return apiError;
      if (typeof apiError === 'object' && apiError && 'error' in apiError) {
        return (apiError as { error: string }).error;
      }
    }

    return fallback;
  }
}
