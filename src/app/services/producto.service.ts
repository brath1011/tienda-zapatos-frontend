import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Zapato } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private readonly baseUrl = `${environment.apiUrl}/api/zapatos`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Zapato[]> {
    return this.http.get<any>(this.baseUrl).pipe(
      map(res => res.content ? res.content : res)
    );
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

  subirImagen(archivo: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', archivo);
    return this.http.post<{ url: string }>(`${this.baseUrl}/upload`, formData);
  }
}
