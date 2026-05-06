import { NextRequest, NextResponse } from "next/server";
import { rateLimitMiddleware, type RateLimitMiddlewareOptions } from "./middleware";

export type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export function withApiRateLimit(
  handler: RouteHandler,
  options?: RateLimitMiddlewareOptions
) {
  return async function rateLimitedHandler(request: NextRequest): Promise<NextResponse> {
    const { allowed, response } = await rateLimitMiddleware(request, {
      ...options,
      skipPaths: options?.skipPaths || [],
    });

    if (!allowed && response) {
      return response;
    }

    return handler(request);
  };
}

export function createRateLimitedHandler(
  handlers: {
    GET?: RouteHandler;
    POST?: RouteHandler;
    PUT?: RouteHandler;
    DELETE?: RouteHandler;
    PATCH?: RouteHandler;
  },
  options?: RateLimitMiddlewareOptions
  ) {
  return async function handler(request: NextRequest): Promise<NextResponse> {
    const { allowed, response } = await rateLimitMiddleware(request, options);

    if (!allowed && response) {
      return response;
    }

    const method = request.method.toUpperCase();
    const handler = handlers[method as keyof typeof handlers];

    if (!handler) {
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 405 }
      );
    }

    return handler(request);
  };
}
