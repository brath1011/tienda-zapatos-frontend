import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from './navbar/navbar'; // <-- Corregido el nombre a Navbar

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar], // <-- Cambiado aquí también
  templateUrl: './app.html',
  styleUrls: ['../styles.scss']
})
export class AppComponent {
  title = 'tienda-zapatos';
}