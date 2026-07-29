#!/usr/bin/env python3
"""Reconciles clients from dialoguebranch-realm.json into an already-existing 'dialoguebranch'
realm: creates any client that's missing entirely, and for clients that already exist, adds any
redirectUris/webOrigins/post-logout-redirect-uris listed in the file but not yet present on the
live client. Runs as a one-shot container in infrastructure/docker/compose.yml, after Keycloak
starts, every time.

Needed because Keycloak's own --import-realm only ever fires on a genuinely fresh realm (a
brand-new server, or wiped volumes); once the realm already exists (e.g. a developer's existing
local MariaDB volume, with their own test data in it), re-mounting this same file does nothing.

Deliberately additive-only, never destructive: existing entries in these list/attribute fields are
never removed, and every other field on an existing client (secret, id, everything else) is left
completely untouched — a client is fetched, has just these lists unioned in-place, and PUT back,
so its secret and UUID survive exactly as SKIP-based partial import already guaranteed. This is
what lets dialoguebranch-realm.json gain a new redirect URI for an existing client (e.g. issue #81
adding the "client" Compose profile's own origin to dlb-bff) and have it actually reach a
developer's already-provisioned local Keycloak on the next `docker compose up`, without them
needing to reset their volume or hand-edit the client in the admin console.

This deliberately does not sync client secrets from environment variables the way the equivalent
connectedcare-nl/lizz script does: this stack has no production deployment, so a client's secret
value doesn't matter beyond "known and stable for local development", which is preserved for free
by only ever PUTting back a client representation this script itself just GET'd.

Keycloak's own depends_on condition (see compose.yml) is "service_started", the weakest one
Compose offers — it fires as soon as the container process launches, well before Keycloak has
actually finished booting, let alone running --import-realm against a genuinely fresh volume
(migrating the database and importing the whole realm export can itself take well over a minute).
wait_for_token() below is what actually absorbs that gap; its retry budget is deliberately
generous for exactly that first-run case, not just ordinary restart-speed variance.
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

KEYCLOAK_URL = os.environ.get("KEYCLOAK_INTERNAL_URL", "http://keycloak:8080")
REALM = "dialoguebranch"
REALM_EXPORT_PATH = "/realm-export.json"


def get_token() -> str:
    data = urllib.parse.urlencode(
        {
            "client_id": "admin-cli",
            "username": os.environ["KEYCLOAK_ADMIN"],
            "password": os.environ["KEYCLOAK_ADMIN_PASSWORD"],
            "grant_type": "password",
        }
    ).encode()
    req = urllib.request.Request(f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token", data=data)
    with urllib.request.urlopen(req) as resp:
        return json.load(resp)["access_token"]


def wait_for_token(retries: int = 40, delay: float = 5) -> str:
    for attempt in range(1, retries + 1):
        try:
            return get_token()
        except (urllib.error.URLError, KeyError, ValueError):
            print(f"Waiting for Keycloak admin API... ({attempt}/{retries})")
            time.sleep(delay)
    sys.exit("Could not obtain a Keycloak admin token")


def api(method: str, path: str, token: str, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{KEYCLOAK_URL}{path}", data=data, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req) as resp:
        raw = resp.read()
        return json.loads(raw) if raw else None


LOGOUT_URIS_ATTR = "post.logout.redirect.uris"


def merge_list_field(existing: dict, desired: dict, field: str) -> bool:
    """Adds any entries from desired[field] missing in existing[field] (plain JSON list fields
    like redirectUris/webOrigins). Returns whether anything changed."""
    current = existing.setdefault(field, [])
    changed = False
    for uri in desired.get(field, []):
        if uri not in current:
            current.append(uri)
            changed = True
    return changed


def merge_logout_uris(existing: dict, desired: dict) -> bool:
    """post.logout.redirect.uris isn't a JSON list — Keycloak stores it as one attribute string
    with "##" as the separator between entries. Same additive-union approach, just with that
    encoding instead of a real list."""
    existing_attrs = existing.setdefault("attributes", {})
    desired_value = desired.get("attributes", {}).get(LOGOUT_URIS_ATTR, "")
    if not desired_value:
        return False
    existing_entries = [u for u in existing_attrs.get(LOGOUT_URIS_ATTR, "").split("##") if u]
    desired_entries = [u for u in desired_value.split("##") if u]
    merged = existing_entries + [u for u in desired_entries if u not in existing_entries]
    if merged == existing_entries:
        return False
    existing_attrs[LOGOUT_URIS_ATTR] = "##".join(merged)
    return True


def sync_client(desired: dict, token: str) -> None:
    client_id = desired["clientId"]
    found = api(
        "GET",
        f"/admin/realms/{REALM}/clients?clientId={urllib.parse.quote(client_id)}",
        token,
    )
    if not found:
        api("POST", f"/admin/realms/{REALM}/clients", token, desired)
        print(f"Created missing client: {client_id}")
        return

    existing = found[0]
    changed = False
    changed |= merge_list_field(existing, desired, "redirectUris")
    changed |= merge_list_field(existing, desired, "webOrigins")
    changed |= merge_logout_uris(existing, desired)
    if changed:
        api("PUT", f"/admin/realms/{REALM}/clients/{existing['id']}", token, existing)
        print(f"Updated redirect/logout URIs on existing client: {client_id}")
    else:
        print(f"Already up to date: {client_id}")


def main() -> None:
    with open(REALM_EXPORT_PATH) as f:
        raw = f.read()

    # Same placeholder substitutions the Keycloak entrypoint does for a fresh --import-realm (see
    # compose.yml) — needed here too, since this script reads this file independently.
    raw = re.sub(
        r"__BFF_REDIRECT_URI__",
        os.environ.get("KEYCLOAK_BFF_REDIRECT_URI", "http://localhost:8082/login/oauth2/code/keycloak"),
        raw,
    )
    raw = re.sub(
        r"__BFF_POST_LOGOUT_REDIRECT_URI__",
        os.environ.get("KEYCLOAK_BFF_POST_LOGOUT_REDIRECT_URI", "http://localhost:5173/"),
        raw,
    )
    realm = json.loads(raw)

    token = wait_for_token()
    for client in realm["clients"]:
        sync_client(client, token)


if __name__ == "__main__":
    main()
