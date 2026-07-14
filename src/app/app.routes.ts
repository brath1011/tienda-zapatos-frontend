import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegistroComponent } from './registro/registro';
import { InicioComponent } from './inicio/inicio';
import { CatalogoComponent } from './catalogo/catalogo';
import { ProductoDetalleComponent } from './producto-detalle/producto-detalle';
import { CarritoComponent } from './carrito/carrito';
import { PerfilComponent } from './perfil/perfil';
import { AdminProductosComponent } from './admin-productos/admin-productos';
import { AdminLayoutComponent } from './admin-layout/admin-layout';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';
import { AdminPedidosComponent } from './admin-pedidos/admin-pedidos';
import { AdminUsuariosComponent } from './admin-usuarios/admin-usuarios';
import { MisComprasComponent } from './mis-compras/mis-compras.component';
import { RepartidorPedidosComponent } from './repartidor-pedidos/repartidor-pedidos';
import { PuntoVentaComponent } from './punto-venta/punto-venta';
import { VendedorRepartidoresComponent } from './vendedor-repartidores/vendedor-repartidores';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: 'inicio', component: InicioComponent },
  { path: 'catalogo', component: CatalogoComponent },
  { path: 'producto/:id', component: ProductoDetalleComponent },
  { path: 'carrito', component: CarritoComponent, canActivate: [authGuard] },
  { path: 'mis-compras', component: MisComprasComponent, canActivate: [authGuard] },
  { path: 'perfil', component: PerfilComponent, canActivate: [authGuard] },
  { 
    path: 'admin', 
    component: AdminLayoutComponent, 
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AdminDashboardComponent },
      { path: 'inventario', component: AdminProductosComponent },
      { path: 'pedidos', component: AdminPedidosComponent },
      { path: 'punto-venta', component: PuntoVentaComponent },
      { path: 'usuarios', component: AdminUsuariosComponent },
      { path: 'descuentos', loadComponent: () => import('./admin-descuentos/admin-descuentos').then(m => m.AdminDescuentosComponent) },
      { path: 'repartos', component: RepartidorPedidosComponent },
      { path: 'repartidores', component: VendedorRepartidoresComponent }
    ]
  },
  { path: 'login', component: LoginComponent },
  { path: 'registro', component: RegistroComponent },
  { path: '**', redirectTo: 'inicio' }
];
