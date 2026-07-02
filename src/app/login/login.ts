import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);

  // Creamos el formulario con validaciones
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]]
  });

  mensajeError = '';

  enviar(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.mensajeError = 'Por favor, completa los campos correctamente.';
      return;
    }

    this.mensajeError = '';
    const datos = this.loginForm.getRawValue();
    console.log('Datos listos para enviar al Backend:', datos);
    
    // Aquí luego conectaremos el AuthService para llamar a /auth/login
    alert('¡Formulario validado! Revisa la consola.');
  }
}