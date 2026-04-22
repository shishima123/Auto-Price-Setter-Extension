document.addEventListener('DOMContentLoaded', function () {
    const resultInfo = document.getElementById('resultInfo');
    const currentPriceEl = document.getElementById('currentPrice');
    const adjustedPriceEl = document.getElementById('adjustedPrice');

    const reverseModeEl = document.getElementById('reverseMode');
    const reverseOptions = document.getElementById('reverseOptions');
    const subtractInputWrap = document.getElementById('subtractInputWrap');
    const valueGroup = document.getElementById('valueGroup');

    // Mode cần nhập "value" (percent/fixed) vs mode tự lấy từ record (first/highest)
    function modeNeedsValue(mode) {
        return mode === 'percent' || mode === 'fixed';
    }

    function toggleValueGroup() {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        valueGroup.style.display = modeNeedsValue(mode) ? 'block' : 'none';
    }

    // Toggle hiển thị options khi tích/bỏ tích checkbox
    function toggleReverseOptions() {
        reverseOptions.style.display = reverseModeEl.checked ? 'block' : 'none';
    }

    // Toggle hiển thị input giảm theo đơn vị (dùng cho cả subtract và lowest)
    function toggleSubtractInput() {
        const reverseType = document.querySelector('input[name="reverseType"]:checked').value;
        const needsSubtract = reverseType === 'subtract' || reverseType === 'lowest';
        subtractInputWrap.style.display = needsSubtract ? 'block' : 'none';
    }

    reverseModeEl.addEventListener('change', toggleReverseOptions);
    document.querySelectorAll('input[name="reverseType"]').forEach(function (radio) {
        radio.addEventListener('change', toggleSubtractInput);
    });
    document.querySelectorAll('input[name="mode"]').forEach(function (radio) {
        radio.addEventListener('change', toggleValueGroup);
    });

    chrome.storage.local.get(['mode', 'calcMode', 'value', 'amount', 'total', 'reverseMode', 'reverseType', 'subtractValue'], function (res) {

        if (res.mode)
            document.querySelector(`input[name="mode"][value="${res.mode}"]`).checked = true;

        if (res.calcMode)
            document.querySelector(`input[name="calcMode"][value="${res.calcMode}"]`).checked = true;

        if (res.value) document.getElementById('valueInput').value = res.value;
        if (res.amount) document.getElementById('amountInput').value = res.amount;
        if (res.total) document.getElementById('totalInput').value = res.total;

        if (res.reverseMode) reverseModeEl.checked = true;

        if (res.reverseType)
            document.querySelector(`input[name="reverseType"][value="${res.reverseType}"]`).checked = true;

        if (res.subtractValue) document.getElementById('subtractValue').value = res.subtractValue;

        toggleReverseOptions();
        toggleSubtractInput();
        toggleValueGroup();
    });

    document.getElementById('setPriceBtn').addEventListener('click', function () {

        const mode = document.querySelector('input[name="mode"]:checked').value;
        const calcMode = document.querySelector('input[name="calcMode"]:checked').value;

        const valueStr = document.getElementById('valueInput').value.trim();
        const amount = document.getElementById('amountInput').value.trim();
        const total = document.getElementById('totalInput').value.trim();
        const reverseMode = reverseModeEl.checked;
        const reverseType = document.querySelector('input[name="reverseType"]:checked').value;
        const subtractValueStr = document.getElementById('subtractValue').value.trim();

        const needsValue = modeNeedsValue(mode);
        let value = 0;
        if (needsValue) {
            if (!valueStr) return alert('Vui lòng nhập giá trị!');
            const parsed = parseFloat(valueStr.replace(',', '.'));
            if (isNaN(parsed)) return alert('Giá trị không hợp lệ!');
            value = parsed;
        }

        // Validate subtract value nếu đang chọn mode giảm theo đơn vị hoặc lowest
        if (reverseMode && (reverseType === 'subtract' || reverseType === 'lowest') && subtractValueStr !== '') {
            const sv = subtractValueStr.replace(',', '.');
            if (isNaN(parseFloat(sv))) return alert('Giá trị giảm không hợp lệ!');
        }

        chrome.storage.local.set({
            mode,
            calcMode,
            value: valueStr,
            amount,
            total,
            reverseMode,
            reverseType,
            subtractValue: subtractValueStr
        });

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'setPrice',
                mode,
                calcMode,
                value: value,
                amount,
                total,
                reverseMode,
                reverseType,
                subtractValue: subtractValueStr
            }, function (response) {
                if (response && response.success) {
                    currentPriceEl.textContent = response.currentPrice;
                    adjustedPriceEl.textContent = response.adjustedPrice;
                } else {
                    alert('Lỗi: ' + (response ? response.error : 'Không thể kết nối với trang'));
                }
            });
        });
    });

});