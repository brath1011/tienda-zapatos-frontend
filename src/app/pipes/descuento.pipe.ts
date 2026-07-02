import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'descuentoPrice', // Así lo llamaremos en el HTML
  standalone: true
})
export class DescuentoPricePipe implements PipeTransform {
  
  // Transforma el precio aplicándole un porcentaje de descuento
  transform(precioOriginal: number, porcentajeDescuento: number = 10): number {
    if (!precioOriginal) return 0;
    const descuento = precioOriginal * (porcentajeDescuento / 100);
    return precioOriginal - descuento;
  }
  
}