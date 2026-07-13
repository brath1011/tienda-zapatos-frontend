import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/api/reportes`;

  obtenerVistaPreviaVentas(fechaInicio: string, fechaFin: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/ventas`, {
      params: { fechaInicio, fechaFin }
    });
  }

  descargarExcelVentas(fechaInicio: string, fechaFin: string): void {
    this.http.get(`${this.baseUrl}/ventas/excel`, {
      params: { fechaInicio, fechaFin },
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte_ventas_${fechaInicio}_al_${fechaFin}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar el excel:', err);
        alert('Hubo un error al descargar el reporte de Excel. Revisa la consola.');
      }
    });
  }
}
