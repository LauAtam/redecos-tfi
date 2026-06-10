import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SupabaseService } from '../../supabase.service';
import { nodeGuard } from './node.guard';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('nodeGuard', () => {
  let mockSupabaseService: any;
  let mockRouter: any;

  beforeEach(() => {
    mockRouter = {
      parseUrl: jasmine.createSpy('parseUrl').and.callFake((url: string) => url as any)
    };

    mockSupabaseService = {
      authInitialized: signal(true),
      authInitialized$: of(true),
      currentUser: signal<any>(null),
      currentUserValue: null
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: SupabaseService, useValue: mockSupabaseService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should allow access (return true) if user is not logged in', () => {
    mockSupabaseService.currentUserValue = null;
    mockSupabaseService.currentUser.set(null);

    const result = TestBed.runInInjectionContext(() => nodeGuard({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should allow access (return true) if user has role CLIENTE and default_node_id is set', () => {
    const mockUser = { role: 'CLIENTE', default_node_id: 'node-123' };
    mockSupabaseService.currentUserValue = mockUser;
    mockSupabaseService.currentUser.set(mockUser);

    const result = TestBed.runInInjectionContext(() => nodeGuard({} as any, {} as any));
    expect(result).toBeTrue();
  });

  it('should redirect to /pages/select-node if user has role CLIENTE and default_node_id is missing', () => {
    const mockUser = { role: 'CLIENTE' };
    mockSupabaseService.currentUserValue = mockUser;
    mockSupabaseService.currentUser.set(mockUser);

    const result = TestBed.runInInjectionContext(() => nodeGuard({} as any, {} as any));
    expect(result as any).toBe('/pages/select-node');
    expect(mockRouter.parseUrl).toHaveBeenCalledWith('/pages/select-node');
  });

  it('should allow access if user has role ADMIN even if default_node_id is missing', () => {
    const mockUser = { role: 'ADMIN' };
    mockSupabaseService.currentUserValue = mockUser;
    mockSupabaseService.currentUser.set(mockUser);

    const result = TestBed.runInInjectionContext(() => nodeGuard({} as any, {} as any));
    expect(result).toBeTrue();
  });
});
