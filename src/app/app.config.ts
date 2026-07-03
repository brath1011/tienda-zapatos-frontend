import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes'; 

export const appConfig: ApplicationConfig = {
  providers: [
    // [ENRUTAMIENTO SPA - Guía 12]: Habilita la navegación fluida entre componentes sin recargar el navegador.
    provideRouter(routes) 
  ]
};