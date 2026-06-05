use std::fmt::Write as FmtWrite;
use std::io::{self, Write as IoWrite};

use super::{Cell, CellBuffer, Color, Style};

static CURSOR_HIDE: &[u8] = b"\x1b[?25l";
static CURSOR_SHOW: &[u8] = b"\x1b[?25h";
static CLEAR_ALL: &[u8] = b"\x1b[2J\x1b[H";

#[derive(Default)]
pub struct AnsiWriter {
    last_fg: Option<Color>,
    last_bg: Option<Color>,
    last_attrs: u8,
}

const ATTR_BOLD: u8 = 1;
const ATTR_DIM: u8 = 2;
const ATTR_ITALIC: u8 = 4;
const ATTR_UNDERLINE: u8 = 8;
const ATTR_REVERSE: u8 = 16;
const ATTR_STRIKETHROUGH: u8 = 32;

const SGR_FG: u8 = 38;
const SGR_BG: u8 = 48;
const SGR_FG_DEFAULT: u8 = 39;
const SGR_BG_DEFAULT: u8 = 49;
const SGR_BOLD: u8 = 1;
const SGR_DIM: u8 = 2;
const SGR_ITALIC: u8 = 3;
const SGR_UNDERLINE: u8 = 4;
const SGR_REVERSE: u8 = 7;
const SGR_STRIKETHROUGH: u8 = 9;

fn attrs_bitmask(a: super::TextAttributes) -> u8 {
    let mut mask = 0u8;
    if a.bold { mask |= ATTR_BOLD; }
    if a.dim { mask |= ATTR_DIM; }
    if a.italic { mask |= ATTR_ITALIC; }
    if a.underline { mask |= ATTR_UNDERLINE; }
    if a.reverse { mask |= ATTR_REVERSE; }
    if a.strikethrough { mask |= ATTR_STRIKETHROUGH; }
    mask
}

impl AnsiWriter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn clear_all(stdout: &mut dyn IoWrite) {
        let _ = stdout.write_all(CLEAR_ALL);
        let _ = stdout.flush();
    }

    pub fn hide_cursor(stdout: &mut dyn IoWrite) {
        let _ = stdout.write_all(CURSOR_HIDE);
        let _ = stdout.flush();
    }

    pub fn show_cursor(stdout: &mut dyn IoWrite) {
        let _ = stdout.write_all(CURSOR_SHOW);
        let _ = stdout.flush();
    }

    fn write_color(out: &mut impl FmtWrite, base: u8, color: Color) {
        match color {
            Color::Named(idx) => {
                let code = Self::ansi_16_code(base, idx);
                let _ = write!(out, ";{}", code);
            }
            Color::Rgb(r, g, b) => {
                let _ = write!(out, ";{};2;{};{};{}", base, r, g, b);
            }
            Color::Rgba(_) => {
                let (r, g, b) = color.to_rgb();
                let _ = write!(out, ";{};2;{};{};{}", base, r, g, b);
            }
        }
    }

    fn write_sgr_to(out: &mut dyn IoWrite, style: Style) -> io::Result<()> {
        let mut s = String::with_capacity(64);
        s.push_str("\x1b[0");
        if let Some(fg) = style.fg {
            Self::write_color(&mut s, SGR_FG, fg);
        } else {
            let _ = write!(s, ";{}", SGR_FG_DEFAULT);
        }
        if let Some(bg) = style.bg {
            Self::write_color(&mut s, SGR_BG, bg);
        } else {
            let _ = write!(s, ";{}", SGR_BG_DEFAULT);
        }
        if style.attrs.bold { let _ = write!(s, ";{}", SGR_BOLD); }
        if style.attrs.dim { let _ = write!(s, ";{}", SGR_DIM); }
        if style.attrs.italic { let _ = write!(s, ";{}", SGR_ITALIC); }
        if style.attrs.underline { let _ = write!(s, ";{}", SGR_UNDERLINE); }
        if style.attrs.reverse { let _ = write!(s, ";{}", SGR_REVERSE); }
        if style.attrs.strikethrough { let _ = write!(s, ";{}", SGR_STRIKETHROUGH); }
        s.push('m');
        out.write_all(s.as_bytes())
    }

    fn build_sgr(style: Style) -> String {
        let mut out = String::with_capacity(32);
        out.push_str("\x1b[0");
        if let Some(fg) = style.fg {
            Self::write_color(&mut out, SGR_FG, fg);
        } else {
            let _ = write!(out, ";{}", SGR_FG_DEFAULT);
        }
        if let Some(bg) = style.bg {
            Self::write_color(&mut out, SGR_BG, bg);
        } else {
            let _ = write!(out, ";{}", SGR_BG_DEFAULT);
        }
        if style.attrs.bold { let _ = write!(out, ";{}", SGR_BOLD); }
        if style.attrs.dim { let _ = write!(out, ";{}", SGR_DIM); }
        if style.attrs.italic { let _ = write!(out, ";{}", SGR_ITALIC); }
        if style.attrs.underline { let _ = write!(out, ";{}", SGR_UNDERLINE); }
        if style.attrs.reverse { let _ = write!(out, ";{}", SGR_REVERSE); }
        if style.attrs.strikethrough { let _ = write!(out, ";{}", SGR_STRIKETHROUGH); }
        out.push('m');
        out
    }

    pub fn reset(&mut self) {
        self.last_fg = None;
        self.last_bg = None;
        self.last_attrs = 0;
    }

    pub fn write_buffered(&mut self, output: &mut Vec<u8>, changes: &[super::diff::Change]) {
        if changes.is_empty() {
            return;
        }

        let mut buf = [0u8; 4];
        let mut last_y: Option<u16> = None;
        let mut next_x: Option<u16> = None;

        for change in changes {
            let need_position = last_y != Some(change.y) || next_x != Some(change.x);
            if need_position {
                let _ = write!(output, "\x1b[{};{}H", change.y + 1, change.x + 1);
            }

            let attrs = attrs_bitmask(change.cell.style.attrs);
            let fg_changed = self.last_fg != change.cell.style.fg;
            let bg_changed = self.last_bg != change.cell.style.bg;
            let attrs_changed = self.last_attrs != attrs;

            if fg_changed || bg_changed || attrs_changed {
                Self::write_sgr_to_vec(output, change.cell.style);
                self.last_fg = change.cell.style.fg;
                self.last_bg = change.cell.style.bg;
                self.last_attrs = attrs;
            }

            let ch = if change.cell.ch == '\0' { ' ' } else { change.cell.ch };
            let enc = ch.encode_utf8(&mut buf);
            output.extend_from_slice(enc.as_bytes());
            let w = unicode_width::UnicodeWidthChar::width(ch).unwrap_or(1) as u16;
            last_y = Some(change.y);
            next_x = Some(change.x + w);
        }
    }

    fn write_sgr_to_vec(out: &mut Vec<u8>, style: Style) {
        let mut s = String::with_capacity(64);
        s.push_str("\x1b[0");
        if let Some(fg) = style.fg {
            Self::write_color(&mut s, SGR_FG, fg);
        } else {
            let _ = write!(s, ";{}", SGR_FG_DEFAULT);
        }
        if let Some(bg) = style.bg {
            Self::write_color(&mut s, SGR_BG, bg);
        } else {
            let _ = write!(s, ";{}", SGR_BG_DEFAULT);
        }
        if style.attrs.bold { let _ = write!(s, ";{}", SGR_BOLD); }
        if style.attrs.dim { let _ = write!(s, ";{}", SGR_DIM); }
        if style.attrs.italic { let _ = write!(s, ";{}", SGR_ITALIC); }
        if style.attrs.underline { let _ = write!(s, ";{}", SGR_UNDERLINE); }
        if style.attrs.reverse { let _ = write!(s, ";{}", SGR_REVERSE); }
        if style.attrs.strikethrough { let _ = write!(s, ";{}", SGR_STRIKETHROUGH); }
        s.push('m');
        out.extend_from_slice(s.as_bytes());
    }

    pub fn write(&mut self, stdout: &mut dyn IoWrite, changes: &[super::diff::Change]) -> io::Result<()> {
        if changes.is_empty() {
            return Ok(());
        }

        let mut buf = [0u8; 4];
        let mut last_y: Option<u16> = None;
        let mut next_x: Option<u16> = None;

        for change in changes {
            let need_position = last_y != Some(change.y) || next_x != Some(change.x);
            if need_position {
                write!(stdout, "\x1b[{};{}H", change.y + 1, change.x + 1)?;
            }

            let attrs = attrs_bitmask(change.cell.style.attrs);
            let fg_changed = self.last_fg != change.cell.style.fg;
            let bg_changed = self.last_bg != change.cell.style.bg;
            let attrs_changed = self.last_attrs != attrs;

            if fg_changed || bg_changed || attrs_changed {
                Self::write_sgr_to(stdout, change.cell.style)?;
                self.last_fg = change.cell.style.fg;
                self.last_bg = change.cell.style.bg;
                self.last_attrs = attrs;
            }

            let ch = if change.cell.ch == '\0' { ' ' } else { change.cell.ch };
            let enc = ch.encode_utf8(&mut buf);
            stdout.write_all(enc.as_bytes())?;
            let w = unicode_width::UnicodeWidthChar::width(ch).unwrap_or(1) as u16;
            last_y = Some(change.y);
            next_x = Some(change.x + w);
        }
        stdout.flush()
    }

    pub fn render(buffer: &CellBuffer) -> String {
        let mut out = String::with_capacity((buffer.width() * buffer.height() * 8) as usize);
        let mut last_style: Option<Style> = None;

        for y in 0..buffer.height() {
            for x in 0..buffer.width() {
                let cell = buffer.get(x, y).unwrap_or(&Cell::EMPTY);
                if cell.skip {
                    continue;
                }

                let style_changed = last_style != Some(cell.style);
                if style_changed {
                    let sgr = Self::build_sgr(cell.style);
                    out.push_str(&sgr);
                    last_style = Some(cell.style);
                }

                out.push(if cell.ch == '\0' { ' ' } else { cell.ch });
            }
            if y + 1 < buffer.height() {
                out.push('\n');
            }
        }

        out.push_str("\x1b[0m");
        out
    }

    fn ansi_16_code(base: u8, idx: u8) -> u8 {
        if idx < 8 {
            base - 8 + idx // 38-8+0=30, 38-8+1=31, ..., 38-8+7=37
        } else {
            base + 52 + idx // 38+52+8=90, ..., 38+52+15=97  |  48+52+8=100, ..., 48+52+15=107
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::renderer::diff::Change;
    use crate::renderer::TextAttributes;

    #[test]
    fn test_ansi_writer_new() {
        let w = AnsiWriter::new();
        assert!(w.last_fg.is_none());
        assert!(w.last_bg.is_none());
    }

    #[test]
    fn test_render_empty_buffer() {
        let buf = CellBuffer::new(3, 2);
        let out = AnsiWriter::render(&buf);
        assert!(out.contains("\x1b[0m"));
    }

    #[test]
    fn test_render_single_char() {
        let mut buf = CellBuffer::new(5, 1);
        buf.put(0, 0, Cell::new('A', Style::new().fg(Color::RED)));
        let out = AnsiWriter::render(&buf);
        assert!(out.contains('A'));
        assert!(out.contains("\x1b["));
        assert!(out.ends_with("\x1b[0m"));
    }

    #[test]
    fn test_render_plain_text() {
        let mut buf = CellBuffer::new(10, 1);
        buf.draw_str(0, 0, "hello", Style::new());
        let out = AnsiWriter::render(&buf);
        assert!(out.contains("hello"));
    }

    #[test]
    fn test_render_bold() {
        let mut buf = CellBuffer::new(5, 1);
        buf.put(0, 0, Cell::new('B', Style::new().add_modifier(TextAttributes::bold())));
        let out = AnsiWriter::render(&buf);
        assert!(out.contains(";1"));
    }

    #[test]
    fn test_render_italic() {
        let mut buf = CellBuffer::new(5, 1);
        buf.put(0, 0, Cell::new('I', Style::new().add_modifier(TextAttributes::italic())));
        let out = AnsiWriter::render(&buf);
        assert!(out.contains(";3"));
    }

    #[test]
    fn test_render_underline() {
        let mut buf = CellBuffer::new(5, 1);
        buf.put(0, 0, Cell::new('U', Style::new().add_modifier(TextAttributes::underline())));
        let out = AnsiWriter::render(&buf);
        assert!(out.contains(";4"));
    }

    #[test]
    fn test_render_multiline() {
        let mut buf = CellBuffer::new(5, 3);
        buf.draw_str(0, 0, "aaa", Style::new());
        buf.draw_str(0, 1, "bbb", Style::new());
        buf.draw_str(0, 2, "ccc", Style::new());
        let out = AnsiWriter::render(&buf);
        assert!(out.contains("aaa"));
        assert!(out.contains("bbb"));
        assert!(out.contains("ccc"));
    }

    #[test]
    fn test_render_skip_cells() {
        let mut buf = CellBuffer::new(5, 1);
        let mut cell = Cell::new('X', Style::new());
        cell.skip = true;
        buf.put(0, 0, cell);
        let out = AnsiWriter::render(&buf);
        assert!(!out.contains('X'));
    }

    #[test]
    fn test_render_null_char_replaced() {
        let mut buf = CellBuffer::new(5, 1);
        buf.put(0, 0, Cell::new('\0', Style::new().fg(Color::RED)));
        let out = AnsiWriter::render(&buf);
        assert!(out.contains(' '));
    }

    #[test]
    fn test_write_changes() {
        let mut w = AnsiWriter::new();
        let changes = vec![
            Change { x: 0, y: 0, cell: Cell::new('H', Style::new().fg(Color::RED)) },
            Change { x: 1, y: 0, cell: Cell::new('i', Style::new()) },
        ];
        let mut out = Vec::new();
        w.write(&mut out, &changes).unwrap();
        let s = String::from_utf8(out).unwrap();
        assert!(s.contains('H'));
        assert!(s.contains('i'));
    }

    #[test]
    fn test_write_changes_style_tracking() {
        let mut w = AnsiWriter::new();
        let changes = vec![
            Change { x: 0, y: 0, cell: Cell::new('A', Style::new().fg(Color::RED)) },
            Change { x: 1, y: 0, cell: Cell::new('B', Style::new().fg(Color::BLUE)) },
        ];
        let mut out = Vec::new();
        w.write(&mut out, &changes).unwrap();
        let s = String::from_utf8(out).unwrap();
        // Named RED (index 1) → ANSI 31 for foreground
        assert!(s.contains(";31"));
    }

    #[test]
    fn test_clear_all() {
        let mut out = Vec::new();
        AnsiWriter::clear_all(&mut out);
        let s = String::from_utf8(out).unwrap();
        assert!(s.contains("\x1b[2J"));
        assert!(s.contains("\x1b[H"));
    }

    #[test]
    fn test_hide_cursor() {
        let mut out = Vec::new();
        AnsiWriter::hide_cursor(&mut out);
        let s = String::from_utf8(out).unwrap();
        assert!(s.contains("\x1b[?25l"));
    }

    #[test]
    fn test_show_cursor() {
        let mut out = Vec::new();
        AnsiWriter::show_cursor(&mut out);
        let s = String::from_utf8(out).unwrap();
        assert!(s.contains("\x1b[?25h"));
    }

    #[test]
    fn test_render_bg_color() {
        let mut buf = CellBuffer::new(1, 1);
        buf.put(0, 0, Cell::new('x', Style::new().bg(Color::RED)));
        let mut writer = AnsiWriter::new();
        let mut output = Vec::new();
        let changes = vec![Change { x: 0, y: 0, cell: buf.get(0, 0).unwrap().clone() }];
        writer.write(&mut output, &changes).unwrap();
        let s = String::from_utf8(output).unwrap();
        assert!(s.contains(";41m"));
    }

    #[test]
    fn test_render_fg_and_bg() {
        let mut buf = CellBuffer::new(1, 1);
        buf.put(0, 0, Cell::new('x', Style::new().fg(Color::GREEN).bg(Color::RED)));
        let mut writer = AnsiWriter::new();
        let mut output = Vec::new();
        let changes = vec![Change { x: 0, y: 0, cell: buf.get(0, 0).unwrap().clone() }];
        writer.write(&mut output, &changes).unwrap();
        let s = String::from_utf8(output).unwrap();
        assert!(s.contains(";32;"));
        assert!(s.contains(";41m"));
    }

    #[test]
    fn test_render_all_attributes() {
        let mut buf = CellBuffer::new(1, 1);
        let style = Style::new()
            .fg(Color::WHITE)
            .add_modifier(TextAttributes::bold())
            .add_modifier(TextAttributes::italic())
            .add_modifier(TextAttributes::underline())
            .add_modifier(TextAttributes::dim())
            .add_modifier(TextAttributes::reverse())
            .add_modifier(TextAttributes::strikethrough());
        buf.put(0, 0, Cell::new('x', style));
        let mut writer = AnsiWriter::new();
        let mut output = Vec::new();
        let changes = vec![Change { x: 0, y: 0, cell: buf.get(0, 0).unwrap().clone() }];
        writer.write(&mut output, &changes).unwrap();
        let s = String::from_utf8(output).unwrap();
        assert!(s.contains("1;"));
        assert!(s.contains("3;"));
        assert!(s.contains("4;"));
        assert!(s.contains("2;"));
        assert!(s.contains("7;"));
        assert!(s.contains("9"));
    }

    #[test]
    fn test_write_empty_changes() {
        let mut writer = AnsiWriter::new();
        let mut output = Vec::new();
        writer.write(&mut output, &[]).unwrap();
        assert!(output.is_empty());
    }
}
