document.addEventListener('DOMContentLoaded', function () {
    const resultInfo = document.getElementById('resultInfo');
    const currentPriceEl = document.getElementById('currentPrice');
    const adjustedPriceEl = document.getElementById('adjustedPrice');

    chrome.storage.local.get(['mode', 'calcMode', 'value', 'amount', 'total', 'reverseMode'], function (res) {

        if (res.mode)
            document.querySelector(`input[name="mode"][value="${res.mode}"]`).checked = true;

        if (res.calcMode)
            document.querySelector(`input[name="calcMode"][value="${res.calcMode}"]`).checked = true;

        if (res.value) document.getElementById('valueInput').value = res.value;
        if (res.amount) document.getElementById('amountInput').value = res.amount;
        if (res.total) document.getElementById('totalInput').value = res.total;
        if (res.reverseMode) document.getElementById('reverseMode').checked = true;
    });

    document.getElementById('setPriceBtn').addEventListener('click', function () {

        const mode = document.querySelector('input[name="mode"]:checked').value;
        const calcMode = document.querySelector('input[name="calcMode"]:checked').value;

        const valueStr = document.getElementById('valueInput').value.trim();
        const amount = document.getElementById('amountInput').value.trim();
        const total = document.getElementById('totalInput').value.trim();
        const reverseMode = document.getElementById('reverseMode').checked;

        if (!valueStr) return alert('Vui lòng nhập giá trị!');

        const value = valueStr.replace(',', '.');
        if (isNaN(parseFloat(value))) return alert('Giá trị không hợp lệ!');

        chrome.storage.local.set({
            mode,
            calcMode,
            value: valueStr,
            amount,
            total,
            reverseMode
        });

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'setPrice',
                mode,
                calcMode,
                value: parseFloat(value),
                amount,
                total,
                reverseMode
            }, function (response) {
                if (response && response.success) {
                    currentPriceEl.textContent = response.currentPrice;
                    adjustedPriceEl.textContent = response.adjustedPrice;
                    resultInfo.style.display = "block";
                } else {
                    alert('Lỗi: ' + (response ? response.error : 'Không thể kết nối với trang'));
                }
            });
        });
    });

});
