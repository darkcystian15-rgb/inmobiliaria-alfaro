// Match the application's bundler resolution when testing TS modules directly in Node.
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, nextResolve) {
    try { return nextResolve(specifier, context); }
    catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.') || /\.[a-z]+$/i.test(specifier)) throw error;
      try { return nextResolve(`${specifier}.ts`, context); }
      catch { throw error; }
    }
  },
});
