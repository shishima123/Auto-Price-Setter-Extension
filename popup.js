document.addEventListener('DOMContentLoaded', function() {
    const resultInfo = document.getElementById('resultInfo');
    const currentPriceEl = document.getElementById('currentPrice');
    const adjustedPriceEl = document.getElementById('adjustedPrice');

    // Load saved values
    chrome.storage.local.get(['percent', 'amount'], function(result) {
        if (result.percent) document.getElementById('percentInput').value = result.percent;
        if (result.amount) document.getElementById('amountInput').value = result.amount;
    });

    // Set price button
    document.getElementById('setPriceBtn').addEventListener('click', function() {
        const percentStr = document.getElementById('percentInput').value.trim();
        const amount = document.getElementById('amountInput').value.trim();

        // Convert comma to dot for decimal
        const percent = percentStr.replace(',', '.');

        if (!percent) {
            alert('Vui lòng nhập phần trăm điều chỉnh!');
            return;
        }

        if (isNaN(parseFloat(percent))) {
            alert('Phần trăm không hợp lệ!');
            return;
        }

        // Save values
        chrome.storage.local.set({
            percent: percentStr,
            amount: amount
        });

        // Send message to content script
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'setPrice',
                percent: parseFloat(percent),
                amount: amount
            }, function(response) {
                if (response && response.success) {
                    // Update display with actual prices
                    currentPriceEl.textContent = response.currentPrice;
                    adjustedPriceEl.textContent = response.adjustedPrice;
                    showResult('✓ Đã thay đổi giá thành công!', true);
                } else {
                    alert('Lỗi: ' + (response ? response.error : 'Không thể kết nối với trang'));
                }
            });
        });
    });

    function showResult(message, success) {
        resultInfo.style.display = 'block';
        resultInfo.style.backgroundColor = success ? '#f5f5f5' : '#ffe5e5';
        resultInfo.querySelector('div:first-child').textContent = message;

        if (!success) {
            currentPriceEl.textContent = '--';
            adjustedPriceEl.textContent = '--';
        }
    }
});