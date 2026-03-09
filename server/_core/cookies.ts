import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");

  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}

// Public suffixes where setting a parent domain would be too broad
// (e.g., .railway.app, .vercel.app, .netlify.app)
const PUBLIC_SUFFIX_HOSTS = new Set(["railway.app", "vercel.app", "netlify.app", "up.railway.app"]);

/**
 * Extract parent domain for cookie sharing across subdomains.
 * e.g., "3000-xxx.manuspre.computer" -> ".manuspre.computer"
 * This allows cookies set by 3000-xxx to be read by 8081-xxx
 * 
 * For production hosts like Railway, we don't set a domain so the browser
 * uses the exact hostname (more secure and compatible).
 */
function getParentDomain(hostname: string): string | undefined {
  // Don't set domain for localhost or IP addresses
  if (LOCAL_HOSTS.has(hostname) || isIpAddress(hostname)) {
    return undefined;
  }

  // Split hostname into parts
  const parts = hostname.split(".");

  // Need at least 3 parts for a subdomain (e.g., "3000-xxx.manuspre.computer")
  if (parts.length < 3) {
    return undefined;
  }

  // Check if the parent domain is a public suffix (too broad for a cookie domain)
  const parentDomain = parts.slice(-2).join(".");
  const grandParentDomain = parts.slice(-3).join(".");
  if (PUBLIC_SUFFIX_HOSTS.has(parentDomain) || PUBLIC_SUFFIX_HOSTS.has(grandParentDomain)) {
    // Don't set domain - browser will use the exact hostname
    return undefined;
  }

  // Return parent domain with leading dot (e.g., ".manuspre.computer")
  // This allows cookie to be shared across all subdomains (e.g., Manus dev)
  return "." + parentDomain;
}

export function getSessionCookieOptions(
  req: Request,
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const domain = getParentDomain(hostname);

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
