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
    const presetStatusEl = document.getElementById('presetStatus');
    const presetActions = document.getElementById('presetActions');
    const savePresetForm = document.getElementById('savePresetForm');
    const savePresetTarget = document.getElementById('savePresetTarget');
    const newPresetNameInput = document.getElementById('newPresetName');
    const confirmSaveBtn = document.getElementById('confirmSaveBtn');
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');

    const filterNoiseEl = document.getElementById('filterNoise');
    const filterNoiseWrap = document.getElementById('filterNoiseWrap');
    const filterNoiseInputs = document.getElementById('filterNoiseInputs');
    const filterNoiseHint = document.getElementById('filterNoiseHint');
    const filterSampleSizeEl = document.getElementById('filterSampleSize');
    const filterThresholdEl = document.getElementById('filterThreshold');

    const AGGREGATE_TYPES = ['highest', 'lowest', 'average'];

    // Cache presets in memory để so khớp realtime mà không cần await storage mỗi lần input
    let presetsCache = {};

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

    // Toggle khu vực lọc nhiễu — chỉ hiện khi có dùng aggregate (highest/lowest/average) ở priceSource hoặc reverseType
    function toggleFilterNoiseWrap() {
        const priceSource = document.querySelector('input[name="priceSource"]:checked').value;
        const reverseType = document.querySelector('input[name="reverseType"]:checked').value;
        const needFilter = AGGREGATE_TYPES.includes(priceSource)
            || (reverseModeEl.checked && AGGREGATE_TYPES.includes(reverseType));
        filterNoiseWrap.style.display = needFilter ? 'block' : 'none';
        toggleFilterNoiseInputs();
    }

    function toggleFilterNoiseInputs() {
        const show = filterNoiseEl.checked;
        filterNoiseInputs.style.display = show ? 'flex' : 'none';
        filterNoiseHint.style.display = show ? 'block' : 'none';
    }

    reverseModeEl.addEventListener('change', toggleReverseOptions);
    reverseModeEl.addEventListener('change', toggleFilterNoiseWrap);
    filterNoiseEl.addEventListener('change', toggleFilterNoiseInputs);
    document.querySelectorAll('input[name="reverseType"]').forEach(function (radio) {
        radio.addEventListener('change', toggleSubtractInput);
        radio.addEventListener('change', toggleFilterNoiseWrap);
    });
    document.querySelectorAll('input[name="priceSource"]').forEach(function (radio) {
        radio.addEventListener('change', toggleManualPriceInput);
        radio.addEventListener('change', toggleFilterNoiseWrap);
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
            subtractValue: document.getElementById('subtractValue').value.trim(),
            filterNoise: filterNoiseEl.checked,
            filterSampleSize: filterSampleSizeEl.value.trim(),
            filterThreshold: filterThresholdEl.value.trim()
        };
    }

    // Chuẩn hóa để so sánh — string rỗng và undefined coi như giống nhau, boolean ép thật/giả.
    function normForm(f) {
        return JSON.stringify({
            mode: f.mode || '',
            priceSource: f.priceSource || '',
            manualPrice: f.manualPrice || '',
            calcMode: f.calcMode || '',
            value: f.value || '',
            amount: f.amount || '',
            total: f.total || '',
            reverseMode: !!f.reverseMode,
            reverseType: f.reverseType || '',
            subtractValue: f.subtractValue || '',
            filterNoise: !!f.filterNoise,
            filterSampleSize: f.filterSampleSize || '',
            filterThreshold: f.filterThreshold || ''
        });
    }

    function findMatchingPreset(form, presets) {
        const a = normForm(form);
        for (const name of Object.keys(presets)) {
            if (normForm(presets[name]) === a) return name;
        }
        return '';
    }

    function updatePresetStatus() {
        const matchName = findMatchingPreset(readForm(), presetsCache);
        presetSelect.value = matchName;
        if (matchName) {
            presetStatusEl.textContent = matchName;
            presetStatusEl.className = 'preset-status preset-status-loaded';
        } else {
            presetStatusEl.textContent = 'Tự chỉnh';
            presetStatusEl.className = 'preset-status preset-status-custom';
        }
        // Sync currentPreset vào storage để Alt+S và lần khởi động sau biết đang ở preset nào
        chrome.storage.local.set({ currentPreset: matchName });
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

        filterNoiseEl.checked = !!data.filterNoise;
        filterSampleSizeEl.value = data.filterSampleSize || '';
        filterThresholdEl.value = data.filterThreshold || '';

        toggleReverseOptions();
        toggleSubtractInput();
        toggleManualPriceInput();
        toggleFilterNoiseWrap();
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
            updatePresetStatus();
            return;
        }
        const data = presetsCache[name];
        if (!data) return;
        applyForm(data);
        chrome.storage.local.set(Object.assign({}, data, { currentPreset: name }));
        updatePresetStatus();
    });

    function populateSaveTarget() {
        savePresetTarget.innerHTML = '<option value="__new__">+ Tạo preset mới</option>';
        Object.keys(presetsCache).sort().forEach(function (name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = `Ghi đè: ${name}`;
            savePresetTarget.appendChild(opt);
        });
        // Mặc định: nếu form đang khớp preset thì pick preset đó, không thì "Tạo mới"
        const current = presetSelect.value;
        savePresetTarget.value = (current && presetsCache[current]) ? current : '__new__';
        toggleNewNameInput();
    }

    function toggleNewNameInput() {
        const isNew = savePresetTarget.value === '__new__';
        newPresetNameInput.style.display = isNew ? 'block' : 'none';
        if (isNew) newPresetNameInput.focus();
    }

    function showSaveForm() {
        populateSaveTarget();
        presetActions.style.display = 'none';
        savePresetForm.style.display = 'block';
    }

    function hideSaveForm() {
        savePresetForm.style.display = 'none';
        presetActions.style.display = 'flex';
        newPresetNameInput.value = '';
    }

    savePresetBtn.addEventListener('click', showSaveForm);
    cancelSaveBtn.addEventListener('click', hideSaveForm);
    savePresetTarget.addEventListener('change', toggleNewNameInput);

    confirmSaveBtn.addEventListener('click', function () {
        const target = savePresetTarget.value;
        let name;
        if (target === '__new__') {
            name = newPresetNameInput.value.trim();
            if (!name) return alert('Tên preset không được để trống!');
            if (presetsCache[name]) {
                if (!confirm(`Preset "${name}" đã tồn tại. Ghi đè?`)) return;
            }
        } else {
            name = target;
            if (!confirm(`Ghi đè preset "${name}"?`)) return;
        }

        const data = readForm();
        presetsCache[name] = data;
        chrome.storage.local.set(Object.assign({}, data, { presets: presetsCache, currentPreset: name }), function () {
            refreshPresetSelect(presetsCache, name);
            updatePresetStatus();
            hideSaveForm();
        });
    });

    deletePresetBtn.addEventListener('click', function () {
        const name = presetSelect.value;
        if (!name) return alert('Chưa chọn preset để xóa!');
        if (!confirm(`Xóa preset "${name}"?`)) return;

        delete presetsCache[name];
        chrome.storage.local.set({ presets: presetsCache, currentPreset: '' }, function () {
            refreshPresetSelect(presetsCache, '');
            updatePresetStatus();
        });
    });

    // Bất kỳ thay đổi nào trên form đều phải re-check xem có còn match preset không
    document.querySelectorAll('input').forEach(function (el) {
        if (el.id === 'newPresetName') return;
        el.addEventListener('input', updatePresetStatus);
        el.addEventListener('change', updatePresetStatus);
    });

    chrome.storage.local.get(['mode', 'priceSource', 'manualPrice', 'calcMode', 'value', 'amount', 'total', 'reverseMode', 'reverseType', 'subtractValue', 'filterNoise', 'filterSampleSize', 'filterThreshold', 'presets', 'currentPreset'], function (res) {

        presetsCache = res.presets || {};

        // Nếu có preset đang chọn và preset đó tồn tại → load preset luôn (ưu tiên preset hơn top-level keys cũ)
        const lastPreset = res.currentPreset || '';
        if (lastPreset && presetsCache[lastPreset]) {
            applyForm(presetsCache[lastPreset]);
        } else {
            applyForm(res);
        }

        refreshPresetSelect(presetsCache, lastPreset);
        updatePresetStatus();
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
        const filterNoise = filterNoiseEl.checked;
        const filterSampleSizeStr = filterSampleSizeEl.value.trim();
        const filterThresholdStr = filterThresholdEl.value.trim();

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

        // Validate filter noise
        if (filterNoise) {
            const n = parseInt(filterSampleSizeStr, 10);
            const t = parseFloat(filterThresholdStr.replace(',', '.'));
            if (isNaN(n) || n < 1) return alert('N (số mẫu lọc nhiễu) phải >= 1!');
            if (isNaN(t) || t < 0) return alert('Ngưỡng nhiễu (%) phải >= 0!');
        }

        const formSnapshot = readForm();
        const matchName = findMatchingPreset(formSnapshot, presetsCache);
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
            subtractValue: subtractValueStr,
            filterNoise,
            filterSampleSize: filterSampleSizeStr,
            filterThreshold: filterThresholdStr,
            currentPreset: matchName
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
                subtractValue: subtractValueStr,
                filterNoise,
                filterSampleSize: filterSampleSizeStr,
                filterThreshold: filterThresholdStr
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