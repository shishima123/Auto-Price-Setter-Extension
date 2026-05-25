chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if (request.action === 'closeNotification') {
        const selectors = [
            '.bn-notification-close',
            '[aria-label="close"]',
            '.bn-notification [role="button"]'
        ];
        let closeBtns = [];
        for (const sel of selectors) {
            const found = document.querySelectorAll(sel);
            if (found.length) {
                closeBtns = Array.from(found);
                break;
            }
        }

        closeBtns.forEach(btn => {
            if (typeof btn.click === 'function') btn.click();
            const opts = { bubbles: true, cancelable: true, view: window };
            btn.dispatchEvent(new MouseEvent('mousedown', opts));
            btn.dispatchEvent(new MouseEvent('mouseup', opts));
            btn.dispatchEvent(new MouseEvent('click', opts));
        });

        sendResponse({ success: true, count: closeBtns.length });
        return true;
    }

    if (request.action === 'setPrice') {
        try {

            const currentPrice = getLatestPrice();
            const priceNum = currentPrice ? parseFloat(currentPrice) : NaN;
            let adjustedPrice = 0;

            const filterOpts = {
                enabled: !!request.filterNoise,
                sampleSize: request.filterSampleSize,
                thresholdPct: request.filterThreshold
            };

            // ========================
            // BASE PRICE: first | highest | lowest | average | manual
            // ========================
            let basePrice;
            if (request.priceSource === 'manual') {
                const mp = parseFloat((request.manualPrice || '').replace(',', '.'));
                if (isNaN(mp)) {
                    return sendResponse({ success: false, error: 'Giá nhập tay không hợp lệ' });
                }
                basePrice = mp;
            } else if (['highest', 'lowest', 'average'].includes(request.priceSource)) {
                const agg = getAggregateFromRecent(request.priceSource, 5, filterOpts);
                if (agg === null) {
                    return sendResponse({ success: false, error: 'Không tìm thấy giá gần nhất' });
                }
                basePrice = agg;
            } else {
                // first (record đầu) — cần priceNum từ DOM
                if (isNaN(priceNum)) {
                    return sendResponse({ success: false, error: 'Không tìm thấy giá' });
                }
                basePrice = priceNum;
            }

            // ========================
            // ADJUSTMENT: percent | fixed (áp lên basePrice)
            // ========================
            if (request.mode === "percent") {
                adjustedPrice = basePrice * (1 + request.value / 100);
            } else {
                // Fixed = số tick thập phân cuối (1 tick = 1e-8)
                adjustedPrice = basePrice + request.value * 1e-8;
            }

            // ========================
            // SET PRICE
            // ========================
            const priceInput = document.getElementById('limitPrice');
            if (priceInput) {
                priceInput.value = adjustedPrice.toFixed(8).replace('.', ',');
                priceInput.dispatchEvent(new Event('input', { bubbles: true }));
                priceInput.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // ========================
            // FIND TWO limitTotal INPUTS
            // ========================
            const totalInputs = document.querySelectorAll('#limitTotal');
            const mainTotalInput = totalInputs[0] || null;
            const reverseTotalInput = totalInputs[1] || null;

            // ========================
            // PHƯƠNG THỨC TÍNH
            // ========================
            if (request.calcMode === "total") {

                // ✓ USER CHỌN "TỔNG TIỀN"
                if (mainTotalInput && request.total !== "") {
                    mainTotalInput.value = request.total.replace('.', ',');
                    mainTotalInput.dispatchEvent(new Event('input', { bubbles: true }));
                    mainTotalInput.dispatchEvent(new Event('change', { bubbles: true }));
                }

            } else {

                // ✓ USER CHỌN "SỐ LƯỢNG COIN"
                const amountInput = document.getElementById('limitAmount');
                if (amountInput && request.amount) {
                    amountInput.value = request.amount.replace('.', ',');
                    amountInput.dispatchEvent(new Event('input', { bubbles: true }));
                    amountInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            // ========================
            // LỆNH ĐẢO NGƯỢC
            // ========================
            if (request.reverseMode) {
                let limitVal;
                const subtractNum = parseFloat((request.subtractValue || '0').replace(',', '.')) || 0;

                if (request.reverseType === 'subtract') {
                    // Giá hiện tại - N tick (fallback về basePrice nếu không scrape được)
                    const refPrice = isNaN(priceNum) ? basePrice : priceNum;
                    limitVal = (refPrice - subtractNum * 1e-8).toFixed(8);
                } else if (['lowest', 'highest', 'average'].includes(request.reverseType)) {
                    // Aggregate 5 giá gần nhất, trừ thêm N tick
                    const agg = getAggregateFromRecent(request.reverseType, 5, filterOpts);
                    if (agg === null) {
                        return sendResponse({ success: false, error: 'Không tìm thấy giá gần nhất' });
                    }
                    limitVal = (agg - subtractNum * 1e-8).toFixed(8);
                } else {
                    // shrink: số thập phân gần nhất của adjustedPrice (logic cũ)
                    limitVal = shrinkDecimal(adjustedPrice);
                }

                if (reverseTotalInput) {
                    reverseTotalInput.value = limitVal.replace('.', ',');
                    reverseTotalInput.dispatchEvent(new Event('input', { bubbles: true }));
                    reverseTotalInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            sendResponse({
                success: true,
                currentPrice: basePrice.toFixed(8),
                adjustedPrice: adjustedPrice.toFixed(8)
            });

        } catch (e) {
            sendResponse({ success: false, error: e.message });
        }

        return true;
    }
});

// ========================
// shrinkDecimal FUNCTION
// ========================
function shrinkDecimal(num) {
    const [int, dec] = num.toFixed(8).split('.');
    let idx = dec.search(/[1-9]/);
    if (idx === -1) return "0";
    return int + "." + dec.slice(0, idx + 1);
}

// ========================
// GET LATEST PRICE(S) (BINANCE)
// ========================
function getLatestPrices(n = 1) {
    const grids = document.querySelectorAll('.ReactVirtualized__Grid__innerScrollContainer');
    if (!grids.length) return [];

    for (const grid of grids) {
        const container = grid.closest('.w-full.h-full');
        if (!container) continue;

        const header = container.querySelector(
            '.flex.items-center.justify-between.gap-1.text-TertiaryText'
        );
        if (!header) continue;

        const cols = header.querySelectorAll('div');
        if (cols.length < 3) continue;

        const colTime = cols[0].textContent.trim();
        const colPrice = cols[1].textContent.trim();
        const colAmount = cols[2].textContent.trim();

        const isTradeHeader =
            colTime.includes('Thời gian') &&
            colPrice.includes('Giá') &&
            colPrice.includes('USDT') &&
            colAmount.startsWith('Số lượng');

        if (!isTradeHeader) continue;

        const rows = grid.querySelectorAll('div[role="gridcell"]');
        if (!rows.length) return [];

        const prices = [];
        const limit = Math.min(n, rows.length);
        for (let i = 0; i < limit; i++) {
            const cells = rows[i].querySelectorAll('div');
            if (cells.length < 2) continue;
            prices.push(cells[1].textContent.trim().replace(',', '.'));
        }
        return prices;
    }

    return [];
}

function getLatestPrice() {
    return getLatestPrices(1)[0] || null;
}

// Tính aggregate (highest/lowest/average) từ N giá gần nhất. Trả về null nếu không có giá.
// filterOpts: { enabled, sampleSize, thresholdPct } — nếu enabled, lấy sampleSize giá thay vì n,
// rồi bỏ những giá lệch hơn thresholdPct% so với median trước khi tính.
function getAggregateFromRecent(type, n, filterOpts) {
    let sampleSize = n;
    let thresholdPct = null;
    if (filterOpts && filterOpts.enabled) {
        const ns = parseInt(filterOpts.sampleSize, 10);
        const tp = parseFloat(String(filterOpts.thresholdPct || '').replace(',', '.'));
        if (!isNaN(ns) && ns >= 1) sampleSize = ns;
        if (!isNaN(tp) && tp >= 0) thresholdPct = tp;
    }

    const recent = getLatestPrices(sampleSize).map(parseFloat).filter(x => !isNaN(x));
    if (recent.length === 0) return null;

    let cleaned = recent;
    if (thresholdPct !== null) {
        const sorted = recent.slice().sort((a, b) => a - b);
        const mid = sorted.length / 2;
        const median = sorted.length % 2 ? sorted[Math.floor(mid)] : (sorted[mid - 1] + sorted[mid]) / 2;
        if (median !== 0) {
            const limit = thresholdPct / 100;
            const filtered = recent.filter(p => Math.abs(p - median) / Math.abs(median) <= limit);
            // Fallback: nếu filter loại sạch tất cả thì dùng lại danh sách gốc để không return null
            if (filtered.length > 0) cleaned = filtered;
        }
    }

    if (type === 'highest') return Math.max(...cleaned);
    if (type === 'lowest') return Math.min(...cleaned);
    if (type === 'average') return cleaned.reduce((a, b) => a + b, 0) / cleaned.length;
    return null;
}