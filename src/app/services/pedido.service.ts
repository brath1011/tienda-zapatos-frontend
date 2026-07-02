import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PedidoRequest } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private readonly baseUrl = `${environment.apiUrl}/api/pedidos`;

  constructor(private readonly http: HttpClient) {}

  comprar(request: PedidoRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/comprar`, request);
  }

  ganancias(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/admin/ganancias`);
  }
}
