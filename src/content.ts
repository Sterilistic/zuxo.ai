import { getPlatformAdapter } from './platforms';

// Initialize the appropriate platform adapter
const adapter = getPlatformAdapter();
adapter.initialize(); 