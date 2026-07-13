import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NodosPage } from './nodos.page';
import { ReactiveFormsModule } from '@angular/forms';
import { AppFacadeService } from '../../../app-facade.service';
import { ToastService } from '../../../core/services/toast.service';
import { of } from 'rxjs';
import * as L from 'leaflet';

describe('NodosPage', () => {
  let component: NodosPage;
  let fixture: ComponentFixture<NodosPage>;
  let mockAppFacadeService: any;
  let mockToastService: any;

  beforeEach(async () => {
    mockAppFacadeService = {
      getNodos: jasmine.createSpy('getNodos').and.returnValue(Promise.resolve({ data: [], error: null })),
      createNodo: jasmine.createSpy('createNodo').and.returnValue(Promise.resolve({ data: { id: '1', name: 'Test' }, error: null })),
      updateNodo: jasmine.createSpy('updateNodo').and.returnValue(Promise.resolve({ data: { id: '1', name: 'Updated Test' }, error: null }))
    };

    mockToastService = {
      showSuccess: jasmine.createSpy('showSuccess'),
      showError: jasmine.createSpy('showError')
    };

    await TestBed.configureTestingModule({
      imports: [NodosPage, ReactiveFormsModule],
      providers: [
        { provide: AppFacadeService, useValue: mockAppFacadeService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NodosPage);
    component = fixture.componentInstance;

    // Create a mock div for leaflet listMap
    const mapDiv = document.createElement('div');
    mapDiv.id = 'list-map';
    mapDiv.style.height = '100px';
    document.body.appendChild(mapDiv);

    fixture.detectChanges();
  });

  afterEach(() => {
    const mapDiv = document.getElementById('list-map');
    if (mapDiv) {
      document.body.removeChild(mapDiv);
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle form visibility and clear errors', () => {
    component.errorMessage = 'Some error';
    component.toggleForm(true);
    expect(component.showForm).toBeTrue();

    component.toggleForm(false);
    expect(component.showForm).toBeFalse();
    expect(component.errorMessage).toBeNull();
  });

  it('should open and close details modal', () => {
    const testNodo = { id: '1', name: 'Test Node', address: 'Calle 123', manager_name: 'Juan' };
    component.openDetailModal(testNodo);
    expect(component.selectedNodo).toBe(testNodo);

    component.closeDetailModal();
    expect(component.selectedNodo).toBeNull();
  });

  it('should sort nodes by proximity', () => {
    component.userLatitude = -31.4201;
    component.userLongitude = -64.1888;
    component.nodos = [
      { id: '1', name: 'Far Node', address: 'Calle Lejana 123', manager_name: 'Carlos', latitude: -31.5, longitude: -64.2 },
      { id: '2', name: 'Near Node', address: 'Calle Cercana 456', manager_name: 'Ana', latitude: -31.421, longitude: -64.189 }
    ];

    component.sortNodosByProximity();

    expect(component.nodos[0].name).toBe('Near Node');
    expect(component.nodos[1].name).toBe('Far Node');
  });

  it('should transition to edit mode when onEditNodo is called', fakeAsync(() => {
    const testNodo = { id: '1', name: 'Test Node', address: 'Calle 123', manager_name: 'Juan', latitude: -31.42, longitude: -64.18 };
    
    component.onEditNodo(testNodo);
    
    expect(component.isEditing).toBeTrue();
    expect(component.editingNodoId).toBe('1');
    expect(component.showForm).toBeTrue();
    expect(component.selectedNodo).toBeNull(); // Should close modal
  }));

  it('should call onCreateNodo when onSubmitForm is called and not editing', () => {
    spyOn(component, 'onCreateNodo');
    const testNodo = { name: 'New Node', address: 'Calle 123', manager_name: 'Juan' };
    
    component.isEditing = false;
    component.onSubmitForm(testNodo);
    
    expect(component.onCreateNodo).toHaveBeenCalledWith(testNodo);
  });

  it('should call onUpdateNodo when onSubmitForm is called and isEditing is true', () => {
    spyOn(component, 'onUpdateNodo');
    const testNodo = { name: 'New Node', address: 'Calle 123', manager_name: 'Juan' };
    
    component.isEditing = true;
    component.editingNodoId = '123';
    component.onSubmitForm(testNodo);
    
    expect(component.onUpdateNodo).toHaveBeenCalledWith('123', testNodo);
  });

  it('should clean up listMap on destroy', () => {
    expect(component.listMap).toBeDefined();
    const mapInstance = component.listMap!;
    spyOn(mapInstance, 'remove').and.callThrough();
    component.ngOnDestroy();
    expect(mapInstance.remove).toHaveBeenCalled();
    expect(component.listMap).toBeUndefined();
  });
});
