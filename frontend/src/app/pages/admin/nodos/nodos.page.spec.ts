import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NodosPage } from './nodos.page';
import { ReactiveFormsModule } from '@angular/forms';
import { SupabaseService } from '../../../supabase.service';
import { ToastService } from '../../../core/services/toast.service';
import { of } from 'rxjs';
import * as L from 'leaflet';

describe('NodosPage', () => {
  let component: NodosPage;
  let fixture: ComponentFixture<NodosPage>;
  let mockSupabaseService: any;
  let mockToastService: any;

  beforeEach(async () => {
    mockSupabaseService = {
      getNodos: jasmine.createSpy('getNodos').and.returnValue(Promise.resolve({ data: [], error: null })),
      createNodo: jasmine.createSpy('createNodo').and.returnValue(Promise.resolve({ data: { id: '1', name: 'Test' }, error: null }))
    };

    mockToastService = {
      showSuccess: jasmine.createSpy('showSuccess'),
      showError: jasmine.createSpy('showError')
    };

    await TestBed.configureTestingModule({
      imports: [NodosPage, ReactiveFormsModule],
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: ToastService, useValue: mockToastService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(NodosPage);
    component = fixture.componentInstance;

    // Create a mock div for leaflet
    const mapDiv = document.createElement('div');
    mapDiv.id = 'map';
    mapDiv.style.height = '100px';
    document.body.appendChild(mapDiv);

    fixture.detectChanges();
  });

  afterEach(() => {
    const mapDiv = document.getElementById('map');
    if (mapDiv) {
      document.body.removeChild(mapDiv);
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate form coordinates ranges', () => {
    const latControl = component.nodoForm.get('latitude');
    const lngControl = component.nodoForm.get('longitude');

    latControl?.setValue(100); // Invalid
    expect(latControl?.valid).toBeFalse();

    latControl?.setValue(-31.4201); // Valid
    expect(latControl?.valid).toBeTrue();

    lngControl?.setValue(-200); // Invalid
    expect(lngControl?.valid).toBeFalse();

    lngControl?.setValue(-64.1888); // Valid
    expect(lngControl?.valid).toBeTrue();
  });

  it('should clean up map on destroy', () => {
    component.showForm = true;
    fixture.detectChanges();
    
    expect(component.map).toBeDefined();
    const mapInstance = component.map!;
    spyOn(mapInstance, 'remove').and.callThrough();
    component.ngOnDestroy();
    expect(mapInstance.remove).toHaveBeenCalled();
    expect(component.map).toBeUndefined();
  });
});
