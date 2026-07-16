import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar';
import { AuthService } from './services/auth.service';
import { InfoModalService } from './services/info-modal.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  title = 'tienda-zapatos-frontend';
  readonly auth = inject(AuthService);
  readonly infoModal = inject(InfoModalService);

  constructor() {
    // 1. Guardamos el título original de la página
    let tituloOriginal = document.title;

    // 2. Escuchamos el evento que detecta si la página está visible u oculta
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        // Si el usuario cambia de pestaña, mostramos el mensaje triste
        document.title = "No te vayas! 🥺";
      } else {
        // Si el usuario regresa, restauramos el título original
        document.title = tituloOriginal;
      }
    });
  }
}
