from pathlib import Path
import sys

# Qaysi fayl turlarini yig'ish kerak
CODE_EXTENSIONS = {
    ".py", ".js", ".ts", ".jsx", ".tsx",
    ".html", ".css",
    ".json", ".md",
    ".bat", ".ps1",
    ".yml", ".yaml",
    ".txt"
}

# Qaysi papkalarni o'tkazib yuborish kerak
EXCLUDE_DIRS = {
    "venv", ".venv", "__pycache__", ".git",
    "node_modules", ".next", "dist", "build",
    "logs", "data", "exports",
    ".idea", ".vscode"
}

# Qaysi fayllarni o'tkazib yuborish kerak
EXCLUDE_FILES = {
    ".env", ".env.local", ".env.production",
    "package-lock.json",
    "all_codes.txt"
}

MAX_FILE_SIZE_MB = 2


def should_skip_file(file_path: Path) -> bool:
    if file_path.name in EXCLUDE_FILES:
        return True

    if file_path.suffix.lower() not in CODE_EXTENSIONS:
        return True

    try:
        size_mb = file_path.stat().st_size / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            return True
    except Exception:
        return True

    return False


def collect_code(project_path: Path, output_file: Path):
    total_files = 0

    with output_file.open("w", encoding="utf-8") as out:
        out.write("LOYIHA KODLARI TO'PLAMI\n")
        out.write("=" * 80 + "\n\n")
        out.write(f"Loyiha papkasi: {project_path}\n\n")

        for file_path in project_path.rglob("*"):
            if file_path.is_dir():
                continue

            # Agar fayl exclude qilingan papka ichida bo'lsa, tashlab ketadi
            if any(part in EXCLUDE_DIRS for part in file_path.parts):
                continue

            if should_skip_file(file_path):
                continue

            try:
                relative_path = file_path.relative_to(project_path)
                content = file_path.read_text(encoding="utf-8", errors="replace")

                out.write("\n" + "=" * 80 + "\n")
                out.write(f"FAYL: {relative_path}\n")
                out.write("=" * 80 + "\n\n")
                out.write(content)
                out.write("\n\n")

                total_files += 1

            except Exception as e:
                out.write("\n" + "=" * 80 + "\n")
                out.write(f"FAYL O'QILMADI: {file_path}\n")
                out.write(f"XATO: {e}\n")
                out.write("=" * 80 + "\n\n")

    print(f"Tayyor! {total_files} ta fayl yig'ildi.")
    print(f"Natija: {output_file}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        project_dir = Path(sys.argv[1]).resolve()
    else:
        project_dir = Path.cwd()

    if not project_dir.exists():
        print("Xato: ko'rsatilgan papka topilmadi.")
        sys.exit(1)

    output = project_dir / "all_codes.txt"
    collect_code(project_dir, output)