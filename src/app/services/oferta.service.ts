import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Zapato } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class OfertaService {
  private readonly baseUrl = `${environment.apiUrl}/ofertas`;

  constructor(private readonly http: HttpClient) {}

  aplicarDescuento(idProducto: number, porcentaje: number): Observable<Zapato | null> {
    const params = new HttpParams().set('porcentaje', porcentaje);

    return this.enviarDescuento('PUT', idProducto, params).pipe(
      catchError((error) => {
        if (error instanceof HttpErrorResponse && error.status === 405) {
          return this.enviarDescuento('GET', idProducto, params);
        }

        return throwError(() => error);
      })
    );
  }

  private enviarDescuento(method: 'GET' | 'PUT', idProducto: number, params: HttpParams): Observable<Zapato | null> {
    return this.http.request(method, `${this.baseUrl}/descuento/${idProducto}`, {
      params,
      body: method === 'PUT' ? null : undefined,
      responseType: 'text'
    }).pipe(
      map((response) => this.parsearProducto(response))
    );
  }

  private parsearProducto(response: string): Zapato | null {
    const texto = response.trim();
    if (!texto) return null;

    try {
      return JSON.parse(texto) as Zapato;
    } catch {
      return null;
    }
  }
}
