import { Component } from '@angular/core';
import { DecimalPipe } from '@angular/common';

interface ItemCarrito {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  talla: string;
  color: string;
  imagen: string;
}

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './carrito.html',
  styleUrl: './carrito.scss'

  })
export class Carrito {
  items: ItemCarrito[] = [
    { id: 1, nombre: 'Air Max Running Pro', precio: 380.00, cantidad: 2, talla: '42', color: 'Rojo', imagen: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80' },
    { id: 2, nombre: 'Classic Urban Sneaker', precio: 290.00, cantidad: 1, talla: '40', color: 'Negro', imagen: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=100&q=80' }
  ];

  get totalGeneral(): number {
    return this.items.reduce((acumulado, item) => acumulado + (item.precio * item.cantidad), 0);
  }
}