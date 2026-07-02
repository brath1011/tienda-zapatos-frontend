import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss' // Puedes usar los mismos estilos de login
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);

  registroForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(5)]],
    rol: ['USER', [Validators.required]] // Por defecto es USER
  });

  registrar(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    
    const datos = this.registroForm.getRawValue();
    console.log('Datos listos para /auth/register:', datos);
    alert('¡Registro validado! Revisa la consola.');
  }
}