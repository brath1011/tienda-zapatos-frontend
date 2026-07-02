import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar'; // Ajusta la ruta si es navbar.component

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent], // <-- ¡Aquí estaba el secreto!
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'tienda-zapatos-frontend';
}