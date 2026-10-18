#!/usr/bin/env python3
"""Exercise hot Dynamic Type changes without restarting the app or losing a draft."""
import argparse
import os
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument("device", help="UUID of a dedicated, booted iOS simulator")
parser.add_argument("--output", type=Path, required=True, help="New result directory")
args = parser.parse_args()
root = Path(__file__).resolve().parents[1]
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=False)


def size(value=None):
    command = ["xcrun", "simctl", "ui", args.device, "content_size"]
    if value:
        command.append(value)
    return subprocess.check_output(command, text=True).strip()


original = size()
changed = restored = False
try:
    size("large")
    command = [
        "xcodebuild", "-project", str(root / "tests/ios/AffectionPlusUITests.xcodeproj"),
        "-scheme", "AffectionPlusUITests", "-configuration", "Release",
        "-destination", f"platform=iOS Simulator,id={args.device}",
        "-derivedDataPath", str(output.parent / "UITestDerived"),
        "-resultBundlePath", str(output / "results.xcresult"),
        "-parallel-testing-enabled", "NO", "-collect-test-diagnostics", "never",
        "-only-testing:AffectionPlusUITests/AffectionPlusUITests/testDynamicTypeHotChange", "test",
    ]
    environment = {**os.environ, "TEST_RUNNER_AUDIT_DYNAMIC_TYPE": "1"}
    with (output / "xcodebuild.log").open("w") as log:
        process = subprocess.Popen(command, env=environment, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True, bufsize=1)
        for line in process.stdout:
            log.write(line)
            log.flush()
            if "FONT_CHANGE_READY" in line and not changed:
                size("accessibility-large")
                changed = True
                print("Dynamic Type enlarged while the form is open.", flush=True)
            elif "FONT_RESTORE_READY" in line and not restored:
                size("large")
                restored = True
                print("Dynamic Type restored while the form is open.", flush=True)
        code = process.wait()
    if code or not (changed and restored):
        raise SystemExit(f"Dynamic Type test failed; see {output / 'xcodebuild.log'}")
    print(f"Dynamic Type hot-change test passed: {output / 'results.xcresult'}")
finally:
    size(original)
