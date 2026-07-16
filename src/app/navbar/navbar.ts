import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CarritoService } from '../services/carrito.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule, CurrencyPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent {
  readonly carritoSvc = inject(CarritoService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  menuAbierto = signal(false);
  menuMobileAbierto = signal(false);
  carritoAbierto = signal(false);
  buscarTermino = signal('');
  cerrarDropdownForzado = signal(false);

  ocultarDropdownTemporalmene(): void {
    this.cerrarDropdownForzado.set(true);
    setTimeout(() => this.cerrarDropdownForzado.set(false), 500);
  }

  buscar(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.buscarTermino.set(value);
    this.router.navigate(['/catalogo'], { queryParams: { buscar: value || null }, queryParamsHandling: 'merge' });
  }

  toggleMenu(): void {
    this.menuAbierto.update(v => !v);
  }

  toggleMenuMobile(): void {
    this.menuMobileAbierto.update(v => !v);
  }

  toggleCarrito(): void {
    this.carritoAbierto.update(v => !v);
  }

  cerrarCarrito(): void {
    this.carritoAbierto.set(false);
  }

  aumentarCantidad(item: any): void {
    this.carritoSvc.agregarItem(item.producto, 1, item.tallaSeleccionada).subscribe();
  }

  disminuirCantidad(item: any): void {
    if (item.cantidad > 1) {
      this.carritoSvc.agregarItem(item.producto, -1, item.tallaSeleccionada).subscribe();
    } else {
      this.eliminarItem(item);
    }
  }

  eliminarItem(item: any): void {
    if (item.producto.id) {
      this.carritoSvc.eliminarProducto(item.producto.id, item.tallaSeleccionada).subscribe();
    }
  }

  getPrimeraImagen(imagenStr?: string): string {
    if (!imagenStr) return 'assets/no-image.png';
    return imagenStr.split(',')[0];
  }

  cerrarSesion(): void {
    this.auth.logout();
    this.carritoSvc.items.set([]);
    this.router.navigate(['/inicio']);
  }
}
