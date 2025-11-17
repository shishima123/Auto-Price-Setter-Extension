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
                let p = priceNum.toFixed(8);
                let parts = p.split('.');
                let decimals = parts[1];
                let arr = decimals.split('').map(d => parseInt(d));

                arr[7] += request.value;

                for (let i = 7; i >= 0; i--) {
                    if (arr[i] > 9) {
                        arr[i] -= 10;
                        if (i > 0) arr[i - 1] += 1;
                    }
                }
                adjustedPrice = parseFloat(parts[0] + "." + arr.join(''));
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
                const limitVal = shrinkDecimal(adjustedPrice);

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
    const limitTitle = Array.from(document.querySelectorAll('div, span'))
        .find(el => el.textContent.trim() === 'Giao dịch lệnh Limit');

    if (!limitTitle) return null;

    const container = limitTitle.closest('.text-PrimaryText');
    if (!container) return null;

    const grid = container.querySelector('[role="grid"], .ReactVirtualized__Grid__innerScrollContainer');
    if (!grid) return null;

    const rows = grid.querySelectorAll('.flex.items-center');
    if (!rows.length) return null;

    const firstRow = rows[0];
    const priceCell = firstRow.querySelectorAll('div')[1];
    if (!priceCell) return null;

    return priceCell.textContent.trim().replace(',', '.');
}
