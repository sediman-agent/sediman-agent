//! Scroll utilities for the TUI.

use crate::app::App;

/// Scroll up by a specified amount (show older content).
pub fn scroll_up(app: &mut App, amount: u16) {
    // Don't cap at a fixed max - let rendering code handle bounds
    // This allows smooth scrolling without getting stuck
    app.scroll_offset = app.scroll_offset.saturating_add(amount);
    app.auto_scroll = false;
}

/// Scroll down by a specified amount (show newer content).
pub fn scroll_down(app: &mut App, amount: u16) {
    app.scroll_offset = app.scroll_offset.saturating_sub(amount);
    app.auto_scroll = false;
}
