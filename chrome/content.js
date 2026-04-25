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
            if (!currentPrice)
                return sendResponse({ success: false, error: 'Không tìm thấy giá' });

            let adjustedPrice = 0;
            const priceNum = parseFloat(currentPrice);

            // ========================
            // BASE PRICE: first | highest | lowest | average (5 record gần nhất)
            // ========================
            let basePrice = priceNum;
            if (['highest', 'lowest', 'average'].includes(request.priceSource)) {
                const agg = getAggregateFromRecent(request.priceSource, 5);
                if (agg === null) {
                    return sendResponse({ success: false, error: 'Không tìm thấy giá gần nhất' });
                }
                basePrice = agg;
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
                    // Giá hiện tại - N tick
                    limitVal = (priceNum - subtractNum * 1e-8).toFixed(8);
                } else if (['lowest', 'highest', 'average'].includes(request.reverseType)) {
                    // Aggregate 5 giá gần nhất, trừ thêm N tick
                    const agg = getAggregateFromRecent(request.reverseType, 5);
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
                currentPrice: priceNum.toFixed(8),
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
function getAggregateFromRecent(type, n) {
    const recent = getLatestPrices(n).map(parseFloat).filter(x => !isNaN(x));
    if (recent.length === 0) return null;
    if (type === 'highest') return Math.max(...recent);
    if (type === 'lowest') return Math.min(...recent);
    if (type === 'average') return recent.reduce((a, b) => a + b, 0) / recent.length;
    return null;
}