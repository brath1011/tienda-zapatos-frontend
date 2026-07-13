import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Direccion } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class DireccionService {
  private readonly baseUrl = `${environment.apiUrl}/api/direcciones`;

  constructor(private readonly http: HttpClient) {}

  obtenerMisDirecciones(): Observable<Direccion[]> {
    return this.http.get<Direccion[]>(this.baseUrl);
  }

  agregarDireccion(direccion: Direccion): Observable<Direccion> {
    return this.http.post<Direccion>(this.baseUrl, direccion);
  }

  actualizarDireccion(id: number, direccion: Direccion): Observable<Direccion> {
    return this.http.put<Direccion>(`${this.baseUrl}/${id}`, direccion);
  }

  eliminarDireccion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
