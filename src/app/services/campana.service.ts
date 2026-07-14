import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Campana {
  idCampana?: number;
  nombre: string;
  porcentajeDescuento: number;
  filtroModelo?: string;
  filtroMarca?: string;
  filtroColor?: string;
  sinReembolso: boolean;
  fechaInicio?: string;
  fechaFin?: string;
  activa: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CampanaService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/api/campanas`;

  listarCampanas(): Observable<Campana[]> {
    return this.http.get<Campana[]>(this.apiUrl);
  }

  crearCampana(campana: Campana): Observable<Campana> {
    return this.http.post<Campana>(this.apiUrl, campana);
  }

  eliminarCampana(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
