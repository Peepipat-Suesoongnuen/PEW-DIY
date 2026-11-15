#!/usr/bin/env python3
"""Read-only smoke test for the deployed PEW-DIY service (Lab 5 Episode 7).

Checks the database readiness endpoint, the SPA shell and the public catalog.
When SMOKE_EMAIL and SMOKE_PASSWORD are both set, it also signs in, reads the
current user and signs out. It never prints a password or a cookie value.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

TIMEOUT_SECONDS = 30


def request(base_url: str, path: str, method: str = "GET", body: dict | None = None,
            cookie: str | None = None) -> tuple[int, str, str | None]:
    url = f"{base_url.rstrip('/')}{path}"
    data = json.dumps(body).encode() if body is not None else None
    headers = {"Accept": "text/html,application/json"}
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Origin"] = base_url.rstrip("/")
    if cookie:
        headers["Cookie"] = cookie
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as response:
            return response.status, response.read().decode("utf-8", "replace"), response.headers.get("Set-Cookie")
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode("utf-8", "replace"), error.headers.get("Set-Cookie")
    except urllib.error.URLError as error:
        print(f"connection error for {path}: {error.reason}")
        return 0, "", None


def check(name: str, condition: bool, detail: str = "") -> bool:
    print(f"{'PASS' if condition else 'FAIL'} {name}{(' — ' + detail) if detail else ''}")
    return condition


def main() -> int:
    if len(sys.argv) != 2:
        print("usage: smoke_test.py <service-url>", file=sys.stderr)
        return 2
    base_url = sys.argv[1]
    print(f"Smoke test against {base_url}")
    ok = True

    status, body, _ = request(base_url, "/api/ready")
    ok &= check("readiness", status == 200 and '"ready"' in body, f"HTTP {status}")

    status, body, _ = request(base_url, "/login")
    ok &= check("spa shell", status == 200 and "<div id=\"root\"" in body, f"HTTP {status}")

    status, body, _ = request(base_url, "/api/equipment")
    ok &= check("catalog api", status == 200, f"HTTP {status}")

    email = os.environ.get("SMOKE_EMAIL", "").strip()
    password = os.environ.get("SMOKE_PASSWORD", "")
    if email and password:
        status, body, set_cookie = request(
            base_url, "/api/auth/login", method="POST",
            body={"username": email, "password": password},
        )
        ok &= check("login", status == 200, f"HTTP {status}")
        cookie = (set_cookie or "").split(";", 1)[0]
        if cookie:
            status, body, _ = request(base_url, "/api/auth/me", cookie=cookie)
            ok &= check("authenticated /api/auth/me", status == 200 and email in body, f"HTTP {status}")
            status, _, _ = request(base_url, "/api/auth/logout", method="POST", cookie=cookie)
            ok &= check("logout", status in (200, 204), f"HTTP {status}")
        else:
            ok &= check("session cookie", False, "no cookie returned")
    else:
        print("SKIP login (SMOKE_EMAIL / SMOKE_PASSWORD not both set)")

    print("SMOKE TEST PASSED" if ok else "SMOKE TEST FAILED")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
