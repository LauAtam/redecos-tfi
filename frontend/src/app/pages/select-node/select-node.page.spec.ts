import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SelectNodePage } from './select-node.page';
import { SupabaseService } from '../../supabase.service';
import { of } from 'rxjs';

describe('SelectNodePage', () => {
  let component: SelectNodePage;
  let fixture: ComponentFixture<SelectNodePage>;
  let mockSupabaseService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockRouter = {
      navigate: jasmine.createSpy('navigate')
    };

    mockSupabaseService = {
      currentUserValue: { id: 'user-123', email: 'juan@example.com', role: 'CLIENTE', default_node_id: 'node-1' },
      getNodos: jasmine.createSpy('getNodos').and.returnValue(Promise.resolve({
        data: [
          { id: 'node-1', name: 'Nodo 1', address: 'Av Colon 100', manager_name: 'Juan', latitude: -31.4, longitude: -64.1, participants_count: 5 },
          { id: 'node-2', name: 'Nodo 2', address: 'Av General Paz 200', manager_name: 'Pedro', latitude: -31.5, longitude: -64.2, participants_count: 10 }
        ],
        error: null
      })),
      updateProfile: jasmine.createSpy('updateProfile').and.returnValue(Promise.resolve({
        user: { id: 'user-123', email: 'juan@example.com', role: 'CLIENTE', default_node_id: 'node-2' },
        error: null
      })),
      logout: jasmine.createSpy('logout').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [SelectNodePage],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: Router, useValue: mockRouter }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SelectNodePage);
    component = fixture.componentInstance;

    // Create a mock div for leaflet map container
    const mapDiv = document.createElement('div');
    mapDiv.id = 'select-node-map';
    mapDiv.style.height = '100px';
    document.body.appendChild(mapDiv);

    fixture.detectChanges();
  });

  afterEach(() => {
    const mapDiv = document.getElementById('select-node-map');
    if (mapDiv) {
      document.body.removeChild(mapDiv);
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check for existing node on init', () => {
    expect(component.currentSelectedNodeId).toBe('node-1');
    expect(component.canCancel).toBeTrue();
  });

  it('should sort nodes by popularity (descending) when selected', () => {
    component.sortBy = 'popularity';
    component.sortNodos();

    // Node 2 has 10 participants, Node 1 has 5
    expect(component.nodos[0].id).toBe('node-2');
    expect(component.nodos[1].id).toBe('node-1');
  });

  it('should sort nodes by proximity when geolocation coordinates are present', () => {
    component.userLatitude = -31.39;
    component.userLongitude = -64.09;
    component.sortBy = 'proximity';
    component.sortNodos();

    // Node 1 is closer to (-31.39, -64.09) than Node 2
    expect(component.nodos[0].id).toBe('node-1');
    expect(component.nodos[1].id).toBe('node-2');
  });

  it('should select a node and navigate to home', fakeAsync(() => {
    const targetNode = { id: 'node-2', name: 'Nodo 2', address: 'Av General Paz' } as any;
    component.selectNode(targetNode);
    tick();

    expect(mockSupabaseService.updateProfile).toHaveBeenCalledWith({ default_node_id: 'node-2' });
    expect(component.currentSelectedNodeId).toBe('node-2');
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/home']);
  }));

  it('should logout and redirect to login page', fakeAsync(() => {
    component.logout();
    tick();

    expect(mockSupabaseService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/login']);
  }));
});
