chrome.commands.onCommand.addListener(function (command) {
    if (command === 'set-price') {
        chrome.storage.local.get(
            ['mode', 'priceSource', 'calcMode', 'value', 'amount', 'total', 'reverseMode', 'reverseType', 'subtractValue'],
            function (res) {
                const valueStr = (res.value || '').trim();
                if (!valueStr) return;

                const value = parseFloat(valueStr.replace(',', '.'));
                if (isNaN(value)) return;

                chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                    if (!tabs[0]) return;
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'setPrice',
                        mode: res.mode || 'percent',
                        priceSource: res.priceSource || 'first',
                        calcMode: res.calcMode || 'amount',
                        value: value,
                        amount: res.amount || '',
                        total: res.total || '',
                        reverseMode: res.reverseMode || false,
                        reverseType: res.reverseType || 'shrink',
                        subtractValue: res.subtractValue || ''
                    });
                });
            }
        );
    }
});
