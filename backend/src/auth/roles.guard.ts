import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import type { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  private jwksClientInstance: jwksClient.JwksClient;

  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is missing in environment configuration');
    }

    this.jwksClientInstance = jwksClient({
      jwksUri: `${supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const decodedToken = jwt.decode(token, { complete: true }) as any;
      if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
        throw new UnauthorizedException('Invalid token format');
      }

      const kid = decodedToken.header.kid;
      const alg = decodedToken.header.alg;

      let payload: any;

      if (alg === 'ES256') {
        const key = await this.jwksClientInstance.getSigningKey(kid);
        const signingKey = key.getPublicKey();
        payload = jwt.verify(token, signingKey, { algorithms: ['ES256'] });
      } else {
        const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
        if (!secret) {
          throw new Error('SUPABASE_JWT_SECRET is missing');
        }
        const decodedSecret = Buffer.from(secret, 'base64');
        payload = jwt.verify(token, decodedSecret, { algorithms: ['HS256'] });
      }

      // Validación manual de expiración del token (Defensa en Profundidad)
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp <= currentTime) {
        console.warn(
          `[RolesGuard] Intento de acceso con token vencido. Exp: ${payload.exp}, Actual: ${currentTime}`,
        );
        throw new UnauthorizedException('Token has expired');
      }

      const userRole = payload.app_metadata?.role;

      if (!userRole || !requiredRoles.includes(userRole)) {
        throw new ForbiddenException('Invalid role permissions');
      }

      // Attach user info to the request for controller access
      request['user'] = {
        id: payload.sub,
        email: payload.email,
        role: userRole,
      };

      return true;
    } catch (err) {
      console.error('JWT Verification Error Details:', err);
      if (err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
