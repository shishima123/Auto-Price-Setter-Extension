document.addEventListener('DOMContentLoaded', function () {
    const resultInfo = document.getElementById('resultInfo');
    const currentPriceEl = document.getElementById('currentPrice');
    const adjustedPriceEl = document.getElementById('adjustedPrice');

    const reverseModeEl = document.getElementById('reverseMode');
    const reverseOptions = document.getElementById('reverseOptions');
    const subtractInputWrap = document.getElementById('subtractInputWrap');
    const manualPriceWrap = document.getElementById('manualPriceWrap');

    const presetSelect = document.getElementById('presetSelect');
    const savePresetBtn = document.getElementById('savePresetBtn');
    const deletePresetBtn = document.getElementById('deletePresetBtn');

    // Toggle hiển thị options khi tích/bỏ tích checkbox
    function toggleReverseOptions() {
        reverseOptions.style.display = reverseModeEl.checked ? 'block' : 'none';
    }

    // Toggle hiển thị input giảm theo đơn vị (dùng cho subtract / lowest / highest / average)
    const TYPES_WITH_SUBTRACT = ['subtract', 'lowest', 'highest', 'average'];
    function toggleSubtractInput() {
        const reverseType = document.querySelector('input[name="reverseType"]:checked').value;
        subtractInputWrap.style.display = TYPES_WITH_SUBTRACT.includes(reverseType) ? 'block' : 'none';
    }

    // Toggle ô nhập tay khi chọn priceSource = manual
    function toggleManualPriceInput() {
        const priceSource = document.querySelector('input[name="priceSource"]:checked').value;
        manualPriceWrap.style.display = priceSource === 'manual' ? 'block' : 'none';
    }

    reverseModeEl.addEventListener('change', toggleReverseOptions);
    document.querySelectorAll('input[name="reverseType"]').forEach(function (radio) {
        radio.addEventListener('change', toggleSubtractInput);
    });
    document.querySelectorAll('input[name="priceSource"]').forEach(function (radio) {
        radio.addEventListener('change', toggleManualPriceInput);
    });

    // Giới hạn manualPrice: chỉ chữ số + 1 dấu phân cách, phần thập phân tối đa 8 số
    const manualPriceEl = document.getElementById('manualPrice');
    manualPriceEl.addEventListener('input', function () {
        let v = manualPriceEl.value.replace(/[^0-9.,]/g, '');
        const m = v.match(/^(\d*)([.,])?(\d*)/);
        if (m) {
            const intPart = m[1];
            const sep = m[2] || '';
            const decPart = (m[3] || '').slice(0, 8);
            v = intPart + sep + decPart;
        }
        if (v !== manualPriceEl.value) manualPriceEl.value = v;
    });

    function readForm() {
        return {
            mode: document.querySelector('input[name="mode"]:checked').value,
            priceSource: document.querySelector('input[name="priceSource"]:checked').value,
            manualPrice: document.getElementById('manualPrice').value.trim(),
            calcMode: document.querySelector('input[name="calcMode"]:checked').value,
            value: document.getElementById('valueInput').value.trim(),
            amount: document.getElementById('amountInput').value.trim(),
            total: document.getElementById('totalInput').value.trim(),
            reverseMode: reverseModeEl.checked,
            reverseType: document.querySelector('input[name="reverseType"]:checked').value,
            subtractValue: document.getElementById('subtractValue').value.trim()
        };
    }

    function applyForm(data) {
        if (data.mode)
            document.querySelector(`input[name="mode"][value="${data.mode}"]`).checked = true;
        if (data.priceSource)
            document.querySelector(`input[name="priceSource"][value="${data.priceSource}"]`).checked = true;
        if (data.calcMode)
            document.querySelector(`input[name="calcMode"][value="${data.calcMode}"]`).checked = true;
        if (data.reverseType)
            document.querySelector(`input[name="reverseType"][value="${data.reverseType}"]`).checked = true;

        document.getElementById('valueInput').value = data.value || '';
        document.getElementById('amountInput').value = data.amount || '';
        document.getElementById('totalInput').value = data.total || '';
        document.getElementById('manualPrice').value = data.manualPrice || '';
        document.getElementById('subtractValue').value = data.subtractValue || '';
        reverseModeEl.checked = !!data.reverseMode;

        toggleReverseOptions();
        toggleSubtractInput();
        toggleManualPriceInput();
    }

    function refreshPresetSelect(presets, current) {
        presetSelect.innerHTML = '<option value="">-- Chọn preset --</option>';
        Object.keys(presets).sort().forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            if (name === current) opt.selected = true;
            presetSelect.appendChild(opt);
        });
    }

    presetSelect.addEventListener('change', function () {
        const name = presetSelect.value;
        if (!name) {
            chrome.storage.local.set({ currentPreset: '' });
            return;
        }
        chrome.storage.local.get(['presets'], function (res) {
            const presets = res.presets || {};
            const data = presets[name];
            if (!data) return;
            applyForm(data);
            chrome.storage.local.set(Object.assign({}, data, { currentPreset: name }));
        });
    });

    savePresetBtn.addEventListener('click', function () {
        const currentName = presetSelect.value;
        const input = prompt('Tên preset:', currentName);
        if (input === null) return;
        const name = input.trim();
        if (!name) return alert('Tên preset không được để trống!');

        chrome.storage.local.get(['presets'], function (res) {
            const presets = res.presets || {};
            if (presets[name] && name !== currentName) {
                if (!confirm(`Preset "${name}" đã tồn tại. Ghi đè?`)) return;
            }
            const data = readForm();
            presets[name] = data;
            chrome.storage.local.set(Object.assign({}, data, { presets: presets, currentPreset: name }), function () {
                refreshPresetSelect(presets, name);
            });
        });
    });

    deletePresetBtn.addEventListener('click', function () {
        const name = presetSelect.value;
        if (!name) return alert('Chưa chọn preset để xóa!');
        if (!confirm(`Xóa preset "${name}"?`)) return;

        chrome.storage.local.get(['presets'], function (res) {
            const presets = res.presets || {};
            delete presets[name];
            chrome.storage.local.set({ presets: presets, currentPreset: '' }, function () {
                refreshPresetSelect(presets, '');
            });
        });
    });

    chrome.storage.local.get(['mode', 'priceSource', 'manualPrice', 'calcMode', 'value', 'amount', 'total', 'reverseMode', 'reverseType', 'subtractValue', 'presets', 'currentPreset'], function (res) {

        if (res.mode)
            document.querySelector(`input[name="mode"][value="${res.mode}"]`).checked = true;

        if (res.priceSource)
            document.querySelector(`input[name="priceSource"][value="${res.priceSource}"]`).checked = true;

        if (res.calcMode)
            document.querySelector(`input[name="calcMode"][value="${res.calcMode}"]`).checked = true;

        if (res.value) document.getElementById('valueInput').value = res.value;
        if (res.amount) document.getElementById('amountInput').value = res.amount;
        if (res.total) document.getElementById('totalInput').value = res.total;

        if (res.reverseMode) reverseModeEl.checked = true;

        if (res.reverseType)
            document.querySelector(`input[name="reverseType"][value="${res.reverseType}"]`).checked = true;

        if (res.subtractValue) document.getElementById('subtractValue').value = res.subtractValue;

        if (res.manualPrice) document.getElementById('manualPrice').value = res.manualPrice;

        refreshPresetSelect(res.presets || {}, res.currentPreset || '');

        toggleReverseOptions();
        toggleSubtractInput();
        toggleManualPriceInput();
    });

    document.getElementById('setPriceBtn').addEventListener('click', function () {

        const mode = document.querySelector('input[name="mode"]:checked').value;
        const priceSource = document.querySelector('input[name="priceSource"]:checked').value;
        const calcMode = document.querySelector('input[name="calcMode"]:checked').value;

        const valueStr = document.getElementById('valueInput').value.trim();
        const amount = document.getElementById('amountInput').value.trim();
        const total = document.getElementById('totalInput').value.trim();
        const reverseMode = reverseModeEl.checked;
        const reverseType = document.querySelector('input[name="reverseType"]:checked').value;
        const subtractValueStr = document.getElementById('subtractValue').value.trim();
        const manualPriceStr = document.getElementById('manualPrice').value.trim();

        if (!valueStr) return alert('Vui lòng nhập giá trị!');

        const value = valueStr.replace(',', '.');
        if (isNaN(parseFloat(value))) return alert('Giá trị không hợp lệ!');

        // Validate manual price khi chọn nguồn giá = manual
        if (priceSource === 'manual') {
            if (!manualPriceStr) return alert('Vui lòng nhập giá tay!');
            const mp = manualPriceStr.replace(',', '.');
            if (isNaN(parseFloat(mp))) return alert('Giá nhập tay không hợp lệ!');
        }

        // Validate subtract value nếu reverseType có dùng ô giảm
        if (reverseMode && TYPES_WITH_SUBTRACT.includes(reverseType) && subtractValueStr !== '') {
            const sv = subtractValueStr.replace(',', '.');
            if (isNaN(parseFloat(sv))) return alert('Giá trị giảm không hợp lệ!');
        }

        chrome.storage.local.set({
            mode,
            priceSource,
            manualPrice: manualPriceStr,
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
                priceSource,
                manualPrice: manualPriceStr,
                calcMode,
                value: parseFloat(value),
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