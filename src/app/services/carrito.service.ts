import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CarritoService {
  // Signal que guarda una lista de zapatos (objetos completos)
  items = signal<any[]>([]);

  // Computed: Calcula automáticamente la cantidad y el total sin hacer funciones extra
  cantidadGlobal = computed(() => this.items().length);
  totalGlobal = computed(() => this.items().reduce((suma, item) => suma + item.precio, 0));

  agregarItem(producto: any) {
    // Agrega el zapato nuevo a la lista que ya existía
    this.items.update(zapatosActuales => [...zapatosActuales, producto]);
  }

  eliminarItem(index: number) {
    // Elimina un zapato específico de la lista
    this.items.update(zapatosActuales => zapatosActuales.filter((_, i) => i !== index));
  }
}