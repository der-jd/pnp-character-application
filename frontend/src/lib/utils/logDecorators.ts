/**
 * Decorator-Based Logger
 * 
 * Use decorators to automatically log method entry/exit
 * Only active in development mode
 */

const isDev = process.env.NODE_ENV === 'development';

/**
 * Decorator to log method calls
 * Usage: @logMethod('ClassName')
 */
export function logMethod(className: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    if (!isDev) return descriptor;

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      console.log(`[${className}] → ${propertyKey}`, args.length > 0 ? args : '');
      
      try {
        const result = await originalMethod.apply(this, args);
        console.log(`[${className}] ← ${propertyKey}`, result !== undefined ? result : 'void');
        return result;
      } catch (error) {
        console.error(`[${className}] ✗ ${propertyKey}`, error);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to time method execution
 * Usage: @timeMethod('ClassName')
 */
export function timeMethod(className: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    if (!isDev) return descriptor;

    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const label = `[${className}] ${propertyKey}`;
      console.time(label);
      
      try {
        const result = await originalMethod.apply(this, args);
        console.timeEnd(label);
        return result;
      } catch (error) {
        console.timeEnd(label);
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Decorator to log only errors
 * Usage: @logErrors('ClassName')
 */
export function logErrors(className: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        console.error(`[${className}] Error in ${propertyKey}:`, error);
        throw error;
      }
    };

    return descriptor;
  };
}
