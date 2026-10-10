"""
SD-F disposable environment for the SETUP-DRIVEN-1 end-to-end gate (setup-driven-1-scope §4).

Backend code: a detached git worktree at the given SHA (SDF_BACKEND env var, default 4b3fb25).
Database: the repo's disposable gate stack (PostgreSQL 16 + PgBouncer, 127.0.0.1 only),
recreated from scratch with a fresh database `insurance_sdf`.
Secrets: generated here, written only to secrets/; never printed.

Fixture list (approved by reviewer):
  Tenant alpha, Tenant beta, Alpha branch (NBO),
  9 accounts (ref-manager, quoter, checker, cert-issuer, stock-manager,
              renewal-maker, settings-maker, settings-publisher, outsider),
  Motor product WITH reference_fields (make, model),
  Legacy motor product WITHOUT reference_fields,
  Insurer + agreement, Certificate type, Usable certificate stock,
  Two bound renewable policies (within the default 90-day window),
  No underwriting referral on the journey-3 product.

Outputs: secrets/accounts.json (temporary passwords), facts.json (non-secret fixture IDs).
"""

import base64
import json
import os
import secrets
import subprocess
import sys
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo

import psycopg2
import requests

HERE = Path(__file__).resolve().parent
SECRETS = HERE / "secrets"
BASELINE = os.environ.get("SDF_BACKEND", "4b3fb25")
WORKTREE = HERE / f"backend-{BASELINE}"
REPO = Path(r"D:\Projects\Insurance\Insurance\backend")
COMPOSE = REPO / "docker" / "wf1-gate.compose.yml"
DB_NAME = "insurance_sdf"
PG_PORT, BOUNCER_PORT = "55433", "56432"
SERVER = "http://127.0.0.1:8000"
REASON = "SD-F end-to-end gate (disposable environment)"

ALPHA = {"key": "alpha", "name": "SDF Alpha Insurance", "slug": "sdf_alpha", "schema": "tenant_sdf_alpha",
         "domain": "sdf-alpha.localhost", "branches": [("NBO", "Nairobi", True)]}
BETA = {"key": "beta", "name": "SDF Beta Assurance", "slug": "sdf_beta", "schema": "tenant_sdf_beta",
        "domain": "sdf-beta.localhost", "branches": [("KSM", "Kisumu", True)]}

# (email, branch, scope_all?, access_profiles [(profile, branch_or_None)], workflow_roles, browser?)
ALPHA_USERS = [
    ("builder@sdf.test", "NBO", True, [("PILOT_POLICY_SETUP", None)], [], False),
    ("publisher@sdf.test", "NBO", True, [("PILOT_SETUP_CHECKER", None)], [], False),
    ("ref-manager@sdf.test", "NBO", True, [("REFERENCE_DATA_MANAGER", None)], [], True),
    ("quoter@sdf.test", "NBO", False, [("NEW_BUSINESS_MAKER", "NBO")], [], True),
    ("checker@sdf.test", "NBO", False, [("NEW_BUSINESS_CHECKER", "NBO")], [], True),
    ("cert-issuer@sdf.test", "NBO", False, [("CERTIFICATE_ISSUER", "NBO")], [], True),
    ("stock-manager@sdf.test", "NBO", False, [("CERTIFICATE_STOCK_MANAGER", "NBO")], [], True),
    ("renewal-maker@sdf.test", "NBO", False, [("RENEWAL_MAKER", "NBO")], [], True),
    ("settings-maker@sdf.test", "NBO", True, [], [], True),
    ("settings-publisher@sdf.test", "NBO", True, [], [], True),
    ("outsider@sdf.test", "NBO", False, [], [], True),
]
BETA_USERS = [("beta.user@sdf.test", "KSM", False, [], [], True)]

MOTOR = {
    "rounding_places": 2,
    "cover_sections": [{"code": "OWN_DAMAGE", "name": "Own damage"},
                       {"code": "THIRD_PARTY", "name": "Third party liability"}],
    "benefits": [{"code": "WINDSCREEN", "name": "Windscreen", "section": "OWN_DAMAGE", "limit_amount": "50000"},
                 {"code": "RADIO", "name": "Radio cassette", "section": "OWN_DAMAGE", "limit_amount": "30000",
                  "is_optional": True}],
    "exclusions": [{"code": "RACING", "section": "OWN_DAMAGE", "text": "Racing, pace-making or speed testing."},
                   {"code": "WAR", "text": "War, invasion and civil commotion."}],
    "required_documents": [{"code": "LOGBOOK", "name": "Logbook copy", "stage": "ISSUANCE"},
                           {"code": "VALUATION", "name": "Valuation report", "stage": "QUOTATION",
                            "is_mandatory": False}],
    "rating_factors": [
        {"code": "sum_insured", "name": "Sum insured", "data_type": "DECIMAL", "min_value": "100000", "unit": "KES"},
        {"code": "vehicle_use", "name": "Use", "data_type": "CHOICE", "choices": ["PRIVATE", "COMMERCIAL"]},
        {"code": "vehicle_age", "name": "Vehicle age", "data_type": "DECIMAL", "min_value": "0", "max_value": "40",
         "unit": "years"},
        {"code": "has_tracker", "name": "Tracking device", "data_type": "BOOLEAN", "is_required": False},
    ],
    "rate_tables": [
        {"code": "BASIC", "name": "Basic rates", "result": "RATE_PERCENT", "dimensions": ["vehicle_use", "vehicle_age"],
         "rows": [{"match": {"vehicle_use": "PRIVATE", "vehicle_age": {"from": "0", "to": "5"}}, "value": "4"},
                  {"match": {"vehicle_use": "PRIVATE", "vehicle_age": {"from": "5"}}, "value": "5"},
                  {"match": {"vehicle_use": "COMMERCIAL", "vehicle_age": {"from": "0", "to": "20"}}, "value": "6"}]},
    ],
    "rating_steps": [
        {"code": "BASIC", "step_type": "RATE_ON_FACTOR", "table": "BASIC", "base_factor": "sum_insured"},
        {"code": "COMMERCIAL_LOAD", "step_type": "ADJUST_PERCENT", "value": "10",
         "when": {"factor": "vehicle_use", "value": "COMMERCIAL"}},
        {"code": "TRACKER", "step_type": "ADJUST_PERCENT", "value": "-5", "when": {"factor": "has_tracker", "value": "true"}},
        {"code": "MINIMUM", "step_type": "MINIMUM_PREMIUM", "value": "37500"},
    ],
    "reference_fields": [
        {"code": "make", "name": "Make", "reference": "VEHICLE_MAKE", "is_required": True},
        {"code": "model", "name": "Model", "reference": "VEHICLE_MODEL", "is_required": True},
    ],
}

MOTOR_LEGACY = {
    "rounding_places": 2,
    "cover_sections": [{"code": "OWN_DAMAGE", "name": "Own damage"},
                       {"code": "THIRD_PARTY", "name": "Third party liability"}],
    "benefits": [{"code": "WINDSCREEN", "name": "Windscreen", "section": "OWN_DAMAGE", "limit_amount": "50000"}],
    "exclusions": [{"code": "WAR", "text": "War, invasion and civil commotion."}],
    "required_documents": [{"code": "LOGBOOK", "name": "Logbook copy", "stage": "ISSUANCE"}],
    "rating_factors": [
        {"code": "sum_insured", "name": "Sum insured", "data_type": "DECIMAL", "min_value": "100000", "unit": "KES"},
        {"code": "vehicle_use", "name": "Use", "data_type": "CHOICE", "choices": ["PRIVATE", "COMMERCIAL"]},
        {"code": "vehicle_age", "name": "Vehicle age", "data_type": "DECIMAL", "min_value": "0", "max_value": "40",
         "unit": "years"},
    ],
    "rate_tables": [
        {"code": "BASIC", "name": "Basic rates", "result": "RATE_PERCENT", "dimensions": ["vehicle_use", "vehicle_age"],
         "rows": [{"match": {"vehicle_use": "PRIVATE", "vehicle_age": {"from": "0", "to": "5"}}, "value": "4"},
                  {"match": {"vehicle_use": "PRIVATE", "vehicle_age": {"from": "5"}}, "value": "5"},
                  {"match": {"vehicle_use": "COMMERCIAL", "vehicle_age": {"from": "0", "to": "20"}}, "value": "6"}]},
    ],
    "rating_steps": [
        {"code": "BASIC", "step_type": "RATE_ON_FACTOR", "table": "BASIC", "base_factor": "sum_insured"},
        {"code": "MINIMUM", "step_type": "MINIMUM_PREMIUM", "value": "37500"},
    ],
}


# --------------------------------------------------------------------------- shell

def run(*cmd, cwd=None, env=None, check=True):
    result = subprocess.run(cmd, cwd=cwd, env=env, text=True, capture_output=True)
    if check and result.returncode != 0:
        sys.exit(f"FAILED: {' '.join(map(str, cmd[:4]))} ...\n{result.stderr[-2000:]}")
    return result


def key32() -> str:
    return base64.b64encode(secrets.token_bytes(32)).decode()


def write_env() -> dict:
    SECRETS.mkdir(parents=True, exist_ok=True)
    env = {
        "DJANGO_SETTINGS_MODULE": "config.settings", "APP_ENVIRONMENT": "development", "DJANGO_DEBUG": "false",
        "DJANGO_ALLOWED_HOSTS": ".localhost,127.0.0.1",
        "DJANGO_SECRET_KEY": "sdf-" + secrets.token_urlsafe(48),
        "DB_NAME": DB_NAME, "DB_HOST": "127.0.0.1", "DB_PORT": PG_PORT,
        "DB_OWNER_USER": "insurance_owner", "DB_APP_ROLE": "insurance_app", "DB_APP_USER": "insurance_app",
        "DB_AUTH_ROLE": "insurance_auth", "DB_AUTH_USER": "insurance_auth",
        "DB_POOL_HOST": "127.0.0.1", "DB_POOL_PORT": BOUNCER_PORT,
        "AUTH_SIGNING_KEYS": "sdf1:" + secrets.token_urlsafe(48), "AUTH_SIGNING_KEY_ID": "sdf1",
        "AUTH_OTP_SANDBOX": "true", "AUTH_COOKIE_SECURE": "false",
        "AUTH_ACCESS_TOKEN_SECONDS": "20", "AUTH_SESSION_SECONDS": "3600",
        "CRYPTO_ENCRYPTION_KEYS": "e1:" + key32(), "CRYPTO_ENCRYPTION_KEY_ID": "e1",
        "CRYPTO_FINGERPRINT_KEYS": "f1:" + key32(), "CRYPTO_FINGERPRINT_KEY_ID": "f1",
        "DOCUMENT_GATEWAY_BASE_URL": "https://documents.sdf.invalid",
        "DOCUMENT_URL_SIGNING_KEY": secrets.token_urlsafe(48),
        "PYTHONPATH": ".",
    }
    (SECRETS / "backend.env").write_text("".join(f"{k}={v}\n" for k, v in env.items()), encoding="utf-8")
    return env


def manage(env, *args) -> str:
    return run(sys.executable, "manage.py", *args, cwd=WORKTREE, env={**os.environ, **env}).stdout


def result_json(text: str) -> dict:
    lines = text.splitlines()
    start = next(i for i, line in enumerate(lines) if line == "{")
    end = next(i for i in range(start, len(lines)) if lines[i] == "}")
    return json.loads(chr(10).join(lines[start:end + 1]))


# --------------------------------------------------------------------------- the API

class Session:
    def __init__(self, host: str, email: str, temporary_password: str):
        self.host, self.http, self.token = host, requests.Session(), None
        challenge = self._auth("login", {"email": email, "password": temporary_password})
        result = self._auth("otp/verify", {"challenge_id": challenge["challenge_id"], "code": challenge["sandbox_code"]})
        if result["status"] == "PASSWORD_CHANGE_REQUIRED":
            result = self._auth("password/forced-change", {"challenge_id": result["challenge_id"],
                                                          "new_password": f"Sdf-{secrets.token_urlsafe(12)}-Aa1!"})
        assert result["status"] == "SIGNED_IN", result["status"]
        self.token = result["access_token"]

    def _auth(self, path, body):
        response = self.http.post(f"{SERVER}/api/v1/auth/{path}", json=body, headers={"Host": self.host})
        if response.status_code != 200:
            sys.exit(f"auth {path} failed: {response.status_code} {response.json().get('error', {}).get('code')}")
        return response.json()

    def call(self, method, path, body=None, *, if_match=None, expect=(200, 201)):
        for attempt in (1, 2):
            headers = {"Host": self.host, "Authorization": f"Bearer {self.token}"}
            if method != "GET":
                headers["X-Idempotency-Key"] = str(uuid.uuid4())
            if if_match:
                headers["If-Match"] = if_match
            response = self.http.request(method, f"{SERVER}/api/v1/{path}", json=body if method != "GET" else None,
                                         headers=headers)
            if response.status_code == 401 and attempt == 1:
                self.token = self._auth("refresh", {})["access_token"]
                continue
            break
        if response.status_code not in expect:
            sys.exit(f"{method} {path} -> {response.status_code}: {json.dumps(response.json())[:800]}")
        return response.json() if response.content else {}, response.headers.get("ETag")

    def get(self, path):
        return self.call("GET", path)[0]

    def etag(self, path):
        return self.call("GET", path)[1]

    def post(self, path, body=None, **kw):
        return self.call("POST", path, body or {}, **kw)[0]


def tenant_today() -> str:
    return datetime.now(ZoneInfo("Africa/Nairobi")).date().isoformat()


def build_policy(s: Session, checker: Session, branch: str, insurer_id: str, product_id: str,
                 agreement_id: str, *, inception_offset_days: int = 0) -> dict:
    """Build a quotation → proposal → policy chain. inception_offset_days shifts inception into the
    past so the policy expires sooner (for renewable policies within the renewal window)."""
    tag = lambda: uuid.uuid4().hex[:8].upper()  # noqa: E731
    today = tenant_today()
    inception = (datetime.fromisoformat(today) - timedelta(days=inception_offset_days)).date().isoformat()

    customer = s.post("clients", {
        "customer_type": "INDIVIDUAL", "home_branch_id": branch,
        "profile": {"first_name": f"Driver-{tag()[:4]}", "last_name": f"Test-{tag()[:4]}"},
        "contacts": [{"type": "MOBILE", "value": f"07{uuid.uuid4().int % 10**8:08d}"}],
        "identifiers": [{"identifier_type": "NATIONAL_ID", "value": f"{uuid.uuid4().int % 90_000_000 + 10_000_000}"}]})
    cpath = f"clients/{customer['id']}"
    for target in ("IN_PROGRESS", "PENDING_VERIFICATION"):
        s.call("PATCH", cpath, {"kyc_status": target}, if_match=s.etag(cpath))
    (identifier,) = checker.get(f"{cpath}/identifiers")["results"]
    checker.call("PATCH", f"{cpath}/identifiers/{identifier['id']}", {"verification_status": "VERIFIED",
                                                                      "verification_source": "IPRS"})
    assert checker.call("PATCH", cpath, {"kyc_status": "VERIFIED"}, if_match=checker.etag(cpath))[0]["kyc_status"] == "VERIFIED"

    q = s.post("quotations", {"customer_id": customer["id"], "branch_id": branch, "product_id": product_id,
                              "risk": {"factors": {"sum_insured": "1000000", "vehicle_use": "PRIVATE", "vehicle_age": 3,
                                                   "has_tracker": True},
                                       "details": {"make": "SETUP-MAKE", "model": "SETUP-MODEL"},
                                       "identifiers": [{"identifier_type": "VEHICLE_REGISTRATION",
                                                        "value": f"KD{tag()[:1]} {uuid.uuid4().int % 1000:03d}P"}]}})
    qpath = f"quotations/{q['id']}"
    for action in ("price", "issue", "accept"):
        s.post(f"{qpath}/{action}", {}, if_match=s.etag(qpath))

    p = s.post("underwriting/proposals", {"quotation_id": q["id"], "agreement_id": agreement_id,
                                          "proposed_inception_date": inception})
    ppath = f"underwriting/proposals/{p['id']}"
    s.post(f"{ppath}/submit", {}, if_match=s.etag(ppath))
    ready = s.post(f"{ppath}/requirements/LOGBOOK/satisfy", {"evidence_reference": "LOGBOOK-COPY-1"},
                   if_match=s.etag(ppath))
    assert ready["status"] == "READY_TO_BIND", ready["status"]
    policy = s.post("policies", {"proposal_id": p["id"]}, if_match=s.etag(ppath))
    result = s.get(f"policies/{policy['id']}")
    return {**result, "_customer_id": customer["id"]}


# --------------------------------------------------------------------------- main

def main():
    # 1. Backend worktree
    if not WORKTREE.exists():
        run("git", "-C", str(REPO), "worktree", "add", "--detach", str(WORKTREE), BASELINE)
    head = run("git", "-C", str(WORKTREE), "rev-parse", "--short", "HEAD").stdout.strip()
    assert head == BASELINE, f"expected {BASELINE}, got {head}"
    assert not run("git", "-C", str(WORKTREE), "status", "--porcelain").stdout.strip(), "worktree not clean"
    print(f"backend worktree: {WORKTREE} @ {head} (clean)")

    # 2. Fresh disposable stack
    run("docker", "compose", "-f", str(COMPOSE), "down", "-v")
    run("docker", "compose", "-f", str(COMPOSE), "up", "-d", "--wait")
    print("gate stack: recreated (PostgreSQL 16 + PgBouncer, 127.0.0.1:55433/56432)")
    conn = psycopg2.connect(host="127.0.0.1", port=PG_PORT, user="postgres", dbname="postgres")
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("""DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'insurance_owner') THEN CREATE ROLE insurance_owner LOGIN; END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'insurance_app') THEN CREATE ROLE insurance_app LOGIN NOINHERIT; END IF;
            IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'insurance_auth') THEN CREATE ROLE insurance_auth LOGIN NOINHERIT; END IF;
            END $$;""")
        cur.execute(f'CREATE DATABASE "{DB_NAME}" OWNER insurance_owner')
    conn.close()
    env = write_env()
    manage(env, "migrate_schemas", "--shared", "--verbosity", "0")
    print("public schema: migrated")

    # 3. Operator commands: plan, tenants, branches, users, access
    plan = result_json(manage(env, "setup_plan", "--code", "SDF", "--name", "SD-F gate plan",
                             "--modules", "clients,insurers,products,quotations,underwriting,policies,certificates",
                             "--reason", REASON))
    print(f"plan SDF: {plan.get('status')}")

    temporary, browser_accounts, facts = {}, {}, {}
    for tenant, users in ((ALPHA, ALPHA_USERS), (BETA, BETA_USERS)):
        out = result_json(manage(env, "provision_tenant", "--name", tenant["name"], "--slug", tenant["slug"],
                                "--schema", tenant["schema"], "--domain", tenant["domain"], "--plan-code", "SDF",
                                "--reason", REASON, "--verified-domain"))
        tf = facts[tenant["key"]] = {"domain": tenant["domain"], "status": out.get("status"),
                                     "branches": {}, "users": {}}
        for code, name, head_office in tenant["branches"]:
            args = ["setup_branch", "--schema", tenant["schema"], "--code", code, "--name", name, "--reason", REASON]
            if head_office:
                args.append("--head-office")
            branch = result_json(manage(env, *args))
            tf["branches"][code] = branch.get("branch_id") or branch.get("id")
        for email, branch_code, scope_all, profiles, roles, browser in users:
            args = ["onboard_pilot_user", "--schema", tenant["schema"], "--email", email, "--branch",
                    str(tf["branches"][branch_code]), "--reason", REASON]
            if scope_all:
                args += ["--scope", "ALL"]
            raw = manage(env, *args)
            marker = raw.find("\nTEMPORARY PASSWORD")
            result = result_json(raw if marker < 0 else raw[:marker])
            assert marker >= 0, f"no temporary password for {email}"
            temporary[email] = raw[marker:].strip().splitlines()[-1].strip()
            if browser:
                browser_accounts[email] = {"host": tenant["domain"],
                                           "temporary_password": temporary[email]}
            user_id = result["user_id"]
            tf["users"][email] = {"user_id": user_id, "branch": branch_code, "profiles": [], "roles": []}
            for profile, at in profiles:
                pargs = ["setup_tenant_access", "--schema", tenant["schema"], "--user", user_id, "--access-profile",
                         profile, "--reason", REASON]
                if at:
                    pargs += ["--branch", str(tf["branches"][at])]
                manage(env, *pargs)
                tf["users"][email]["profiles"].append(profile if not at else f"{profile}@{at}")
            for role, at in roles:
                rargs = ["assign_workflow_role", "--schema", tenant["schema"], "--user", user_id, "--role", role,
                         "--reason", REASON]
                rargs += ["--branch", str(tf["branches"][at])] if at else ["--scope", "ALL"]
                manage(env, *rargs)
                tf["users"][email]["roles"].append(role if not at else f"{role}@{at}")

    # Permission overrides via direct SQL (no management command for single overrides)
    alpha_schema = ALPHA["schema"]
    override_conn = psycopg2.connect(host="127.0.0.1", port=PG_PORT, user="insurance_owner", dbname=DB_NAME)
    override_conn.autocommit = True
    OVERRIDES = [
        ("settings-maker@sdf.test", ["policies.renewal_settings.manage"]),
        ("settings-publisher@sdf.test", ["products.config.publish", "policies.renewal_settings.manage"]),
        ("outsider@sdf.test", ["policies.policy.view"]),
    ]
    with override_conn.cursor() as cur:
        cur.execute(f"SET search_path TO {alpha_schema}")
        for email, perms in OVERRIDES:
            user_id = facts["alpha"]["users"][email]["user_id"]
            for perm_code in perms:
                cur.execute(
                    "INSERT INTO user_permission_overrides (id, platform_user_id, permission_id, effect, "
                    "reason, effective_from, effective_to) "
                    "SELECT gen_random_uuid(), %s::uuid, p.id, 'ALLOW', %s, current_date, NULL "
                    "FROM permissions p WHERE p.code = %s",
                    [user_id, REASON, perm_code])
                assert cur.rowcount == 1, f"permission {perm_code} not in catalog"
                print(f"  override: {email} += {perm_code}")
    override_conn.close()

    print("operator setup: done")

    # 4. Start the server for API setup
    server = subprocess.Popen([sys.executable, str(HERE / "run_backend.py")], stdout=subprocess.DEVNULL,
                              stderr=open(HERE / "setup-backend.log", "w"))
    try:
        for _ in range(90):
            try:
                requests.get(f"{SERVER}/api/v1/auth/me", headers={"Host": ALPHA["domain"]}, timeout=10)
                break
            except requests.RequestException:
                time.sleep(1)
        else:
            sys.exit("the setup server never answered")

        alpha = facts["alpha"]
        nbo = str(alpha["branches"]["NBO"])
        tag = lambda: uuid.uuid4().hex[:8].upper()  # noqa: E731
        today = tenant_today()

        # Builder (PILOT_POLICY_SETUP) creates insurers/products/customers/policies
        # Publisher (PILOT_SETUP_CHECKER) publishes product versions, verifies KYC
        e = Session(ALPHA["domain"], "builder@sdf.test", temporary["builder@sdf.test"])
        f = Session(ALPHA["domain"], "publisher@sdf.test", temporary["publisher@sdf.test"])

        # Create insurer and insurance class
        insurer = e.post("insurers", {"code": f"INS-{tag()}", "name": "SDF General Insurance",
                                      "insurer_type": "GENERAL"})
        klass = e.post("insurance-classes", {"code": f"MOT-{tag()}", "name": "Motor private", "line": "GENERAL"})

        # Product 1: motor with reference_fields
        product = e.post("products", {"code": f"PRD-{tag()}", "name": "Motor Comprehensive",
                                      "insurer_id": insurer["id"], "insurance_class_id": klass["id"]})
        version = e.post(f"products/{product['id']}/versions")
        vpath = f"products/{product['id']}/versions/{version['id']}"
        e.call("PUT", vpath, MOTOR, if_match=e.etag(vpath))
        f.post(f"{vpath}/publish", {"effective_from": today})
        print(f"product (with reference_fields): {product['name']} [{product['id']}]")

        # Commission rate (needed for agreement/binding)
        rate = e.post("commission-rates", {"insurer_id": insurer["id"], "insurance_class_id": klass["id"],
                                           "rate_percent": "12.5", "effective_from": today})
        f.post(f"commission-rates/{rate['id']}/publish")

        # Agreement (started well in the past so inception_offset_days policies are valid)
        start = (datetime.fromisoformat(today) - timedelta(days=730)).date().isoformat()
        agreement = e.post(f"insurers/{insurer['id']}/agreements", {
            "agreement_type": "AGENCY", "reference_no": f"AG-{uuid.uuid4().hex[:8]}", "effective_from": start})

        # Product 2: legacy motor without reference_fields
        legacy_product = e.post("products", {"code": f"LGC-{tag()}", "name": "Motor Legacy",
                                             "insurer_id": insurer["id"], "insurance_class_id": klass["id"]})
        legacy_version = e.post(f"products/{legacy_product['id']}/versions")
        lvpath = f"products/{legacy_product['id']}/versions/{legacy_version['id']}"
        e.call("PUT", lvpath, MOTOR_LEGACY, if_match=e.etag(lvpath))
        f.post(f"{lvpath}/publish", {"effective_from": today})
        print(f"legacy product (no reference_fields): {legacy_product['name']} [{legacy_product['id']}]")

        # Certificate type (stock-manager has CERTIFICATE_STOCK_MANAGER with products.product.view)
        stock_mgr = Session(ALPHA["domain"], "stock-manager@sdf.test", temporary["stock-manager@sdf.test"])
        cert_type = stock_mgr.post("certificate-types", {"code": f"CT-{tag()}", "name": "Motor certificate",
                                                         "category": "MOTOR", "insurance_class_id": klass["id"]})
        print(f"certificate type: {cert_type['code']} [{cert_type['id']}]")

        # Certificate stock: receive a batch via stock-manager
        batch = stock_mgr.post("certificate-batches", {
            "insurer_id": insurer["id"], "certificate_type_id": cert_type["id"],
            "branch_id": nbo, "prefix": "SDF", "first_number": 1, "last_number": 100, "number_width": 7,
            "delivery_reference": "SDF-GATE-BATCH"})
        print(f"certificate batch: {batch.get('id', 'received')} (SDF0000001–SDF0000100)")

        # Two bound renewable policies using the main product.
        # The product has reference_fields, so pre-create a make/model for the setup risk.
        ref_mgr = Session(ALPHA["domain"], "ref-manager@sdf.test", temporary["ref-manager@sdf.test"])
        setup_make = ref_mgr.post("vehicle-makes", {"code": "SETUP-MAKE", "name": "Setup Make"})
        setup_model = ref_mgr.post(f"vehicle-makes/{setup_make['id']}/models",
                                   {"code": "SETUP-MODEL", "name": "Setup Model"})
        print(f"setup reference data: {setup_make['code']}/{setup_model['code']}")

        # inception 300 days ago → expire in ~65 days (within the default 90-day renewal window)
        print("building renewable policy 1...")
        pol1 = build_policy(e, f, nbo, insurer["id"], product["id"], agreement["id"],
                            inception_offset_days=300)
        expiry1 = pol1.get("current_version", {}).get("cover", {}).get("expiry_date") or \
                  (datetime.fromisoformat(today) - timedelta(days=300) + timedelta(days=365)).date().isoformat()
        print(f"renewable policy 1: {pol1['policy_no']} (expires {expiry1})")

        print("building renewable policy 2...")
        pol2 = build_policy(e, f, nbo, insurer["id"], product["id"], agreement["id"],
                            inception_offset_days=310)
        expiry2 = pol2.get("current_version", {}).get("cover", {}).get("expiry_date") or \
                  (datetime.fromisoformat(today) - timedelta(days=310) + timedelta(days=365)).date().isoformat()
        print(f"renewable policy 2: {pol2['policy_no']} (expires {expiry2})")

        # Build the facts JSON (non-secret fixture IDs)
        alpha["branch_id"] = nbo
        alpha["new_business"] = {"product": product["name"], "insurer": insurer["name"],
                                 "agreement": agreement["reference_no"]}
        alpha["legacy_product"] = {"product": legacy_product["id"], "insurer": insurer["name"]}
        alpha["certificates"] = {"class": {"name": klass["name"], "code": klass["code"]},
                                 "insurer": insurer["name"]}
        alpha["renewable"] = {"policy_no": pol1["policy_no"], "policy_id": pol1["id"],
                              "customer_id": pol1["_customer_id"], "expiry": expiry1}
        alpha["renewable2"] = {"policy_no": pol2["policy_no"], "policy_id": pol2["id"],
                               "customer_id": pol2["_customer_id"], "expiry": expiry2}
    finally:
        server.terminate()
        subprocess.run(["taskkill", "/F", "/T", "/PID", str(server.pid)], capture_output=True)
        for line in subprocess.run(["netstat", "-ano"], capture_output=True, text=True).stdout.splitlines():
            if "127.0.0.1:8000" in line and "LISTENING" in line:
                subprocess.run(["taskkill", "/F", "/PID", line.split()[-1]], capture_output=True)

    # Remove internal keys from facts before writing
    for key in list(facts.get("alpha", {}).keys()):
        if key in ("status", "branches", "users"):
            pass  # keep for debugging but not used by the test
    # Clean up keys the test doesn't need
    clean_facts = {
        "alpha": {
            "domain": alpha["domain"],
            "branch_id": alpha["branch_id"],
            "new_business": alpha["new_business"],
            "legacy_product": alpha["legacy_product"],
            "certificates": alpha["certificates"],
            "renewable": alpha["renewable"],
            "renewable2": alpha["renewable2"],
        },
        "beta": {"domain": facts["beta"]["domain"]},
    }

    (SECRETS / "accounts.json").write_text(json.dumps(browser_accounts, indent=2), encoding="utf-8")
    (HERE / "facts.json").write_text(json.dumps(clean_facts, indent=2, default=str), encoding="utf-8")
    print(json.dumps(clean_facts, indent=2, default=str))
    print(f"temporary passwords captured for {len(browser_accounts)} browser accounts (not shown)")


if __name__ == "__main__":
    main()
