import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ApiVersion {
  version: string;
  isDeprecated: boolean;
  deprecationDate?: Date;
  sunsetDate?: Date;
  supportedClients: string[];
}

@Injectable()
export class VersioningService {
  private readonly logger = new Logger(VersioningService.name);
  private readonly versions: Map<string, ApiVersion> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeVersions();
  }

  /**
   * Initialize API versions
   */
  private initializeVersions(): void {
    // Version 1 - Current stable
    this.versions.set('v1', {
      version: 'v1',
      isDeprecated: false,
      supportedClients: ['mobile-v1.0', 'web-v1.0', 'mobile-v1.1'],
    });

    // Version 2 - Latest with new features
    this.versions.set('v2', {
      version: 'v2',
      isDeprecated: false,
      supportedClients: ['mobile-v2.0', 'web-v2.0'],
    });

    // Version 3 - Future version (in development)
    this.versions.set('v3', {
      version: 'v3',
      isDeprecated: false,
      supportedClients: ['mobile-v3.0-beta', 'web-v3.0-beta'],
    });
  }

  /**
   * Get version information
   */
  getVersion(version: string): ApiVersion | null {
    return this.versions.get(version) || null;
  }

  /**
   * Get all versions
   */
  getAllVersions(): ApiVersion[] {
    return Array.from(this.versions.values());
  }

  /**
   * Get supported versions for a client
   */
  getSupportedVersions(client: string): ApiVersion[] {
    return this.getAllVersions().filter(v => 
      v.supportedClients.includes(client)
    );
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: string): boolean {
    const versionInfo = this.getVersion(version);
    return versionInfo !== null && !versionInfo.isDeprecated;
  }

  /**
   * Check if a version is deprecated
   */
  isVersionDeprecated(version: string): boolean {
    const versionInfo = this.getVersion(version);
    return versionInfo?.isDeprecated || false;
  }

  /**
   * Get deprecation warning for a version
   */
  getDeprecationWarning(version: string): string | null {
    const versionInfo = this.getVersion(version);
    if (!versionInfo?.isDeprecated) return null;

    return `API version ${version} is deprecated. Please upgrade to the latest version.`;
  }

  /**
   * Get sunset date for a version
   */
  getSunsetDate(version: string): Date | null {
    const versionInfo = this.getVersion(version);
    return versionInfo?.sunsetDate || null;
  }

  /**
   * Get latest stable version
   */
  getLatestStableVersion(): string {
    const stableVersions = this.getAllVersions().filter(v => !v.isDeprecated);
    return stableVersions[stableVersions.length - 1]?.version || 'v1';
  }

  /**
   * Get version migration guide
   */
  getMigrationGuide(fromVersion: string, toVersion: string): string {
    const guides: Record<string, Record<string, string>> = {
      'v1': {
        'v2': `
# Migration Guide: v1 → v2

## Breaking Changes
- User profile endpoint moved from /user/profile to /users/profile
- Plan creation response format changed
- Authentication headers updated

## New Features
- Enhanced analytics endpoints
- Real-time notifications
- Advanced filtering options

## Migration Steps
1. Update authentication headers
2. Update endpoint URLs
3. Update response parsing logic
4. Test thoroughly in staging environment
        `,
        'v3': `
# Migration Guide: v1 → v3

## Breaking Changes
- Complete API restructure
- New authentication system
- Updated data models

## New Features
- GraphQL support
- WebSocket real-time updates
- Advanced caching

## Migration Steps
1. Complete rewrite required
2. New authentication implementation
3. Update all client code
4. Extensive testing required
        `,
      },
      'v2': {
        'v3': `
# Migration Guide: v2 → v3

## Breaking Changes
- Authentication system updated
- Response format changes
- New error handling

## New Features
- GraphQL endpoints
- Real-time subscriptions
- Enhanced security

## Migration Steps
1. Update authentication
2. Implement GraphQL client
3. Update error handling
4. Test new features
        `,
      },
    };

    return guides[fromVersion]?.[toVersion] || 'No migration guide available.';
  }

  /**
   * Validate client version compatibility
   */
  validateClientVersion(client: string, version: string): {
    isValid: boolean;
    warning?: string;
    error?: string;
  } {
    const versionInfo = this.getVersion(version);
    
    if (!versionInfo) {
      return {
        isValid: false,
        error: `API version ${version} is not supported.`,
      };
    }

    if (versionInfo.isDeprecated) {
      return {
        isValid: true,
        warning: this.getDeprecationWarning(version),
      };
    }

    if (!versionInfo.supportedClients.includes(client)) {
      return {
        isValid: false,
        error: `Client ${client} is not supported for API version ${version}.`,
      };
    }

    return { isValid: true };
  }

  /**
   * Get version statistics
   */
  getVersionStats(): {
    totalVersions: number;
    activeVersions: number;
    deprecatedVersions: number;
    supportedClients: string[];
  } {
    const allVersions = this.getAllVersions();
    const activeVersions = allVersions.filter(v => !v.isDeprecated);
    const deprecatedVersions = allVersions.filter(v => v.isDeprecated);
    const supportedClients = Array.from(
      new Set(allVersions.flatMap(v => v.supportedClients))
    );

    return {
      totalVersions: allVersions.length,
      activeVersions: activeVersions.length,
      deprecatedVersions: deprecatedVersions.length,
      supportedClients,
    };
  }
}
