import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Zapato {
  id: number;
  nombre: string;
  precio: number;
  imagenNombre: string;
  descripcion: string;
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './catalogo.html',
  styleUrls: ['./catalogo.scss']
})
export class CatalogoComponent {
  // Lista inicial de prueba para obligar a Angular a renderizar datos en pantalla
  zapatos = signal<Zapato[]>([
    { id: 1, nombre: 'Zapatilla Urban Run', precio: 259.90, imagenNombre: 'imagen1', descripcion: 'Máximo confort urbano.' },
    { id: 2, nombre: 'Zapato Oxford Elegante', precio: 319.00, imagenNombre: 'imagen2', descripcion: 'Estilo clásico en cuero.' },
    { id: 3, nombre: 'Botín Adventure', precio: 379.50, imagenNombre: 'imagen3', descripcion: 'Resistencia para todo terreno.' }
  ]);

  agregarAlCarrito(zapato: Zapato) {
    console.log('Producto seleccionado:', zapato.nombre);
  }
}