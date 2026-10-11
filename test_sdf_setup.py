"""Credential handoff tests; no database, server or disposable-stack reset."""

import json
import unittest
from unittest.mock import patch

from sdf_setup import Session


class SessionCredentialsTests(unittest.TestCase):
    def test_exports_changed_password_for_both_setup_browser_accounts(self):
        for email in ("ref-manager@sdf.test", "stock-manager@sdf.test"):
            with self.subTest(email=email):
                accounts = {email: {"host": "sdf-alpha.localhost", "temporary_password": "old-fixture"}}
                replies = [
                    {"challenge_id": "otp", "sandbox_code": "123456"},
                    {"status": "PASSWORD_CHANGE_REQUIRED", "challenge_id": "change"},
                    {"status": "SIGNED_IN", "access_token": "test-token"},
                ]
                with patch.object(Session, "_auth", side_effect=replies) as auth:
                    session = Session("sdf-alpha.localhost", email, "old-fixture", browser_accounts=accounts)
                saved = json.loads(json.dumps(accounts))[email]
                changed = auth.call_args_list[2].args[1]["new_password"]
                self.assertNotEqual(saved["temporary_password"], "old-fixture")
                self.assertEqual(saved["temporary_password"], changed)
                self.assertEqual(session.current_password, changed)
                self.assertEqual(saved["host"], "sdf-alpha.localhost")

    def test_keeps_valid_password_when_no_change_is_required(self):
        accounts = {}
        with patch.object(Session, "_auth", side_effect=[
            {"challenge_id": "otp", "sandbox_code": "123456"},
            {"status": "SIGNED_IN", "access_token": "test-token"},
        ]) as auth:
            Session("sdf-alpha.localhost", "ref-manager@sdf.test", "current-fixture", browser_accounts=accounts)
        self.assertEqual(auth.call_count, 2)
        self.assertEqual(accounts["ref-manager@sdf.test"]["temporary_password"], "current-fixture")

    def test_failed_password_change_does_not_publish_a_credential(self):
        account = {"host": "sdf-alpha.localhost", "temporary_password": "old-fixture"}
        accounts = {"ref-manager@sdf.test": dict(account)}
        with patch.object(Session, "_auth", side_effect=[
            {"challenge_id": "otp", "sandbox_code": "123456"},
            {"status": "PASSWORD_CHANGE_REQUIRED", "challenge_id": "change"},
            SystemExit("auth password/forced-change failed: 503"),
        ]):
            with self.assertRaises(SystemExit):
                Session("sdf-alpha.localhost", "ref-manager@sdf.test", "old-fixture", browser_accounts=accounts)
        self.assertEqual(accounts["ref-manager@sdf.test"], account)


if __name__ == "__main__":
    unittest.main()
