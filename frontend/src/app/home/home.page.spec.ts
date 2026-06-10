import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HomePage } from './home.page';
import { SupabaseService } from '../supabase.service';
import { ToastService } from '../core/services/toast.service';
import { AlertController } from '@ionic/angular/standalone';
import { BehaviorSubject } from 'rxjs';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let mockSupabaseService: any;
  let mockRouter: any;
  let mockToastService: any;
  let mockAlertController: any;
  let currentUserSubject: BehaviorSubject<any>;

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<any>({
      id: 'user-123',
      role: 'CLIENTE',
      default_node_id: 'node-1'
    });

    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    mockToastService = {
      showSuccess: jasmine.createSpy('showSuccess'),
      showError: jasmine.createSpy('showError')
    };

    mockAlertController = {
      create: jasmine.createSpy('create').and.returnValue(Promise.resolve({
        present: jasmine.createSpy('present').and.returnValue(Promise.resolve())
      }))
    };

    mockSupabaseService = {
      currentUser$: currentUserSubject.asObservable(),
      currentUserValue: { id: 'user-123', role: 'CLIENTE', default_node_id: 'node-1' },
      getNodos: jasmine.createSpy('getNodos').and.returnValue(Promise.resolve({
        data: [
          { id: 'node-1', name: 'Nodo Central', address: 'Av Colon 100', manager_name: 'Juan' }
        ],
        error: null
      })),
      getProductos: jasmine.createSpy('getProductos').and.returnValue(Promise.resolve({
        data: [
          { id: 'prod-1', name: 'Yerba 1kg', price: 2000, bulk_size: 10, retail_price: 3000 }
        ],
        error: null
      })),
      logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: Router, useValue: mockRouter },
        { provide: ToastService, useValue: mockToastService },
        { provide: AlertController, useValue: mockAlertController }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should resolve active node from default_node_id', fakeAsync(() => {
    tick();
    expect(mockSupabaseService.getNodos).toHaveBeenCalled();
    expect(component.activeNode).toBeDefined();
    expect(component.activeNode!.name).toBe('Nodo Central');
  }));

  it('should load products on init', fakeAsync(() => {
    tick();
    expect(mockSupabaseService.getProductos).toHaveBeenCalled();
    expect(component.products.length).toBe(1);
    expect(component.products[0].name).toBe('Yerba 1kg');
  }));

  it('should calculate savings percentage correctly', () => {
    const savings = component.calculateSavings(2000, 3000);
    // ((3000 - 2000) / 3000) * 100 = 33.33% -> round to 33
    expect(savings).toBe(33);
  });

  it('should handle unirse a compra colectiva', fakeAsync(() => {
    const testProduct = { id: 'prod-1', name: 'Yerba 1kg', price: 2000, bulk_size: 10 };
    component.joinGroupBuy(testProduct);
    tick();

    expect(mockAlertController.create).toHaveBeenCalled();
  }));

  it('should logout and redirect to login', fakeAsync(() => {
    component.logout();
    tick();

    expect(mockSupabaseService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));
});
