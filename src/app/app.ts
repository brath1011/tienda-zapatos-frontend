import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from './navbar/navbar';
import { Inicio } from './inicio/inicio';
import { Catalogo } from './catalogo/catalogo';
import { Carrito } from './carrito/carrito';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, Navbar, Inicio, Catalogo, Carrito],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'tienda-zapatos-front';
  
  // Forzamos a que inicie mostrando el banner promocional
  seccionActiva: string = 'inicio';

  cambiarVista(nuevaSeccion: string) {
    this.seccionActiva = nuevaSeccion;
  }
}