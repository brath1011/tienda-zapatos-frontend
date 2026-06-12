import { Component } from '@angular/core';
import { NgClass, NgStyle, DecimalPipe } from '@angular/common';

interface Zapato {
  id: number;
  nombre: string;
  marca: string;
  precio: number;
  stock: number;
  categoria: string;
  imagenUrl: string;
}

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [NgClass, NgStyle, DecimalPipe],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.scss'
})
export class Catalogo {
  titulo = 'Nuestro Catálogo de Zapatos';

  zapatos: Zapato[] = [
    { 
      id: 1, 
      nombre: 'Air Max Running Pro', 
      marca: 'Nike', 
      precio: 380.00, 
      stock: 12, 
      categoria: 'Deportivo', 
      imagenUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80' 
    },
    { 
      id: 2, 
      nombre: 'Classic Urban Sneaker', 
      marca: 'Adidas', 
      precio: 290.00, 
      stock: 5, 
      categoria: 'Urbano', 
      imagenUrl: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=500&q=80' 
    },
    { 
      id: 3, 
      nombre: 'Mocasín Oxford Formal Elegante', 
      marca: 'Gucci', 
      precio: 850.00, 
      stock: 0, 
      categoria: 'Formal', 
      imagenUrl: 'https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?w=500&q=80' 
    },
    { 
      id: 4, 
      nombre: 'Sport Casual Ultra', 
      marca: 'Puma', 
      precio: 260.00, 
      stock: 8, 
      categoria: 'Deportivo', 
      imagenUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500&q=80' 
    }
  ];
  agregarAlCarrito(zapato: Zapato) {
  alert(`¡Agregaste al carrito: ${zapato.marca} ${zapato.nombre}!`);
  // Aquí es donde en el próximo laboratorio conectarás el servicio HTTP para enviarlo a Spring Boot
}
}