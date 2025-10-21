import type { ServerBuild } from '@remix-run/cloudflare';
import { createPagesFunctionHandler } from '@remix-run/cloudflare-pages';

export const onRequest: PagesFunction = async (context) => {
  try {
    // Use dynamic import with proper error handling
    // @ts-ignore - Build file may not exist during development
    const serverBuildModule = await import('../build/server');
    const serverBuild = serverBuildModule as unknown as ServerBuild;

    const handler = createPagesFunctionHandler({
      build: serverBuild,
    });

    return handler(context);
  } catch (error) {
    // Handle the case where the build doesn't exist yet
    console.error('Server build not found:', error);
    return new Response('Server build not found. Please run the build process first.', {
      status: 500
    });
  }
};
