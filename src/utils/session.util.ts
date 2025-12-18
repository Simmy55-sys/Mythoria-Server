import { Request } from "express";
import * as crypto from "crypto";

/**
 * Generate or retrieve a session ID for anonymous users
 * Uses cookie if available, otherwise generates a fingerprint from IP + User-Agent
 */
export function getOrCreateSessionId(request: Request): string {
  // Try to get session ID from cookie
  const cookieSessionId = request.cookies?.sessionId;
  if (cookieSessionId) {
    return cookieSessionId;
  }

  // Generate fingerprint from IP + User-Agent as fallback
  const ip = request.ip || request.socket.remoteAddress || "unknown";
  const userAgent = request.get("user-agent") || "unknown";
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${ip}-${userAgent}`)
    .digest("hex")
    .substring(0, 32);

  return fingerprint;
}
