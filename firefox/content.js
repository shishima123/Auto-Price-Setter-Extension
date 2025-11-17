chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'setPrice') {
        try {
            const currentPrice = getLatestPrice();

            if (!currentPrice) {
                sendResponse({success: false, error: 'Không tìm thấy giá'});
                return true;
            }

            // Calculate adjusted price
            const adjustedPrice = parseFloat(currentPrice) * (1 + request.percent / 100);

            // Set price
            const priceInput = document.getElementById('limitPrice');
            if (priceInput) {
                // Use comma as decimal separator
                const priceStr = adjustedPrice.toFixed(8).replace('.', ',');
                priceInput.value = priceStr;

                // Trigger input event
                priceInput.dispatchEvent(new Event('input', { bubbles: true }));
                priceInput.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                sendResponse({success: false, error: 'Không tìm thấy input giá'});
                return true;
            }

            // Set amount if provided
            if (request.amount) {
                const amountInput = document.getElementById('limitAmount');
                if (amountInput) {
                    // Use comma as decimal separator
                    const amountStr = request.amount.replace('.', ',');
                    amountInput.value = amountStr;

                    // Trigger input event
                    amountInput.dispatchEvent(new Event('input', { bubbles: true }));
                    amountInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }

            sendResponse({
                success: true,
                currentPrice: parseFloat(currentPrice).toFixed(8),
                adjustedPrice: adjustedPrice.toFixed(8)
            });
        } catch (error) {
            sendResponse({success: false, error: error.message});
        }
        return true;
    }
});

function getLatestPrice() {
    // 1️⃣ Tìm phần tử chứa text "Giao dịch lệnh Limit"
    const limitTitle = Array.from(document.querySelectorAll('div, span'))
        .find(el => el.textContent.trim() === 'Giao dịch lệnh Limit');

    if (!limitTitle) return null;

    // 2️⃣ Từ phần tiêu đề, tìm container chính bao quanh bảng giá
    const container = limitTitle.closest('.text-PrimaryText');
    if (!container) return null;

    // 3️⃣ Tìm phần có role="grid" hoặc class chứa "ReactVirtualized"
    const grid = container.querySelector('[role="grid"], .ReactVirtualized__Grid__innerScrollContainer');
    if (!grid) return null;

    // 4️⃣ Tìm các dòng dữ liệu trong grid
    const rows = grid.querySelectorAll('.flex.items-center');
    if (!rows.length) return null;

    // 5️⃣ Lấy giá từ dòng đầu tiên (ô thứ 2 thường là giá)
    const firstRow = rows[0];
    const priceCell = firstRow.querySelectorAll('div')[1];
    if (!priceCell) return null;

    // 6️⃣ Trả về giá dạng số
    const priceText = priceCell.textContent.trim().replace(',', '.');
    return priceText;
}