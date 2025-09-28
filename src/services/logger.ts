/**
 * Logger service for RGS API communication
 * Provides structured logging for requests, responses, and errors
 */

/**
 * Generates a short random string suitable for request correlation
 * @returns A random string ID
 */
export function makeRequestId(): string {
  // Generate a random 8-character string (base36 encoding of a random number)
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Safely stringifies an object, handling circular references
 * @param obj The object to stringify
 * @returns A string representation of the object
 */
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  }, 2);
}

/**
 * Logs information about an API request
 * @param id Request ID for correlation
 * @param info Request information object
 */
export function logRequest(
  id: string, 
  info: { 
    method: string; 
    url: string; 
    headers?: Record<string, string>; 
    body?: any 
  }
): void {
  const { method, url, headers, body } = info;
  
  // Create a clean object for logging
  const logObject = {
    id,
    method,
    url,
    headers: headers || {},
    ...(body !== undefined ? { body } : {})
  };

  console.debug(`[RGS][request][${id}]`, logObject);
}

/**
 * Logs information about an API response
 * @param id Request ID for correlation
 * @param info Response information object
 */
export function logResponse(
  id: string, 
  info: { 
    status: number; 
    ok: boolean; 
    headers: Record<string, string>; 
    body?: any 
  }
): void {
  const { status, ok, headers, body } = info;
  
  // Create a clean object for logging
  const logObject = {
    id,
    status,
    ok,
    headers,
    ...(body !== undefined ? { body } : {})
  };

  console.debug(`[RGS][response][${id}]`, logObject);
}

/**
 * Logs error information from API calls
 * @param id Request ID for correlation
 * @param error Error object or message
 */
export function logError(id: string, error: any): void {
  let errorInfo: any;

  if (error instanceof Error) {
    errorInfo = {
      id,
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else {
    errorInfo = {
      id,
      error: safeStringify(error)
    };
  }

  console.error(`[RGS][error][${id}]`, errorInfo);
}
