# 🧩 Binance Auto Limit Price Extension

Tự động lấy **giá Limit mới nhất** trên Binance Spot, điều chỉnh theo tỷ lệ phần trăm tùy chọn (ví dụ +1%, -0.5%) và tự động điền vào ô **Limit Price** + **Amount** trong giao diện giao dịch Binance.

---

## 🚀 Tính năng chính

- ✅ Tự động đọc **giá hiện tại** từ mục **“Giao dịch lệnh Limit”**
- ✅ Cho phép nhập **% điều chỉnh giá** (ví dụ: `+1`, `-0.5`)
- ✅ Tự động cập nhật **giá & số lượng (amount)** vào form Limit
- ✅ Hiển thị kết quả trực tiếp trong popup, không còn alert thô
- ✅ Hoạt động ổn định dù Binance thay đổi class UI (dò theo nội dung “Giao dịch lệnh Limit”)

---

## 📦 Cấu trúc thư mục

```
binance-auto-limit/
├── manifest.json
├── popup.html
├── popup.js
├── content.js
├── icon.png
└── README.md
```

---

## ⚙️ Hướng dẫn cài đặt

1. Clone hoặc tải source code về:
   ```bash
   git clone https://github.com/yourusername/binance-auto-limit.git
   ```

2. Mở **Chrome / Brave / Edge** → vào trang:
   ```
   chrome://extensions/
   ```

3. Bật **Developer Mode (Chế độ dành cho nhà phát triển)** ở góc phải trên.

4. Nhấn **“Tải tiện ích chưa đóng gói (Load unpacked)”** → chọn thư mục dự án.

5. Sau khi cài xong, biểu tượng extension sẽ xuất hiện trên thanh công cụ 🔧  
   → Ghim nó để dễ sử dụng.

---

## 🧠 Cách sử dụng

1. Mở trang **Giao dịch Spot** trên Binance.  
2. Chọn cặp bạn muốn trade (VD: BTC/USDT).  
3. Mở popup extension:  
   - Nhập `%` điều chỉnh (ví dụ `-0.5` → giá thấp hơn 0.5%)  
   - Nhập `amount` nếu muốn (VD: `0.01`)  
4. Nhấn **"Set Price"**.  
5. Extension sẽ:
   - Tự động lấy **giá Limit hiện tại** trên Binance  
   - Tính giá mới  
   - Điền vào **ô Limit Price và Amount**  
   - Hiển thị kết quả ngay trong popup 🎯

---

## 🧩 Ví dụ

| Trường | Giá trị | Giải thích |
|--------|----------|------------|
| Giá hiện tại | 100.000 | Lấy từ “Giao dịch lệnh Limit” |
| Phần trăm điều chỉnh | -1 | Giảm 1% |
| Giá mới | 99.000 | Được tự động tính |
| Amount | 0.05 | (tùy chọn) điền vào ô Amount |

Khi hoàn tất, popup sẽ hiển thị:

```
✓ Đã thay đổi giá thành công!
Giá hiện tại: 100.000
Giá mới: 99.000
```

---

## 🧰 Kỹ thuật sử dụng

- Manifest v3 (Chrome Extension API)
- DOM query động → tìm phần “Giao dịch lệnh Limit”
- Messaging giữa `popup.js` ↔ `content.js`
- Tự động trigger `input` + `change` event để Binance UI nhận giá trị

---

## ⚠️ Lưu ý

- Chỉ hoạt động trên trang **Spot** (không áp dụng cho Futures).
- Binance có thể thay đổi cấu trúc DOM → cần cập nhật selector (extension đã được tối ưu để giảm rủi ro này).
- Không phải extension chính thức của Binance.

---

## 💡 Gợi ý cải tiến (tùy chọn)

- [ ] Thêm tùy chọn “Lệnh bán / mua” tự động  
- [ ] Ghi nhớ cặp hiện tại để load lại nhanh  
- [ ] Animation đẹp cho phần kết quả (`fadeIn`, `fadeOut`)  
- [ ] Tích hợp shortcut bàn phím (Alt + L)
