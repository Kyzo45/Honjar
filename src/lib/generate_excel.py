import sys
import json
import openpyxl
import copy
import datetime
import tempfile
import os
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

def format_date_id(date_str):
    months_id = {
        "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "Mei", "06": "Jun",
        "07": "Jul", "08": "Agu", "09": "Sep", "10": "Okt", "11": "Nov", "12": "Des"
    }
    try:
        parts = date_str.split("-")
        day = str(int(parts[2]))
        month = months_id[parts[1]]
        year = parts[0][2:]
        return f"{day} {month} {year}"
    except:
        return date_str

def parse_time(time_str):
    try:
        parts = time_str.split(":")
        return datetime.time(int(parts[0]), int(parts[1]))
    except:
        return time_str

def is_dosen_luar(name):
    name_lower = name.lower()
    luar_keywords = [
        "anggi sandika",
        "aditiyana",
        "amelia",
        "hendy satria",
        "i'oh",
        "iin nurhayati",
        "sonny feisal",
        "sussylawati",
        "tarma"
    ]
    return any(keyword in name_lower for keyword in luar_keywords)

def main():
    try:
        # Baca JSON payload dari stdin
        payload = json.loads(sys.stdin.read())
        
        template_path = r"d:\7. Semester 7\KP\Honjar\File Pendukung\Honjar Mei Tahun 2026 PRODI TLM D4.xlsx"
        if not os.path.exists(template_path):
            print("ERROR: Template file not found", file=sys.stderr)
            sys.exit(1)
            
        wb = openpyxl.load_workbook(template_path)
        
        month_name = payload.get("monthName", "Mei 2026").upper()
        current_date_str = payload.get("currentDate", "8 Juni 2026")
        rows_data = payload.get("rows", [])
        
        # Kelompokkan ke Dosen Tetap dan Dosen Luar
        rows_tetap = []
        rows_luar = []
        
        for r in rows_data:
            if is_dosen_luar(r["dsn"]):
                rows_luar.append(r)
            else:
                rows_tetap.append(r)
                
        # Urutkan: Dosen -> Tanggal -> Jam Mulai
        rows_tetap.sort(key=lambda x: (x["dsn"], x["tgl"], x["a"]))
        rows_luar.sort(key=lambda x: (x["dsn"], x["tgl"], x["a"]))
        
        # Eksekusi untuk masing-masing Sheet
        for sheet_name, data in [("Tetap", rows_tetap), ("Luar", rows_luar)]:
            sheet = wb[sheet_name]
            
            # Ganti periode pada judul di baris 3
            sheet.cell(row=3, column=1).value = f"PERIODE {month_name}"
            
            # Ubah jenis font untuk semua cell di baris 1 s/d 6 menjadi Times New Roman
            for r_idx in range(1, 7):
                for col_idx in range(1, 16):
                    cell = sheet.cell(row=r_idx, column=col_idx)
                    if cell.font:
                        f_copy = copy.copy(cell.font)
                        f_copy.name = "Times New Roman"
                        cell.font = f_copy
            
            # Ambil style formatting dasar dari baris data ke-7 template
            template_styles = []
            for col in range(1, 12):
                cell = sheet.cell(row=7, column=col)
                template_styles.append({
                    'font': copy.copy(cell.font),
                    'alignment': copy.copy(cell.alignment),
                    'fill': copy.copy(cell.fill),
                    'border': copy.copy(cell.border),
                    'number_format': cell.number_format
                })
                
            # Bersihkan seluruh data lama dari baris 7 sampai baris terakhir secara efisien
            sheet.delete_rows(7, sheet.max_row - 6)
                    
            # Tulis data baru mulai baris 7
            current_dsn = ""
            no_counter = 0
            
            start_row = 7
            for i, r in enumerate(data):
                row_num = start_row + i
                
                no_val = None
                if r["dsn"] != current_dsn:
                    no_counter += 1
                    no_val = no_counter
                    current_dsn = r["dsn"]
                
                # Tulis data serta formula Excel
                cell_vals = {
                    1: no_val,                           # NO
                    2: r["dsn"],                         # DOSEN
                    3: format_date_id(r["tgl"]),         # TANGGAL
                    4: parse_time(r["a"]),               # MULAI
                    5: parse_time(r["b"]),               # SELESAI
                    6: f"=VALUE(K{row_num})",            # DURASI
                    7: f"=IF(F{row_num}>=300,6,IF(F{row_num}>=250,5,IF(F{row_num}>=200,4,IF(F{row_num}>=150,3,IF(F{row_num}>=100,2,IF(F{row_num}>=50,1,0))))))", # JUMLAH JAM
                    8: r["mk"],                          # MATA KULIAH
                    9: r["met"],                         # METODE
                    10: r["kls"],                        # KELAS
                    11: f'=TEXT(E{row_num}-D{row_num},"[mm]")' # Hitung Menit (Helper)
                }
                
                for col_idx in range(1, 12):
                    cell = sheet.cell(row=row_num, column=col_idx)
                    cell.value = cell_vals[col_idx]
                    
                    # Salin style template dan ubah font name ke Times New Roman
                    style = template_styles[col_idx - 1]
                    if style['font']:
                        f_copy = copy.copy(style['font'])
                        f_copy.name = "Times New Roman"
                        cell.font = f_copy
                    if style['alignment']: cell.alignment = copy.copy(style['alignment'])
                    if style['fill']: cell.fill = copy.copy(style['fill'])
                    if style['border']: cell.border = copy.copy(style['border'])
                    if style['number_format']: cell.number_format = style['number_format']
            
            # Tulis Tanda Tangan Ka. Prodi di akhir tabel (3 baris setelah data berakhir)
            last_data_row = start_row + len(data) - 1
            if len(data) == 0:
                last_data_row = 6
                
            sig_start = last_data_row + 4
            
            sheet.cell(row=sig_start, column=8).value = f"Cimahi, {current_date_str}"
            sheet.cell(row=sig_start, column=8).font = Font(name="Times New Roman", size=10)
            
            sheet.cell(row=sig_start + 1, column=8).value = "Ka. Prodi TLM D4"
            sheet.cell(row=sig_start + 1, column=8).font = Font(name="Times New Roman", size=10, bold=True)
            
            sheet.cell(row=sig_start + 5, column=8).value = "Gina Khairinisa,M.Imun"
            sheet.cell(row=sig_start + 5, column=8).font = Font(name="Times New Roman", size=10, bold=True)
            
            sheet.cell(row=sig_start + 6, column=8).value = "NID. 4121 282 88"
            sheet.cell(row=sig_start + 6, column=8).font = Font(name="Times New Roman", size=10)
            
        # Simpan ke temp file
        fd, temp_file_path = tempfile.mkstemp(suffix=".xlsx")
        os.close(fd)
        wb.save(temp_file_path)
        
        # Cetak output path ke stdout agar dibaca Next.js
        print(temp_file_path)
        
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
