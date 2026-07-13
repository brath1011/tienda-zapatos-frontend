import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PerfilUpdateRequest, PasswordUpdateRequest } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class PerfilService {
  private readonly baseUrl = `${environment.apiUrl}/api/perfil`;

  constructor(private readonly http: HttpClient) {}

  obtenerPerfil(): Observable<any> {
    return this.http.get<any>(this.baseUrl);
  }

  actualizarPerfil(request: PerfilUpdateRequest): Observable<any> {
    return this.http.put<any>(this.baseUrl, request);
  }

  actualizarPassword(request: PasswordUpdateRequest): Observable<any> {
    return this.http.put(`${this.baseUrl}/password`, request, { responseType: 'text' });
  }

  obtenerContactoAdmin(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/contacto-admin`);
  }

  obtenerRepartidores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/repartidores`);
  }

  obtenerVentas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/ventas`);
  }
}
