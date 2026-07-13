import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepartidorPedidos } from './repartidor-pedidos';

describe('RepartidorPedidos', () => {
  let component: RepartidorPedidos;
  let fixture: ComponentFixture<RepartidorPedidos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepartidorPedidos],
    }).compileComponents();

    fixture = TestBed.createComponent(RepartidorPedidos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
