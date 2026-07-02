import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Zapato } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class OfertaService {
  private readonly baseUrl = `${environment.apiUrl}/ofertas`;

  constructor(private readonly http: HttpClient) {}

  aplicarDescuento(idProducto: number, porcentaje: number): Observable<Zapato> {
    return this.http.put<Zapato>(`${this.baseUrl}/descuento/${idProducto}?porcentaje=${porcentaje}`, null);
  }
}
