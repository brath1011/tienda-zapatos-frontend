import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CompraWebRequest, Pedido } from '../models/api.models';

@Injectable({
  providedIn: 'root'
})
export class PedidoService {
  private readonly baseUrl = `${environment.apiUrl}/api/pedidos`;

  constructor(private readonly http: HttpClient) {}

  comprar(request: CompraWebRequest): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/comprar`, request);
  }

  reservar(request: any): Observable<{ reservaId: number, mensaje: string }> {
    return this.http.post<{ reservaId: number, mensaje: string }>(`${this.baseUrl}/reservar`, request);
  }

  cancelarReserva(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/reservar/${id}`);
  }

  misCompras(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/mis-compras`);
  }

  reembolsar(idPedido: number): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.baseUrl}/${idPedido}/reembolso`, {});
  }

  ganancias(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/admin/ganancias`);
  }

  gananciasFechas(inicio: string, fin: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/ganancias/fechas?inicio=${inicio}&fin=${fin}`);
  }

  gananciasGrafico(inicio: string, fin: string): Observable<{fecha: string, total: number}[]> {
    return this.http.get<{fecha: string, total: number}[]>(`${this.baseUrl}/admin/ganancias/grafico?inicio=${inicio}&fin=${fin}`);
  }

  listarTodos(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(this.baseUrl);
  }

  listarPorFechas(inicio: string, fin: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/fechas?inicio=${inicio}&fin=${fin}`);
  }

  registrarPresencial(request: any): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.baseUrl}/presencial`, request);
  }

  despachar(idPedido: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.baseUrl}/${idPedido}/despachar`, {});
  }

  cambiarEstado(idPedido: number, nuevoEstado: string, idRepartidor?: number): Observable<Pedido> {
    let url = `${this.baseUrl}/${idPedido}/estado?nuevoEstado=${nuevoEstado}`;
    if (idRepartidor) {
      url += `&idRepartidor=${idRepartidor}`;
    }
    return this.http.put<Pedido>(url, {});
  }

  listarRepartidores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/repartidores`);
  }

  eliminar(idPedido: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${idPedido}`);
  }

  // --- REPARTIDOR ---
  listarParaReparto(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/reparto`);
  }

  entregar(idPedido: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.baseUrl}/${idPedido}/entregar`, {});
  }

  devolver(idPedido: number): Observable<Pedido> {
    return this.http.put<Pedido>(`${this.baseUrl}/${idPedido}/devolver`, {});
  }

  misEntregas(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/mis-entregas`);
  }

  misEntregasFechas(inicio: string, fin: string): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.baseUrl}/mis-entregas/fechas?inicio=${inicio}&fin=${fin}`);
  }

  /**
   * Abre una conexión SSE con el backend para recibir notificaciones en tiempo real.
   * El token JWT se pasa como query param porque EventSource no soporta headers personalizados.
   * Devuelve el EventSource para que el componente lo cierre en ngOnDestroy.
   */
  suscribirNotificaciones(token: string): EventSource {
    return new EventSource(`${this.baseUrl}/notificaciones?token=${encodeURIComponent(token)}`);
  }
}
