"""Offline unit tests for deploy/smoke_test.py (the network is mocked).

Run (repo root):  python3 -m unittest discover -s deploy/tests -p 'test_smoke.py'
CI runs it too (.github/workflows/ci-docker.yml).

Covers: public checks pass + login skipped without credentials (anonymous
/api/equipment must be 401); a DB that is not ready fails even if HTTP answers;
the session is logged out even if a check fails after login.
"""
import importlib.util
from pathlib import Path
import unittest
import urllib.error
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('smoke', Path(__file__).parents[1] / 'smoke_test.py')
smoke = importlib.util.module_from_spec(spec)
spec.loader.exec_module(smoke)


def unauthorized(path):
    return urllib.error.HTTPError(path, 401, 'Unauthorized', None, None)


class SmokeTests(unittest.TestCase):
    def response(self, base, path, data=None, jar=None, **kwargs):
        if path == '/api/equipment':
            raise unauthorized(path)
        return {
            '/api/ready': b'{"status":"ready","db":"connected"}',
            '/login': b'<html></html>',
        }[path]

    def authenticated(self, base, path, data=None, jar=None, **kwargs):
        if path == '/api/equipment':
            if jar is None:
                raise unauthorized(path)
            return b'{"data":[]}'
        return {
            '/api/ready': b'{"status":"ready","db":"connected"}',
            '/login': b'<html></html>',
            '/api/auth/login': b'{"data":{"user":{"id":1,"username":"smoke","role":"BORROWER"}}}',
            '/api/auth/me': b'{"data":{"user":{"id":1,"role":"BORROWER"}}}',
            '/api/auth/logout': b'{}',
        }[path]

    @patch.dict('os.environ', {}, clear=True)
    def test_public_checks_pass_and_skip_optional_login(self):
        with patch.object(smoke, 'request', side_effect=self.response) as req:
            smoke.check('https://demo.test')
            self.assertEqual(req.call_count, 3)

    @patch.dict('os.environ', {}, clear=True)
    def test_db_not_ready_fails_even_when_http_responds(self):
        def disconnected(base, path, **kwargs):
            return b'{"status":"not_ready"}' if path == '/api/ready' else self.response(base, path)
        with patch.object(smoke, 'request', side_effect=disconnected), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/ready'):
                smoke.check('https://demo.test')

    @patch.dict('os.environ', {}, clear=True)
    def test_auth_is_enforced_for_anonymous_equipment_request(self):
        def open_catalog(base, path, **kwargs):
            if path == '/api/equipment':
                return b'{"data":[]}'
            return self.response(base, path)
        with patch.object(smoke, 'request', side_effect=open_catalog), patch.object(smoke.time, 'sleep'):
            with self.assertRaisesRegex(RuntimeError, '/api/equipment'):
                smoke.check('https://demo.test')
    @patch.dict('os.environ', {'SMOKE_USERNAME': 'smoke', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_even_if_me_fails(self):
        def broken_me(base, path, data=None, jar=None, **kwargs):
            if path == '/api/auth/me':
                raise ValueError('Broken response')
            return self.authenticated(base, path, data, jar)
        with patch.object(smoke, 'request', side_effect=broken_me) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')

    @patch.dict('os.environ', {'SMOKE_USERNAME': 'smoke', 'SMOKE_PASSWORD': 'test-only'}, clear=True)
    def test_session_is_logged_out_when_login_response_is_incomplete(self):
        def incomplete_login(base, path, data=None, jar=None, **kwargs):
            if path == '/api/auth/login':
                return b'{"data":{}}'
            return self.authenticated(base, path, data, jar)
        with patch.object(smoke, 'request', side_effect=incomplete_login) as req:
            with self.assertRaisesRegex(RuntimeError, 'Login smoke'):
                smoke.check('https://demo.test')
            self.assertEqual(req.call_args.args[1], '/api/auth/logout')

    @patch.dict('os.environ', {'SMOKE_USERNAME': 'smoke'}, clear=True)
    def test_partial_credentials_are_rejected(self):
        with patch.object(smoke, 'request', side_effect=self.response):
            with self.assertRaisesRegex(RuntimeError, 'both SMOKE_USERNAME'):
                smoke.check('https://demo.test')


if __name__ == '__main__':
    unittest.main()
