import sys
import json
import re
import openpyxl

# Kata kunci header (dicocokkan case-insensitive, tanpa spasi/tanda baca) untuk
# menebak kolom NIM/Nama/Angkatan dari berkas Excel manapun yang diupload — tidak
# berasumsi baris/kolom tetap, karena tiap unduhan dari sistem akademik bisa beda
# posisi (ada judul, baris kosong, dsb) seperti pada contoh format resmi. Kolom
# Kelas (kalau ada di berkas) sengaja tidak dipakai — kepesertaan kelas diatur
# langsung per mata kuliah, bukan atribut tetap pada mahasiswa.
HEADER_KEYWORDS = {
    "nim": ["nim"],
    "nama": ["nama", "namamahasiswa"],
    "angkatan": ["angkatan", "angk", "angg", "thangkatan"],
}


def normalize(s):
    if s is None:
        return ""
    return re.sub(r"[^a-z0-9]", "", str(s).strip().lower())


def cell_to_str(value):
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def find_header_row(sheet, max_scan=20):
    for r in range(1, min(max_scan, sheet.max_row) + 1):
        for c in range(1, sheet.max_column + 1):
            if normalize(sheet.cell(row=r, column=c).value) == "nim":
                return r
    return None


def build_column_map(sheet, header_row):
    col_map = {}
    for c in range(1, sheet.max_column + 1):
        header_val = normalize(sheet.cell(row=header_row, column=c).value)
        for field, keywords in HEADER_KEYWORDS.items():
            if field in col_map:
                continue
            if header_val in keywords:
                col_map[field] = c
    return col_map


def main():
    try:
        # Catatan penting: setiap kasus error di bawah ini SENGAJA tidak diikuti
        # sys.exit(1). Kalau exit code-nya bukan 0, Node (execFile di route
        # import-preview) menganggap prosesnya gagal total dan MEMBUANG stdout —
        # padahal pesan error yang berguna ini justru ditulis ke stdout supaya
        # bisa langsung di-JSON.parse oleh route-nya. Exit 0 di sini penting
        # supaya pesannya benar-benar sampai ke pengguna, bukan pesan generik
        # "Command failed: ...".
        if len(sys.argv) < 2:
            print(json.dumps({"error": "Path berkas tidak diberikan"}))
            return

        file_path = sys.argv[1]
        wb = openpyxl.load_workbook(file_path, data_only=True)
        sheet = wb.active

        header_row = find_header_row(sheet)
        if header_row is None:
            print(json.dumps({"error": "Kolom NIM tidak ditemukan di berkas ini. Pastikan ada kolom berjudul 'NIM'."}))
            return

        col_map = build_column_map(sheet, header_row)
        if "nim" not in col_map:
            print(json.dumps({"error": "Kolom NIM tidak ditemukan di berkas ini."}))
            return

        rows = []
        for r in range(header_row + 1, sheet.max_row + 1):
            nim_val = cell_to_str(sheet.cell(row=r, column=col_map["nim"]).value)
            nama_val = cell_to_str(sheet.cell(row=r, column=col_map.get("nama", 0)).value) if "nama" in col_map else ""
            angkatan_val = cell_to_str(sheet.cell(row=r, column=col_map.get("angkatan", 0)).value) if "angkatan" in col_map else ""

            # Baris kosong (tidak ada NIM maupun nama) dianggap akhir data
            if not nim_val and not nama_val:
                continue

            rows.append({
                "nim": nim_val,
                "nama": nama_val,
                "angkatan": angkatan_val,
            })

        print(json.dumps({"rows": rows}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    main()
