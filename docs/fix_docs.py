import re, pathlib

files = ["docs/02-instalasi.md", "docs/06-kebijakan-privasi.md"]

for f in files:
    p = pathlib.Path(f)
    t = p.read_bytes().decode("utf-8").replace("\r\n", "\n")
    rusak = t.count("\x07") + t.count("\x08") + len(re.findall(r"\r", t))

    # 1. pagar blok kode
    t = re.sub(r"(?m)^`\x08?ash[ \t]*$", "```bash", t)
    t = re.sub(r"(?m)^`env[ \t]*$", "```env", t)
    t = re.sub(r"(?m)^`[ \t]*$", "```", t)

    # 2. huruf yang berubah jadi karakter kontrol
    t = t.replace("\x08", "b").replace("\x07", "a").replace("\r", "r")

    p.write_bytes(t.encode("utf-8"))
    print(f, "-> karakter rusak diperbaiki:", rusak)