import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; // <-- Herramienta vital para navegar

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink], // <-- Inyéctalo aquí
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class Navbar {
  nombreTienda = 'ZapasStore';
}