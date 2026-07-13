import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PerfilService } from '../services/perfil.service';

@Component({
  selector: 'app-vendedor-repartidores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './vendedor-repartidores.html',
  styleUrl: './vendedor-repartidores.scss'
})
export class VendedorRepartidoresComponent implements OnInit {
  private readonly perfilApi = inject(PerfilService);

  readonly repartidores = signal<any[]>([]);
  readonly cargando = signal(true);
  readonly mensajeError = signal('');

  ngOnInit(): void {
    this.cargarRepartidores();
  }

  cargarRepartidores(): void {
    this.cargando.set(true);
    this.perfilApi.obtenerRepartidores().subscribe({
      next: (data) => {
        this.repartidores.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.mensajeError.set('Error al cargar la lista de repartidores.');
        this.cargando.set(false);
      }
    });
  }
}
