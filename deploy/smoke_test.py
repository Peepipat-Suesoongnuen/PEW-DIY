"""Public deployment checks for PEW-DIY. Credentials/cookies are never printed.

WHAT THIS SCRIPT DOES
    Called by .github/workflows/deploy.yml after a deployment (Episode 7):
        python3 deploy/smoke_test.py SERVICE_URL
    It checks the live service and exits non-zero (failing the workflow) if any
    check fails. Each public check is retried up to 5 times, 3 seconds apart, to
    tolerate Cloud Run cold starts.

    Checks (in order)
      1. GET /api/ready        -> {"status": "ready", "db": "connected"}
      2. GET /login            -> HTML (the built SPA shell is served)
      3. GET /api/equipment    -> 401 without a session (auth is enforced; the
                                  access restriction required by C-04)
      4. OPTIONAL login test   -> login, /api/auth/me, GET /api/equipment and
                                  logout. Runs only if BOTH env vars
                                  SMOKE_USERNAME and SMOKE_PASSWORD are set
                                  (set both or neither). The session is always
                                  logged out, even if a check fails.

IMPORTANT
    Uses only the Python standard library (no pip install needed).
    Offline unit tests: deploy/tests/test_smoke.py
    The app uses an HttpOnly cookie session, so a cookie jar is used; the
    cookie value is never printed.

REFERENCES
    - urllib.request   : https://docs.python.org/3/library/urllib.request.html
    - http.cookiejar   : https://docs.python.org/3/library/http.cookiejar.html
    - unittest.mock    : https://docs.python.org/3/library/unittest.mock.html
"""
import http.cookiejar
import json
import os
import sys
import time
import urllib.error
import urllib.request


# --- HTTP helper --------------------------------------------------------------
# Returns the response body (bytes). Raises on HTTP errors / timeouts.
# `jar` carries the session cookie for the optional login check.
def request(base, path, data=None, jar=None):
    headers = {}
    if data is not None:
        headers['Content-Type'] = 'application/json'
    payload = json.dumps(data).encode() if data is not None else None
    req = urllib.request.Request(base + path, headers=headers, data=payload)
    if jar is not None:
        opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
        with opener.open(req, timeout=30) as response:
            return response.read()
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def _retry(base, path, predicate, jar=None):
    """Retries a predicate until it passes; raises RuntimeError after 5 tries."""
    for attempt in range(5):
        try:
            if predicate(request(base, path, jar=jar)):
                return
        except (urllib.error.URLError, TimeoutError, ValueError):
            pass
        if attempt == 4:
            raise RuntimeError('Smoke check failed: ' + path) from None
        time.sleep(3)


def _status(base, path):
    """Returns the HTTP status code without raising for 4xx responses."""
    try:
        request(base, path)
        return 200
    except urllib.error.HTTPError as error:
        return error.code
    except (urllib.error.URLError, TimeoutError):
        return None


def _retry_status(base, path, expected):
    """Retries until `path` answers with `expected` (used for the 401 check)."""
    for attempt in range(5):
        if _status(base, path) == expected:
            return
        if attempt == 4:
            raise RuntimeError('Smoke check failed: ' + path) from None
        time.sleep(3)


def check(base):
    # --- Public checks --------------------------------------------------------
    checks = (
        ('/api/ready', lambda b: json.loads(b).get('status') == 'ready'
            and json.loads(b).get('db') == 'connected'),
        ('/login', lambda b: b'<html' in b.lower()),
    )
    for path, predicate in checks:
        _retry(base, path, predicate)
        print('PASS ' + path)

    # Anonymous catalog access must be refused (auth enforced; C-04 restriction).
    _retry_status(base, '/api/equipment', 401)
    print('PASS /api/equipment (401 without a session)')

    # --- Optional login check (only when both credentials are provided) -------
    username, password = os.getenv('SMOKE_USERNAME'), os.getenv('SMOKE_PASSWORD')
    if bool(username) != bool(password):
        raise RuntimeError('Set both SMOKE_USERNAME and SMOKE_PASSWORD, or neither.')
    if not username:
        print('SKIP login: optional smoke credentials not configured')
        return

    jar = http.cookiejar.CookieJar()
    logged_in = False
    try:
        login = json.loads(request(
            base, '/api/auth/login', {'username': username, 'password': password}, jar=jar))
        role = login['data']['user']['role']
        logged_in = True
        request(base, '/api/auth/me', jar=jar)
        catalog = json.loads(request(base, '/api/equipment', jar=jar))
        if not isinstance(catalog.get('data'), list):
            raise ValueError('Unexpected equipment response')
        print('PASS login (role ' + str(role) + '), /api/auth/me and /api/equipment')
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError, TypeError):
        raise RuntimeError('Login smoke check failed') from None
    finally:
        # Always end the session, even when a check above failed.
        if logged_in:
            request(base, '/api/auth/logout', data={}, jar=jar)
            print('PASS logout')


# --- Entry point ----------------------------------------------------------------
if __name__ == '__main__':
    if len(sys.argv) != 2:
        sys.exit('Usage: python3 deploy/smoke_test.py SERVICE_URL')
    check(sys.argv[1].rstrip('/'))
