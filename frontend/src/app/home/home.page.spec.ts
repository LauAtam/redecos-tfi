import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HomePage } from './home.page';
import { SupabaseService } from '../supabase.service';
import { BehaviorSubject } from 'rxjs';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;
  let mockSupabaseService: any;
  let mockRouter: any;
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

    mockSupabaseService = {
      currentUser$: currentUserSubject.asObservable(),
      currentUserValue: { id: 'user-123', role: 'CLIENTE', default_node_id: 'node-1' },
      getNodos: jasmine.createSpy('getNodos').and.returnValue(Promise.resolve({
        data: [
          { id: 'node-1', name: 'Nodo Central', address: 'Av Colon 100', manager_name: 'Juan' }
        ],
        error: null
      })),
      logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: Router, useValue: mockRouter }
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

  it('should logout and redirect to login', fakeAsync(() => {
    component.logout();
    tick();

    expect(mockSupabaseService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));
});
