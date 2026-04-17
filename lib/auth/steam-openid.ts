/**
 * Steam OpenID 2.0 helpers. We never see the user's password — Steam
 * authenticates on steamcommunity.com and returns a signed assertion we
 * verify by POST-ing back `openid.mode=check_authentication`.
 */

const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";
const STEAMID_RE = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/;

export function buildSteamLoginUrl(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnTo,
    "openid.realm": realm,
    "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
  });
  return `${STEAM_OPENID_URL}?${params.toString()}`;
}

/**
 * Given the query params Steam sent to our return URL, POST them back with
 * `openid.mode=check_authentication` to have Steam confirm the signature.
 * Returns the verified SteamID64 on success, null on failure.
 */
export async function verifySteamAssertion(
  params: URLSearchParams,
): Promise<string | null> {
  if (params.get("openid.mode") !== "id_res") return null;
  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = claimedId.match(STEAMID_RE);
  if (!match) return null;
  const steamid = match[1];

  const verifyBody = new URLSearchParams(params);
  verifyBody.set("openid.mode", "check_authentication");

  let res: Response;
  try {
    res = await fetch(STEAM_OPENID_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: verifyBody.toString(),
      cache: "no-store",
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const text = await res.text();
  // Response is key:value lines, e.g. "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n".
  const isValid = /is_valid\s*:\s*true/i.test(text);
  return isValid ? steamid : null;
}
