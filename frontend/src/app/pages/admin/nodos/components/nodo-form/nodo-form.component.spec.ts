import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodoFormComponent } from './nodo-form.component';
import { ReactiveFormsModule } from '@angular/forms';

describe('NodoFormComponent', () => {
  let component: NodoFormComponent;
  let fixture: ComponentFixture<NodoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodoFormComponent, ReactiveFormsModule]
    }).compileComponents();

    fixture = TestBed.createComponent(NodoFormComponent);
    component = fixture.componentInstance;

    // Create a mock div for leaflet map reference in test runner
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
    expect(component.map).toBeDefined();
    const mapInstance = component.map!;
    spyOn(mapInstance, 'remove').and.callThrough();
    component.ngOnDestroy();
    expect(mapInstance.remove).toHaveBeenCalled();
    expect(component.map).toBeUndefined();
  });
});
