package main

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"
)

// CP850 high-byte to Unicode mapping (bytes 128–255)
var cp850 = [128]rune{
	0x00C7, 0x00FC, 0x00E9, 0x00E2, 0x00E4, 0x00E0, 0x00E5, 0x00E7,
	0x00EA, 0x00EB, 0x00E8, 0x00EF, 0x00EE, 0x00EC, 0x00C4, 0x00C5,
	0x00C9, 0x00E6, 0x00C6, 0x00F4, 0x00F6, 0x00F2, 0x00FB, 0x00F9,
	0x00FF, 0x00D6, 0x00DC, 0x00F8, 0x00A3, 0x00D8, 0x00D7, 0x0192,
	0x00E1, 0x00ED, 0x00F3, 0x00FA, 0x00F1, 0x00D1, 0x00AA, 0x00BA,
	0x00BF, 0x00AE, 0x00AC, 0x00BD, 0x00BC, 0x00A1, 0x00AB, 0x00BB,
	0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x00C1, 0x00C2, 0x00C0,
	0x00A9, 0x2563, 0x2551, 0x2557, 0x255D, 0x00A2, 0x00A5, 0x2510,
	0x2514, 0x2534, 0x252C, 0x251C, 0x2500, 0x253C, 0x00E3, 0x00C3,
	0x255A, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256C, 0x00A4,
	0x00F0, 0x00D0, 0x00CA, 0x00CB, 0x00C8, 0x0131, 0x00CD, 0x00CE,
	0x00CF, 0x2518, 0x250C, 0x2588, 0x2584, 0x00A6, 0x00CC, 0x2580,
	0x00D3, 0x00DF, 0x00D4, 0x00D2, 0x00F5, 0x00D5, 0x00B5, 0x00FE,
	0x00DE, 0x00DA, 0x00DB, 0x00D9, 0x00FD, 0x00DD, 0x00AF, 0x00B4,
	0x00AD, 0x00B1, 0x2017, 0x00BE, 0x00B6, 0x00A7, 0x00F7, 0x00B8,
	0x00B0, 0x00A8, 0x00B7, 0x00B9, 0x00B3, 0x00B2, 0x25A0, 0x00A0,
}

func decodeCp850(b []byte) string {
	var sb strings.Builder
	sb.Grow(len(b))
	for _, c := range b {
		if c < 128 {
			sb.WriteByte(c)
		} else {
			sb.WriteRune(cp850[c-128])
		}
	}
	return sb.String()
}

type DBFField struct {
	Name    string
	Type    byte // C=Char, N=Numeric, L=Logical, D=Date, M=Memo
	Length  int
	Decimal int
}

type DBFFile struct {
	Fields  []DBFField
	records []map[string]string
}

func OpenDBF(path string) (*DBFFile, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var header [32]byte
	if _, err := io.ReadFull(f, header[:]); err != nil {
		return nil, fmt.Errorf("read header: %w", err)
	}

	recordCount := binary.LittleEndian.Uint32(header[4:8])
	headerSize := binary.LittleEndian.Uint16(header[8:10])
	recordSize := binary.LittleEndian.Uint16(header[10:12])

	var fields []DBFField
	for {
		var fd [32]byte
		if _, err := io.ReadFull(f, fd[:]); err != nil {
			return nil, fmt.Errorf("read field descriptor: %w", err)
		}
		if fd[0] == 0x0D {
			break
		}
		name := strings.TrimRight(string(fd[0:11]), "\x00")
		fields = append(fields, DBFField{
			Name:    strings.TrimSpace(name),
			Type:    fd[11],
			Length:  int(fd[16]),
			Decimal: int(fd[17]),
		})
	}

	if verbose {
		fmt.Printf("    Fields in %s:\n", path)
		for _, fld := range fields {
			fmt.Printf("      %-12s %c(%d,%d)\n", fld.Name, fld.Type, fld.Length, fld.Decimal)
		}
	}

	if _, err := f.Seek(int64(headerSize), io.SeekStart); err != nil {
		return nil, fmt.Errorf("seek to records: %w", err)
	}

	records := make([]map[string]string, 0, recordCount)
	buf := make([]byte, recordSize)

	for i := uint32(0); i < recordCount; i++ {
		if _, err := io.ReadFull(f, buf); err != nil {
			if err == io.EOF || err == io.ErrUnexpectedEOF {
				break
			}
			return nil, fmt.Errorf("read record %d: %w", i, err)
		}
		if buf[0] == '*' {
			continue
		}
		rec := make(map[string]string, len(fields))
		offset := 1
		for _, fld := range fields {
			raw := buf[offset : offset+fld.Length]
			rec[fld.Name] = strings.TrimSpace(decodeCp850(raw))
			offset += fld.Length
		}
		records = append(records, rec)
	}

	return &DBFFile{Fields: fields, records: records}, nil
}

func (d *DBFFile) Records() []map[string]string {
	return d.records
}

// Field access helpers — return zero values for missing fields.

func getString(rec map[string]string, field string) string {
	return rec[field]
}

func getInt(rec map[string]string, field string) int {
	s := rec[field]
	if s == "" {
		return 0
	}
	n, _ := strconv.Atoi(s)
	return n
}

func getFloat(rec map[string]string, field string) float64 {
	s := rec[field]
	if s == "" {
		return 0
	}
	f, _ := strconv.ParseFloat(s, 64)
	return f
}

func getBool(rec map[string]string, field string) bool {
	s := strings.ToUpper(rec[field])
	return s == "T" || s == "Y" || s == "1"
}

func getDate(rec map[string]string, field string) *time.Time {
	s := rec[field]
	if s == "" || s == "00000000" || len(s) < 8 {
		return nil
	}
	t, err := time.Parse("20060102", s[:8])
	if err != nil {
		return nil
	}
	return &t
}

func getDateOrNow(rec map[string]string, field string) time.Time {
	if d := getDate(rec, field); d != nil {
		return *d
	}
	return time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func nullInt(n int) any {
	if n == 0 {
		return nil
	}
	return n
}

func vehKey(phone string, vehno int) string {
	return phone + ":" + strconv.Itoa(vehno)
}

func expandYear(y int) int {
	if y <= 0 || y >= 100 {
		return y
	}
	if y < 50 {
		return y + 2000
	}
	return y + 1900
}
