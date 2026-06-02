import { Injectable, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class SupabaseService {
  private clientInstance: SupabaseClient | undefined;
  private adminClientInstance: SupabaseClient | undefined;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private configService: ConfigService,
  ) {}

  getClient(): SupabaseClient {
    if (this.clientInstance) {
      return this.clientInstance;
    }

    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_KEY');

    if (!url || !key) {
      throw new Error(
        'Supabase configuration missing (SUPABASE_URL or SUPABASE_KEY)',
      );
    }

    this.clientInstance = createClient(url, key, {
      global: {
        headers: {
          Authorization: this.request.get('Authorization') || '',
        },
      },
    });

    return this.clientInstance;
  }

  getAdminClient(): SupabaseClient {
    if (this.adminClientInstance) {
      return this.adminClientInstance;
    }

    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !serviceRoleKey) {
      throw new Error(
        'Supabase Admin configuration missing (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)',
      );
    }

    this.adminClientInstance = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    return this.adminClientInstance;
  }
}

