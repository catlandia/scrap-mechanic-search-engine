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

/** Why an assertion was rejected. Logged so a failed sign-in is diagnosable. */
export type SteamVerifyFailure =
  | "not_id_res"
  | "bad_claimed_id"
  | "fetch_threw"
  | "http_error"
  | "not_valid";

export type SteamVerifyResult =
  | { ok: true; steamid: string }
  | { ok: false; reason: SteamVerifyFailure; detail?: string };

/**
 * Undo the `+` → space corruption that happens to Steam's signature in transit.
 *
 * Steam percent-encodes the `+` characters in its base64 fields as `%2B`, but
 * by the time the request reaches this Worker the URL has been normalised and
 * that `%2B` is a literal `+`. `URLSearchParams` then does the standard
 * form-decoding thing and reads `+` as a space — so `openid.sig` and
 * `openid.response_nonce` arrive with spaces wherever Steam put a `+`. Handing
 * that back to `check_authentication` is a different byte string from the one
 * Steam signed, so Steam correctly answers `is_valid:false` and the sign-in
 * fails. (`%2F` and `%3D` are left alone by the same normalisation, which is
 * why only some sign-ins looked broken — it depends on whether that
 * particular signature happened to contain a `+`.)
 *
 * No field in an OpenID assertion may contain a literal space: they are URLs,
 * identifiers, comma-separated lists and base64 blobs. So a space here is
 * always a `+` that was mangled, and restoring it is unambiguous.
 *
 * Setting a real `+` on the outgoing URLSearchParams re-encodes it as `%2B`,
 * which is exactly what Steam signed.
 */
function restorePlus(value: string): string {
  return value.includes(" ") ? value.replaceAll(" ", "+") : value;
}

/**
 * Given the query params Steam sent to our return URL, POST them back with
 * `openid.mode=check_authentication` to have Steam confirm the signature.
 *
 * Every rejection path returns a distinct reason. It used to return a bare
 * `null` for all five, which meant a genuine Steam-side block and a stale
 * browser tab produced byte-identical "invalid_assertion" bounces with
 * nothing in the logs to tell them apart.
 */
export async function verifySteamAssertionDetailed(
  params: URLSearchParams,
): Promise<SteamVerifyResult> {
  const mode = params.get("openid.mode");
  if (mode !== "id_res") {
    return { ok: false, reason: "not_id_res", detail: `mode=${mode ?? "<none>"}` };
  }
  const claimedId = params.get("openid.claimed_id") ?? "";
  const match = claimedId.match(STEAMID_RE);
  if (!match) {
    return { ok: false, reason: "bad_claimed_id", detail: claimedId.slice(0, 120) };
  }
  const steamid = match[1];

  // Only forward the openid.* fields. Our own `next` query param rides along
  // on the return URL, and echoing a non-OpenID key back into a
  // check_authentication body is not something the spec asks for — strip it
  // so the request contains exactly what Steam signed and nothing else.
  const verifyBody = new URLSearchParams();
  for (const [key, value] of params) {
    if (key.startsWith("openid.")) verifyBody.set(key, restorePlus(value));
  }
  verifyBody.set("openid.mode", "check_authentication");

  let res: Response;
  try {
    res = await fetch(STEAM_OPENID_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Steam is known to treat some datacentre egress as bot traffic (it
        // 403s Cloudflare IPs on the Web API, which is why the crons live in
        // GitHub Actions). Sending a real UA costs nothing and removes one
        // reason for it to refuse this request.
        "User-Agent":
          "Mozilla/5.0 (compatible; ScrapMechanicSearchEngine/1.0; +https://scrap-mechanic-search-engine.com)",
        Accept: "text/plain, */*",
      },
      body: verifyBody.toString(),
      cache: "no-store",
    });
  } catch (err) {
    return { ok: false, reason: "fetch_threw", detail: String(err).slice(0, 200) };
  }

  if (!res.ok) {
    let snippet = "";
    try {
      snippet = (await res.text()).slice(0, 200);
    } catch {
      // body unreadable — the status code is the useful part anyway
    }
    return { ok: false, reason: "http_error", detail: `status=${res.status} body=${snippet}` };
  }

  const text = await res.text();
  // Response is key:value lines, e.g. "ns:http://specs.openid.net/auth/2.0\nis_valid:true\n".
  const isValid = /is_valid\s*:\s*true/i.test(text);
  if (!isValid) {
    return { ok: false, reason: "not_valid", detail: text.slice(0, 200) };
  }
  return { ok: true, steamid };
}

/** Back-compat wrapper: verified SteamID64 on success, null on any failure. */
export async function verifySteamAssertion(
  params: URLSearchParams,
): Promise<string | null> {
  const result = await verifySteamAssertionDetailed(params);
  return result.ok ? result.steamid : null;
}
