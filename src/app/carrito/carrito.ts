import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../services/carrito.service';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss'
})
export class CarritoComponent {
  // Inyectamos el servicio para leer los zapatos guardados
  carritoSvc = inject(CarritoService);

  eliminar(index: number) {
    this.carritoSvc.eliminarItem(index);
  }
}