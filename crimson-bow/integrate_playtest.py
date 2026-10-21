#!/usr/bin/env python3
"""Inject Crimson Bow free-aim overlay into the matching independent v2.3 HTML.
Usage: python integrate_playtest.py yeolhyeol_gung_headshot_skills_playtest_v23.html
Writes a NEW file, leaves input untouched. Does not publish the chatgpt.site app.
"""
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
PATCH = HERE / "aim_motion_patch.js"
REQUIRED = ["const C=document.getElementById('game')",
            "function update(dt)", "function arrowShot(",
            "function touchXY(ev)", "const origin="]
MARKER = "__CRIMSON_AIM_MOTION_V3__"

def build(source):
    html = source.read_text(encoding="utf-8")
    patch = PATCH.read_text(encoding="utf-8")
    missing = [part for part in REQUIRED if part not in html]
    if missing:
        raise ValueError("Unsupported source API: " + ", ".join(missing))
    if MARKER in html:
        raise ValueError("Patch is already present")
    pos = html.lower().rfind("</body>")
    if pos < 0 or html.rfind("</script>", 0, pos) < 0:
        raise ValueError("HTML has no closing script/body")
    output = source.with_name(source.stem + "_aim_motion_v3.html")
    combined = html[:pos] + "<script>\n" + patch + "\n</script>\n" + html[pos:]
    output.write_text(combined, encoding="utf-8")
    return output

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python integrate_playtest.py ORIGINAL_v23.html")
    print(build(Path(sys.argv[1])))
