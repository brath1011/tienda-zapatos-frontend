import { Routes } from '@angular/router';
import { Inicio } from './inicio/inicio';          // <-- Cambiado de InicioComponent a Inicio
import { CatalogoComponent } from './catalogo/catalogo';
import { Carrito } from './carrito/carrito';        // <-- Cambiado de CarritoComponent a Carrito

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: Inicio },            // <-- Nombre corregido
  { path: 'catalogo', component: CatalogoComponent },
  { path: 'carrito', component: Carrito },          // <-- Nombre corregido
  { path: '**', redirectTo: 'inicio' }
];