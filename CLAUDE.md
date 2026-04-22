# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A browser extension that reads the latest trade price from Binance Spot's Vietnamese UI and writes an adjusted price / amount / total into the limit-order form. No build system, no tests, no package manager — pure HTML/JS loaded unpacked.

## Loading the extension

- **Chrome / Brave / Edge**: open `chrome://extensions/`, enable Developer Mode, "Load unpacked" → select [chrome/](chrome/).
- **Firefox**: open `about:debugging` → "This Firefox" → "Load Temporary Add-on" → select [firefox/manifest.json](firefox/manifest.json).

After editing files, click the reload icon on the extension card in `chrome://extensions/` (or re-load the temporary add-on in Firefox) — there is no hot reload.

## Two targets kept in parallel

[chrome/](chrome/) and [firefox/](firefox/) are **independent copies of the same extension**, not a shared source with platform shims. When changing behavior in one, mirror the change in the other unless the feature is platform-specific.

Known divergences to watch for:
- Chrome is MV3 (service worker [chrome/background.js](chrome/background.js)) with an `Alt+S` keyboard command. Firefox is MV2 (`browser_action`) with no background script and no shortcut.
- Chrome's content script supports `reverseType: 'subtract'` (tick-based reverse price). Firefox only implements the older `shrinkDecimal` path. See [chrome/content.js:66-84](chrome/content.js#L66-L84) vs [firefox/content.js:66-74](firefox/content.js#L66-L74).
- Version numbers in the two `manifest.json` files drift — bump both when releasing.

## Runtime architecture

Message flow on a "Set Price" action:

1. **popup.js** reads radio/input values, persists them via `chrome.storage.local`, then `chrome.tabs.sendMessage(..., { action: 'setPrice', ... })` to the active tab's content script.
2. **content.js** (runs on `<all_urls>`) handles `setPrice`:
   - `getLatestPrice()` scrapes the Binance trade panel (see "DOM scraping" below).
   - Computes `adjustedPrice` — either `price * (1 + value/100)` for `mode: 'percent'` or `price + value * 1e-8` for `mode: 'fixed'` (1 "fixed unit" = one tick at the 8th decimal).
   - Writes to the limit form by element ID: `#limitPrice`, `#limitAmount`, `#limitTotal`. **Important**: there are two `#limitTotal` elements on the page (duplicate IDs in Binance's DOM) — `querySelectorAll('#limitTotal')[0]` is the main leg, `[1]` is the reverse leg.
   - After setting each value, dispatches both `input` and `change` events with `bubbles: true` — required for Binance's React inputs to register the value.
3. **background.js** (chrome only) listens for the `set-price` command (`Alt+S`), pulls the last-used settings from `chrome.storage.local`, and sends the same `setPrice` message to the active tab. It does **not** re-read popup state, so the popup must have saved to storage at least once.

Values stored in `chrome.storage.local`: `mode`, `calcMode`, `value`, `amount`, `total`, `reverseMode`, `reverseType`, `subtractValue`. Popup restores from these on open; background dispatches from these on hotkey.

## DOM scraping is locale- and markup-dependent

[getLatestPrice()](chrome/content.js#L113) is the fragile part. It:

- Iterates every `.ReactVirtualized__Grid__innerScrollContainer` on the page.
- Rejects any grid whose header row does **not** contain the Vietnamese strings `"Thời gian"`, `"Giá"`, `"USDT"`, and `"Số lượng"` — this filter is how the right panel ("Các giao dịch") is identified among multiple virtualized grids.
- Reads the first `div[role="gridcell"]`, takes the second inner `div` as the price cell, and normalizes `","` → `"."`.

Implications:
- Switching Binance's UI language breaks detection. Keep the header-matching strings in sync if localization support is added.
- Binance UI changes to grid/header class names (`ReactVirtualized__Grid__innerScrollContainer`, `.flex.items-center.justify-between.gap-1.text-TertiaryText`, `.w-full.h-full`) will also break it. When debugging "Không tìm thấy giá", inspect those selectors first.
- Values are written back with `.replace('.', ',')` because the UI expects Vietnamese decimal formatting.

## Reverse order logic

When `reverseMode` is on, the extension writes a second value into the second `#limitTotal` element:
- `reverseType: 'shrink'` — `shrinkDecimal(adjustedPrice)` truncates to the first non-zero decimal (e.g. `0.00032099` → `0.0003`). See [chrome/content.js:103-108](chrome/content.js#L103-L108).
- `reverseType: 'subtract'` (chrome only) — `priceNum - subtractValue * 1e-8`, i.e. subtract N ticks from the **original** price, not from the adjusted price.
