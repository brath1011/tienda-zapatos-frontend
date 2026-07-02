import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Zapato } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly baseUrl = `${environment.apiUrl}/api/zapatos`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Zapato[]> {
    return this.http.get<Zapato[]>(this.baseUrl);
  }

  buscarPorId(id: number): Observable<Zapato> {
    return this.http.get<Zapato>(`${this.baseUrl}/${id}`);
  }

  crear(producto: Zapato): Observable<Zapato> {
    return this.http.post<Zapato>(this.baseUrl, producto);
  }

  actualizar(id: number, producto: Zapato): Observable<Zapato> {
    return this.http.put<Zapato>(`${this.baseUrl}/${id}`, producto);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
