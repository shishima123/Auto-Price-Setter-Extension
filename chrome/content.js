chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {

    if (request.action === 'setPrice') {
        try {

            const currentPrice = getLatestPrice();
            if (!currentPrice)
                return sendResponse({ success: false, error: 'Không tìm thấy giá' });

            let adjustedPrice = 0;
            const priceNum = parseFloat(currentPrice);

            // ========================
            // MODE % / FIXED
            // ========================
            if (request.mode === "percent") {
                adjustedPrice = priceNum * (1 + request.value / 100);
            } else {
                // Fixed = số tick thập phân cuối (1 tick = 1e-8)
                adjustedPrice = priceNum + request.value * 1e-8;
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

                if (request.reverseType === 'subtract') {
                    // Giảm theo đơn vị tick: giá hiện tại - n * 1e-8
                    const subtractNum = parseFloat((request.subtractValue || '0').replace(',', '.'));
                    const reversePrice = priceNum - subtractNum * 1e-8;
                    limitVal = reversePrice.toFixed(8);
                } else {
                    // Số thập phân gần nhất (logic cũ)
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
// GET LATEST PRICE (BINANCE)
// ========================
function getLatestPrice() {
    // Lấy tất cả grid của ReactVirtualized
    const grids = document.querySelectorAll('.ReactVirtualized__Grid__innerScrollContainer');
    if (!grids.length) return null;

    for (const grid of grids) {
        // Tìm container bao quanh grid này
        const container = grid.closest('.w-full.h-full');
        if (!container) continue;

        // Tìm hàng header: Thời gian / Giá (USDT) / Số lượng (...)
        const header = container.querySelector(
            '.flex.items-center.justify-between.gap-1.text-TertiaryText'
        );
        if (!header) continue;

        const cols = header.querySelectorAll('div');
        if (cols.length < 3) continue;

        const colTime = cols[0].textContent.trim();
        const colPrice = cols[1].textContent.trim();
        const colAmount = cols[2].textContent.trim();

        // Kiểm tra đúng panel "Các giao dịch"
        const isTradeHeader =
            colTime.includes('Thời gian') &&
            colPrice.includes('Giá') &&
            colPrice.includes('USDT') &&
            colAmount.startsWith('Số lượng');

        if (!isTradeHeader) continue;

        // Đến đây thì chắc chắn đây là panel "Các giao dịch" đúng
        const firstRow = grid.querySelector('div[role="gridcell"]');
        if (!firstRow) return null;

        const cells = firstRow.querySelectorAll('div');
        if (cells.length < 2) return null;

        const rawPrice = cells[1].textContent.trim();

        // Đổi , -> . cho chắc (phòng trường hợp locale khác)
        const normalized = rawPrice.replace(',', '.');

        return normalized;
    }

    // Nếu không tìm được grid nào khớp header
    return null;
}