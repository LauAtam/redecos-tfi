import { Global, Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('SUPABASE_JWT_SECRET');
        if (!secret) {
          throw new Error(
            'SUPABASE_JWT_SECRET is missing in environment configuration',
          );
        }
        return {
          secret: Buffer.from(secret, 'base64'),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [SupabaseService],
  exports: [SupabaseService, JwtModule],
})
export class SupabaseModule {}
