import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class Navbar {
  nombreTienda = 'ZapasStore';
  cantidadItems = 2;

  // Creamos un emisor para avisar el cambio de pestaña
  @Output() cambioSeccion = new EventEmitter<string>();

  navegar(seccion: string, evento: Event) {
    evento.preventDefault(); // Evita que la página se recargue
    this.cambioSeccion.emit(seccion);
  }
}