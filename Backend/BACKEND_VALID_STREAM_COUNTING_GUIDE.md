# Backend Guide: Valid Stream Counting Mechanism

## 1. Goal

Implement a backend-only mechanism for counting valid music streams.

The system must validate each listen attempt on the backend before deciding whether it should be counted as a valid stream.

Frontend implementation is not required in this task.

---

## 2. Business Rule

A stream is counted only if the user listens to enough of the track based on how many valid streams they have already generated for the same track on the same day.

Required thresholds:

| Valid stream order in the day | Required listen percentage |
|---|---:|
| 1st valid stream | 40% |
| 2nd valid stream | 60% |
| 3rd valid stream | 80% |
| 4th valid stream and above | 100% |

Important rule:

- Invalid listen attempts must not be stored.
- Invalid listen attempts must not increase the daily valid stream count.
- Only backend decides whether a stream is valid.
- Frontend must not be trusted to send validation-related fields.

---

## 3. Existing Context

The project is a Node.js / Express / Mongoose backend.

The current models already include:

- `User`
- `Artist`
- `Track`
- `ListenEvent`
- `TrackDailyStat`
- `TrackMonthlyStat`
- `TrackDailyRanking`
- `TrackMonthlyRanking`
- `ArtistDailyRanking`
- `ArtistMonthlyRanking`
- `PlatformMonthlyStat`

The current `ListenEvent` model is used to log listening behavior and currently contains fields similar to:

- `userId`
- `trackId`
- `artistId`
- `listenedAt`
- `duration`
- `completed`
- `skipped`
- `device`
- `country`

For this feature, `ListenEvent` should represent only valid streams.

---

## 4. Required Database Adjustment

Update the `ListenEvent` model so that it stores enough information to explain why a stream was counted.

Recommended fields:

```js
userId: ObjectId -> User, required, index
trackId: ObjectId -> Track, required, index
artistId: ObjectId -> Artist, required, index
listenedAt: Date, default Date.now, index

trackDuration: Number, required, min 0
listenedDuration: Number, required, min 0
listenPercent: Number, required, min 0, max 100

dailyListenOrder: Number, required, min 1
requiredPercent: Number, required, min 0, max 100

source: String, enum ["track_detail", "album", "playlist", "search", "artist_profile", "unknown"], default "unknown"
device: String, default ""
country: String, default ""
```

Optional field:

```js
isValidStream: Boolean, default true, index
```

Because this system only stores valid streams, `isValidStream` is not strictly required. However, keeping it can make the model easier to extend later if invalid events need to be stored for analytics.

Fields that can be removed or deprecated:

```js
duration
completed
skipped
```

Reason:

- `duration` is ambiguous. Use `trackDuration` and `listenedDuration` instead.
- `completed` is less useful because a valid stream can be counted at 40%, 60%, or 80%.
- `skipped` is unnecessary if invalid listen attempts are not stored.

Recommended indexes:

```js
{ userId: 1, trackId: 1, listenedAt: -1 }
{ trackId: 1, listenedAt: -1 }
{ artistId: 1, listenedAt: -1 }
```

If `isValidStream` is kept:

```js
{ trackId: 1, listenedAt: -1, isValidStream: 1 }
{ artistId: 1, listenedAt: -1, isValidStream: 1 }
```

---

## 5. API Scope

Create a backend API for recording a completed listen attempt.

Suggested endpoint:

```http
POST /api/listen-events/complete
```

The frontend should only send basic playback information:

```json
{
  "trackId": "string",
  "listenedDuration": 135,
  "device": "web",
  "country": "VN",
  "source": "playlist"
}
```

The backend must derive the following fields by itself:

- `userId` from authentication middleware
- `artistId` from the Track document
- `trackDuration` from the Track document
- `listenPercent`
- `dailyListenOrder`
- `requiredPercent`
- stream validity

The frontend must not be allowed to provide:

- `artistId`
- `trackDuration`
- `listenPercent`
- `dailyListenOrder`
- `requiredPercent`
- `isValidStream`

---

## 6. Backend Validation Flow

When the API receives a request:

1. Get `userId` from the authenticated request.
2. Validate `trackId` and `listenedDuration`.
3. Find the track by `trackId`.
4. Ensure the track is playable:
   - `activeStatus` should be `active`.
   - `approvalStatus` should be `approved`.
   - `duration` must be greater than `0`.
5. Get `artistId` from `track.artist_artistId`.
6. Calculate:
   - `trackDuration`
   - `listenedDuration`
   - `listenPercent = listenedDuration / trackDuration * 100`
7. Read the current daily valid stream count from Redis.
8. Calculate the next valid stream order:
   - `dailyListenOrder = currentValidStreamCount + 1`
9. Determine the required threshold:
   - order 1: 40%
   - order 2: 60%
   - order 3: 80%
   - order 4 or above: 100%
10. Compare `listenPercent` with `requiredPercent`.
11. If invalid:
   - Do not store the event.
   - Do not increase Redis count.
   - Return a response explaining that the listen attempt was not counted.
12. If valid:
   - Push the event into Redis queue/stream.
   - Increase the daily valid stream count in Redis.
   - Return a success response.

---

## 7. Redis Usage

Use Redis for two purposes:

1. Count how many valid streams a user has generated for a specific track on a specific day.
2. Temporarily store valid stream events before syncing them to MongoDB.

### 7.1 Daily Valid Stream Count

Key format:

```txt
valid_stream_count:{dateKey}:{userId}:{trackId}
```

Example:

```txt
valid_stream_count:2026-06-07:USER_ID:TRACK_ID = 1
```

Rules:

- This count represents valid streams only.
- Invalid listen attempts must not increase this count.
- Set a TTL of around 48 hours to avoid stale keys.
- `dateKey` should use a consistent timezone policy.

Recommended timezone policy:

- Use Vietnam time if the product analytics are based on Vietnam local days.
- Otherwise use UTC consistently across all stat jobs.
- Make sure API validation and daily cron jobs use the same date boundary.

### 7.2 Valid Stream Event Queue

Use a Redis Stream if available.

Suggested stream key:

```txt
listen_event_stream
```

Only valid streams should be pushed into this stream.

Each queued event should include:

```txt
userId
trackId
artistId
listenedAt
trackDuration
listenedDuration
listenPercent
dailyListenOrder
requiredPercent
device
country
source
```

Optional:

```txt
isValidStream = true
```

---

## 8. API Response

For an invalid attempt:

```json
{
  "success": true,
  "isValidStream": false,
  "listenPercent": 25,
  "requiredPercent": 40,
  "dailyListenOrder": 1,
  "message": "This listen attempt did not meet the required threshold."
}
```

For a valid stream:

```json
{
  "success": true,
  "isValidStream": true,
  "listenPercent": 45,
  "requiredPercent": 40,
  "dailyListenOrder": 1,
  "message": "Stream counted successfully."
}
```

The invalid case still returns `success: true` because the API call itself succeeded. The listen attempt simply was not counted as a stream.

---

## 9. Cron Job: Sync Redis to MongoDB

Create a cron job that periodically syncs valid stream events from Redis to MongoDB.

Suggested frequency:

```txt
Every 1 minute or every 5 minutes
```

Responsibilities:

1. Read a batch of events from `listen_event_stream`.
2. Convert fields into the correct types.
3. Insert the batch into `ListenEvent` using `insertMany`.
4. Acknowledge/delete processed events from Redis only after successful database insert.
5. Log failures and avoid losing unprocessed events.

This cron job should only sync valid events to the database. It should not calculate daily stats directly unless the existing project structure requires it.

---

## 10. Cron Job: Daily Analytics Aggregation

The daily analytics cron should aggregate from `ListenEvent`.

Since `ListenEvent` only stores valid streams:

- `playCount` = number of `ListenEvent` records for the track on that day.
- `uniqueListeners` = number of unique `userId` values for the track on that day.
- `averageListenDuration` = average of `listenedDuration`.

Update existing models:

- `TrackDailyStat`
- `TrackDailyRanking`
- `ArtistDailyRanking`
- related platform stats if applicable

Monthly cron jobs can continue aggregating from daily stats or from `ListenEvent`, depending on the current project design.

---

## 11. Important Anti-Cheating Rules

Backend must not trust the frontend for validation-sensitive data.

Backend must protect against obvious fake data:

- `listenedDuration` must be greater than `0`.
- `listenedDuration` should not be allowed to exceed `trackDuration` by a large margin.
- Clamp `listenedDuration` to `trackDuration` before calculating percentage.
- Track must be active and approved.
- User must be authenticated.

Optional protection:

- Add a minimum real elapsed time check if the backend has session tracking later.
- Add cooldown or duplicate prevention if users spam the complete API repeatedly.
- Store or check a playback session ID in the future if stronger anti-fraud logic is needed.

Do not implement frontend playback session tracking in this task unless necessary.

---

## 12. Suggested File Changes

Likely backend files to add or modify:

```txt
src/models/ListenEvent.js
src/routes/listenEvent.routes.js
src/controllers/listenEvent.controller.js
src/services/listenEvent.service.js
src/jobs/syncListenEventsFromRedis.job.js
src/config/redis.js
src/models/index.js
```

Adjust exact paths according to the current project structure.

---

## 13. Acceptance Criteria

The implementation is complete when:

1. Backend exposes an API to receive a listen completion event.
2. Backend validates whether the listen attempt qualifies as a stream.
3. Invalid attempts are not stored in Redis or MongoDB.
4. Invalid attempts do not increase daily valid stream count.
5. Valid streams are pushed to Redis.
6. Redis daily stream count is increased only after a valid stream.
7. A cron job syncs valid Redis events into MongoDB `ListenEvent`.
8. `ListenEvent` stores enough information to explain the counted stream:
   - `trackDuration`
   - `listenedDuration`
   - `listenPercent`
   - `dailyListenOrder`
   - `requiredPercent`
9. Existing stat/ranking cron jobs can aggregate from `ListenEvent`.
10. No frontend implementation is required.

---

## 14. Final Design Decision

Use this design:

```txt
Frontend sends listen attempt
↓
Backend validates stream eligibility
↓
Only valid streams are stored in Redis
↓
Cron syncs Redis events to MongoDB ListenEvent
↓
Analytics cron aggregates ListenEvent into stats and rankings
```

`ListenEvent` should represent valid streams only.

Invalid listen attempts should be ignored for now.
