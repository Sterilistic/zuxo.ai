import { PlatformAdapter } from './base';
import { GenericAdapter } from './generic';
import { LinkedInAdapter } from './linkedin';

const PLATFORM_ADAPTERS: Record<string, new () => PlatformAdapter> = {
  'www.linkedin.com': LinkedInAdapter,
  'default': GenericAdapter
};

export function getPlatformAdapter(): PlatformAdapter {
  const hostname = window.location.hostname;
  const AdapterClass = PLATFORM_ADAPTERS[hostname] || PLATFORM_ADAPTERS['default'];
  return new AdapterClass();
} 