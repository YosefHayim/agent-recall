import type { ProviderAdapter } from '../core/index.js';
import { claudeCodeProvider } from './claudeCode.js';
import { codexProvider } from './codex.js';
import { cursorProvider } from './cursor.js';
import { devinProvider } from './devin.js';
import { geminiProvider } from './gemini.js';
import { grokProvider } from './grok.js';
import { kimiProvider } from './kimi.js';
import { kiroProvider } from './kiro.js';
import { opencodeProvider } from './opencode.js';

/**
 * Re-exports the provider id type and schema from the core module.
 */
export { type ProviderId, ProviderIdSchema } from '../core/index.js';
export * from './claudeCode.js';
export * from './codex.js';
export * from './cursor.js';
export * from './devin.js';
export * from './directorySessions.js';
export * from './gemini.js';
export * from './grok.js';
export * from './kimi.js';
export * from './kiro.js';
export * from './opencode.js';

/**
 * All registered provider adapters.
 */
export const allProviders: ReadonlyArray<ProviderAdapter> = [
  codexProvider,
  claudeCodeProvider,
  kiroProvider,
  grokProvider,
  kimiProvider,
  opencodeProvider,
  geminiProvider,
  cursorProvider,
  devinProvider,
];
