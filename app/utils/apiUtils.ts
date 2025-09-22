/**
 * Utility functions for API calls with proper base path handling
 */

/**
 * Gets the API URL with the correct base path
 * @param endpoint - The API endpoint (e.g., '/api/models')
 * @returns The full API URL with base path (e.g., '/coder/api/models')
 */
export const getApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // Add the base path
  return `/coder/${cleanEndpoint}`;
};

/**
 * Makes a fetch request to an API endpoint with the correct base path
 * @param endpoint - The API endpoint (e.g., '/api/models')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const url = getApiUrl(endpoint);
  return fetch(url, options);
};
