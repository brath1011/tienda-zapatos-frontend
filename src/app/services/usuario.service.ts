import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioAdminRequest, Cliente } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/admin/usuarios`;

  listarTodos(): Observable<Cliente[]> {
    return this.http.get<Cliente[]>(this.baseUrl);
  }

  crearUsuarioAdmin(request: UsuarioAdminRequest): Observable<any> {
    // Especificamos responseType 'text' porque el backend retorna un String plano
    return this.http.post(this.baseUrl, request, { responseType: 'text' });
  }

  cambiarEstado(id: number, activo: boolean): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/estado?activo=${activo}`, {}, { responseType: 'text' });
  }

  actualizarZona(id: number, zona: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/${id}/zona?zona=${encodeURIComponent(zona)}`, {}, { responseType: 'text' });
  }
}
