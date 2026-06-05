# Track Analytics API - Codex Coding Request

## Mục tiêu

Code các API backend cho chức năng **Track Analytics** trong **Artist Dashboard**.

Artist có thể xem thống kê hiệu suất của từng track mà họ sở hữu.

Lưu ý quan trọng:

- Không cần code cron job.
- Không tính lại dữ liệu từ `ListenEvent` khi artist mở dashboard.
- Dữ liệu thống kê đã được cron job tổng hợp sẵn vào `TrackDailyStat` và `TrackMonthlyStat`.
- API chỉ đọc dữ liệu đã tổng hợp, tính summary/comparison và trả response cho frontend.

---

## Model sử dụng

Chỉ sử dụng các model chính sau:

```txt
Track
TrackDailyStat
TrackMonthlyStat
```

Không query trực tiếp:

```txt
ListenEvent
```

---

## API cần code

### 1. Get Track Analytics Overview

```http
GET /api/artist/tracks/:trackId/analytics
```

Query params:

```txt
range=7d | 30d | 90d | custom
from=YYYY-MM-DD
to=YYYY-MM-DD
```

Ví dụ:

```http
GET /api/artist/tracks/trackId/analytics?range=30d
```

Hoặc:

```http
GET /api/artist/tracks/trackId/analytics?range=custom&from=2026-06-01&to=2026-06-30
```

### Yêu cầu xử lý

1. Lấy `artistId` từ user đang đăng nhập.
2. Tìm track theo `trackId`.
3. Nếu track không tồn tại thì trả `404`.
4. Kiểm tra `track.artist_artistId` có trùng với `artistId` không.
5. Nếu track không thuộc artist đang đăng nhập thì trả `403`.
6. Xác định khoảng thời gian:
   - `7d`: 7 ngày gần nhất.
   - `30d`: 30 ngày gần nhất.
   - `90d`: 90 ngày gần nhất.
   - `custom`: dùng `from` và `to`.
7. Query `TrackDailyStat` theo `trackId` và khoảng ngày.
8. Tính summary:
   - `totalPlays`
   - `uniqueListeners`
   - `totalListeningTime`
   - `averageListenDuration`
   - `skipCount`
   - `skipRate`
9. Tính comparison với kỳ trước cùng độ dài.
10. Trả response cho frontend.

### Response mẫu

```js
{
  "success": true,
  "message": "Track analytics fetched successfully",
  "data": {
    "track": {
      "id": "trackId",
      "title": "Song Name",
      "avatar": "",
      "coverImage": [],
      "duration": 210
    },
    "period": {
      "from": "2026-06-01",
      "to": "2026-06-30",
      "range": "30d"
    },
    "summary": {
      "totalPlays": 12500,
      "uniqueListeners": 7800,
      "totalListeningTime": 1530000,
      "averageListenDuration": 122,
      "skipCount": 900,
      "skipRate": 7.2
    },
    "comparison": {
      "totalPlays": {
        "current": 12500,
        "previous": 10000,
        "changePercent": 25,
        "trend": "up"
      },
      "uniqueListeners": {
        "current": 7800,
        "previous": 6500,
        "changePercent": 20,
        "trend": "up"
      },
      "averageListenDuration": {
        "current": 122,
        "previous": 135,
        "changePercent": -9.63,
        "trend": "down"
      },
      "skipRate": {
        "current": 7.2,
        "previous": 5.5,
        "changePercent": 30.91,
        "trend": "up"
      }
    },
    "dailyChart": [
      {
        "date": "2026-06-01",
        "playCount": 420,
        "uniqueListeners": 310,
        "averageListenDuration": 128,
        "skipCount": 20
      }
    ]
  }
}
```

---

## 2. Get Daily Track Analytics

```http
GET /api/artist/tracks/:trackId/analytics/daily
```

Query params:

```txt
from=YYYY-MM-DD
to=YYYY-MM-DD
```

Ví dụ:

```http
GET /api/artist/tracks/trackId/analytics/daily?from=2026-06-01&to=2026-06-30
```

### Yêu cầu xử lý

1. Kiểm tra track tồn tại.
2. Kiểm tra track thuộc artist đang đăng nhập.
3. Query `TrackDailyStat` theo `trackId`, `from`, `to`.
4. Sort theo `date` tăng dần.
5. Fill ngày không có dữ liệu bằng `0`.
6. Trả dữ liệu theo ngày cho frontend vẽ chart.

### Response mẫu

```js
{
  "success": true,
  "message": "Daily track analytics fetched successfully",
  "data": {
    "trackId": "trackId",
    "from": "2026-06-01",
    "to": "2026-06-30",
    "dailyStats": [
      {
        "date": "2026-06-01",
        "playCount": 420,
        "uniqueListeners": 310,
        "averageListenDuration": 128,
        "skipCount": 20
      },
      {
        "date": "2026-06-02",
        "playCount": 0,
        "uniqueListeners": 0,
        "averageListenDuration": 0,
        "skipCount": 0
      }
    ]
  }
}
```

---

## 3. Get Monthly Track Analytics

```http
GET /api/artist/tracks/:trackId/analytics/monthly
```

Query params:

```txt
year=2026
```

Ví dụ:

```http
GET /api/artist/tracks/trackId/analytics/monthly?year=2026
```

### Yêu cầu xử lý

1. Kiểm tra track tồn tại.
2. Kiểm tra track thuộc artist đang đăng nhập.
3. Query `TrackMonthlyStat` theo `trackId` và `year`.
4. Sort theo `month` tăng dần.
5. Trả đủ 12 tháng.
6. Tháng nào không có dữ liệu thì trả `0`.

### Response mẫu

```js
{
  "success": true,
  "message": "Monthly track analytics fetched successfully",
  "data": {
    "trackId": "trackId",
    "year": 2026,
    "monthlyStats": [
      {
        "month": 1,
        "playCount": 2500,
        "uniqueListeners": 1700,
        "eligibleStreams": 2400,
        "artistRevenueAmount": 120000
      },
      {
        "month": 2,
        "playCount": 0,
        "uniqueListeners": 0,
        "eligibleStreams": 0,
        "artistRevenueAmount": 0
      }
    ]
  }
}
```

---

## 4. Compare Track Performance Over Time

```http
GET /api/artist/tracks/:trackId/analytics/compare
```

Query params:

```txt
currentFrom=YYYY-MM-DD
currentTo=YYYY-MM-DD
previousFrom=YYYY-MM-DD
previousTo=YYYY-MM-DD
```

Ví dụ:

```http
GET /api/artist/tracks/trackId/analytics/compare?currentFrom=2026-06-01&currentTo=2026-06-30&previousFrom=2026-05-01&previousTo=2026-05-31
```

### Yêu cầu xử lý

1. Kiểm tra track tồn tại.
2. Kiểm tra track thuộc artist đang đăng nhập.
3. Query `TrackDailyStat` cho current period.
4. Query `TrackDailyStat` cho previous period.
5. Tính summary cho current period.
6. Tính summary cho previous period.
7. Tính phần trăm tăng/giảm.
8. Trả dữ liệu so sánh.

### Response mẫu

```js
{
  "success": true,
  "message": "Track performance comparison fetched successfully",
  "data": {
    "trackId": "trackId",
    "currentPeriod": {
      "from": "2026-06-01",
      "to": "2026-06-30"
    },
    "previousPeriod": {
      "from": "2026-05-01",
      "to": "2026-05-31"
    },
    "metrics": {
      "playCount": {
        "current": 12500,
        "previous": 10000,
        "changePercent": 25,
        "trend": "up"
      },
      "uniqueListeners": {
        "current": 7800,
        "previous": 6500,
        "changePercent": 20,
        "trend": "up"
      },
      "averageListenDuration": {
        "current": 122,
        "previous": 135,
        "changePercent": -9.63,
        "trend": "down"
      },
      "skipRate": {
        "current": 7.2,
        "previous": 5.5,
        "changePercent": 30.91,
        "trend": "up"
      }
    }
  }
}
```

---

## Công thức tính toán

### Total Plays

```js
totalPlays = sum(playCount)
```

### Total Listening Time

```js
totalListeningTime = sum(playCount * averageListenDuration)
```

Đơn vị: giây.

### Average Listen Duration

```js
averageListenDuration = totalListeningTime / totalPlays
```

Nếu `totalPlays = 0` thì trả `0`.

### Unique Listeners

Dùng tổng `uniqueListeners` từ `TrackDailyStat`.

```js
uniqueListeners = sum(uniqueListeners)
```

Lưu ý: Đây là tổng unique listener theo ngày, không phải unique tuyệt đối toàn kỳ.

### Skip Count

```js
skipCount = sum(skipCount)
```

### Skip Rate

```js
skipRate = (skipCount / totalPlays) * 100
```

Nếu `totalPlays = 0` thì trả `0`.

### Change Percent

```js
changePercent = ((current - previous) / previous) * 100
```

Nếu `previous = 0`:

```js
if current > 0 => changePercent = 100
if current == 0 => changePercent = 0
```

### Trend

```js
if current > previous => "up"
if current < previous => "down"
if current == previous => "same"
```

---

## Validate

Cần validate các dữ liệu sau:

```txt
trackId phải là ObjectId hợp lệ
range chỉ được là 7d, 30d, 90d, custom
range=custom thì bắt buộc có from và to
from <= to
year phải hợp lệ
currentFrom/currentTo/previousFrom/previousTo phải hợp lệ
```

Nên giới hạn khoảng daily analytics tối đa khoảng `365` ngày để tránh query quá rộng.

---

## Phân quyền

Chỉ artist sở hữu track mới được xem analytics của track đó.

Logic kiểm tra:

```js
const track = await Track.findById(trackId);

if (!track) {
  throw new AppError("Track not found", 404);
}

if (String(track.artist_artistId) !== String(artistId)) {
  throw new AppError("You are not allowed to view analytics for this track", 403);
}
```

---

## Cấu trúc code đề xuất

### Service

Tạo file:

```txt
src/services/artist/trackAnalytics.service.js
```

Các function đề xuất:

```js
getTrackAnalyticsOverview({ artistId, trackId, range, from, to })

getTrackDailyAnalytics({ artistId, trackId, from, to })

getTrackMonthlyAnalytics({ artistId, trackId, year })

compareTrackPerformance({
  artistId,
  trackId,
  currentFrom,
  currentTo,
  previousFrom,
  previousTo
})

validateTrackOwnership({ artistId, trackId })

buildDailySummary(stats)

calculateChangePercent(current, previous)

buildComparison(currentSummary, previousSummary)

fillMissingDailyStats(stats, from, to)

fillMissingMonthlyStats(stats, year)
```

### Controller

Tạo file:

```txt
src/controllers/artist/trackAnalytics.controller.js
```

Các controller đề xuất:

```js
getTrackAnalyticsOverviewController

getTrackDailyAnalyticsController

getTrackMonthlyAnalyticsController

compareTrackPerformanceController
```

Controller chỉ nên:

- Lấy params/query từ request.
- Lấy `artistId` từ authenticated user.
- Gọi service.
- Trả response.
- Không viết logic tính toán nặng trong controller.

### Routes

Thêm routes vào artist routes:

```js
router.get(
  "/tracks/:trackId/analytics",
  authMiddleware,
  requireArtist,
  trackAnalyticsController.getTrackAnalyticsOverviewController
);

router.get(
  "/tracks/:trackId/analytics/daily",
  authMiddleware,
  requireArtist,
  trackAnalyticsController.getTrackDailyAnalyticsController
);

router.get(
  "/tracks/:trackId/analytics/monthly",
  authMiddleware,
  requireArtist,
  trackAnalyticsController.getTrackMonthlyAnalyticsController
);

router.get(
  "/tracks/:trackId/analytics/compare",
  authMiddleware,
  requireArtist,
  trackAnalyticsController.compareTrackPerformanceController
);
```

---

## Error response

### Track not found

Status:

```txt
404
```

Response:

```js
{
  "success": false,
  "message": "Track not found"
}
```

### Permission denied

Status:

```txt
403
```

Response:

```js
{
  "success": false,
  "message": "You are not allowed to view analytics for this track"
}
```

### Invalid date range

Status:

```txt
400
```

Response:

```js
{
  "success": false,
  "message": "Invalid date range"
}
```

### Invalid range

Status:

```txt
400
```

Response:

```js
{
  "success": false,
  "message": "Invalid analytics range"
}
```

---

## Test cần có

### Unit test service

Test các case:

```txt
Artist xem analytics track của chính mình
Artist xem track không thuộc mình thì trả 403
Track không tồn tại thì trả 404
range mặc định là 30d
range=custom thiếu from/to thì trả 400
summary tính đúng totalPlays
summary tính đúng totalListeningTime
summary tính đúng averageListenDuration
summary tính đúng skipRate
comparison tính đúng changePercent
previous = 0 không bị lỗi chia cho 0
daily stats fill ngày thiếu bằng 0
monthly stats trả đủ 12 tháng
```

### Integration test API

Test các endpoint:

```http
GET /api/artist/tracks/:trackId/analytics
GET /api/artist/tracks/:trackId/analytics/daily
GET /api/artist/tracks/:trackId/analytics/monthly
GET /api/artist/tracks/:trackId/analytics/compare
```

Test các case:

```txt
Không có token thì trả 401
User thường gọi API artist thì trả 403
Artist không sở hữu track thì trả 403
Artist sở hữu track thì trả đúng data
Date range sai thì trả 400
```

---

## Lưu ý cuối

- Không code lại cron job.
- Không tạo thêm model mới.
- Không query `ListenEvent`.
- Không tính realtime từ raw listening event.
- Chỉ đọc dữ liệu từ `TrackDailyStat` và `TrackMonthlyStat`.
- Luôn kiểm tra quyền sở hữu track.
- Response cần dễ dùng cho frontend vẽ chart và hiển thị card summary.
