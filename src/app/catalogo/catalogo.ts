import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarritoService } from '../services/carrito.service';
import { DescuentoPricePipe } from '../pipes/descuento.pipe'; 

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule, DescuentoPricePipe], 
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss'
})
export class CatalogoComponent {
  
  // 1. Inyectamos el servicio de comunicación
  private carritoSvc = inject(CarritoService);

  // 2. Lista temporal de productos para ver el diseño y los Pipes
  productos = [
    { id: 1, nombre: 'Zapatillas Urban X', marca: 'Nike', precio: 250.50, stock: 10 },
    { id: 2, nombre: 'Botas de Montaña', marca: 'Timberland', precio: 420.00, stock: 5 },
    { id: 3, nombre: 'Mocasines Clásicos', marca: 'Zara', precio: 180.99, stock: 0 }
  ];

  // 3. Método que se comunica con el servicio al hacer clic
  agregarAlCarrito(producto: any) {
    this.carritoSvc.agregarItem(producto);
    console.log('Agregado al carrito:', producto.nombre);
  }

} // <-- ¡Esta es la ÚNICA llave que cierra la clase al final!