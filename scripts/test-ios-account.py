#!/usr/bin/env python3
"""Test an explicitly provided demo account without putting credentials in source."""
import argparse
import os
from pathlib import Path
import re
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("device", help="UUID of the dedicated test-account simulator")
parser.add_argument("--email-file", type=Path, required=True)
parser.add_argument("--password-file", type=Path, required=True)
parser.add_argument("--output", type=Path, required=True)
args = parser.parse_args()
email = args.email_file.read_text().strip()
password = args.password_file.read_text().rstrip("\r\n")
if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email) or not password or "\n" in password:
    raise SystemExit("Expected a plain email address and a single-line password in the two files.")
root = Path(__file__).resolve().parents[1]
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=False)
environment = {**os.environ, "TEST_RUNNER_AUDIT_ACCOUNT": "1",
               "TEST_RUNNER_AUDIT_EMAIL": email, "TEST_RUNNER_AUDIT_PASSWORD": password}
command = ["xcodebuild", "-project", str(root / "tests/ios/AffectionPlusUITests.xcodeproj"),
           "-scheme", "AffectionPlusUITests", "-configuration", "Release",
           "-destination", f"platform=iOS Simulator,id={args.device}",
           "-derivedDataPath", str(output.parent / "UITestAccount"),
           "-resultBundlePath", str(output / "results.xcresult"),
           "-parallel-testing-enabled", "NO", "-collect-test-diagnostics", "never", "-hideShellScriptEnvironment",
           "-only-testing:AffectionPlusUITests/AffectionPlusUITests/testAccountSignIn", "test"]
with (output / "xcodebuild.log").open("w") as log:
    process = subprocess.Popen(command, env=environment, stdout=subprocess.PIPE,
                               stderr=subprocess.STDOUT, text=True)
    for line in process.stdout:
        log.write(line.replace(password, "[REDACTED]").replace(email, "[DEMO ACCOUNT]"))
        log.flush()
    code = process.wait()
print(f"Account test {'passed' if code == 0 else 'failed'}; log: {output / 'xcodebuild.log'}")
raise SystemExit(code)
