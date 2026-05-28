# Model Overview

Tài liệu này tổng hợp nhanh toàn bộ model hiện có trong dự án `Backend/src/models` để dễ nhìn bức tranh dữ liệu tổng thể.

## Tổng quan nhanh

- Tổng số model: `27`
- ODM sử dụng: `mongoose`
- Hầu hết model đều dùng `timestamps: true`
- File export tập trung: `src/models/index.js`

## Nhóm model theo chức năng

### 1. User, xác thực, phân quyền

#### User
- Mục đích: lưu thông tin tài khoản người dùng, vai trò và trạng thái sử dụng.
- Field chính:
  - `email`, `password`, `authProvider`, `googleId`
  - `avatar`
  - `role`: `user | artist | admin`
  - `activeStatus`: `active | inactive | blocked`
  - `emailVerified`
  - `profile.fullName`, `profile.gender`, `profile.dateOfBirth`, `profile.country`
  - `settings.language`, `settings.notificationsEnabled`, `settings.shufflePlayDefault`
  - `subscription.isPremium`, `subscription.currentPlanId -> Plan`, `subscription.premiumEndDate`
  - `stats.totalListeningTime`, `stats.totalTracksPlayed`
- Index đáng chú ý: `email` unique, `authProvider`, `role`, `activeStatus`, `emailVerified`, `subscription.isPremium`

#### RefreshToken
- Mục đích: lưu refresh token đăng nhập.
- Field chính: `userId -> User`, `token`, `expiresAt`, `isRevoked`
- Index đáng chú ý: `token` unique

#### VerificationToken
- Mục đích: xác thực email và reset password.
- Field chính: `userId -> User`, `email`, `token`, `otp`, `type`, `expiresAt`, `isUsed`
- Enum:
  - `type`: `reset_password | verify_email`
- Index đáng chú ý: `token` unique

### 2. Artist và quy trình xác minh

#### Artist
- Mục đích: hồ sơ nghệ sĩ gắn với một `User`.
- Field chính:
  - `userId -> User`
  - `name`, `bio`, `avatar`, `coverImage`
  - `socialLinks.facebook`, `socialLinks.instagram`, `socialLinks.youtube`
  - `verificationStatus`: `pending | verified | rejected`
  - `stats.followers`, `stats.totalStreams`
  - `activeStatus`: `active | inactive | blocked`
  - `blockedReason`
- Ràng buộc: `userId` unique

#### ArtistRequest
- Mục đích: yêu cầu trở thành nghệ sĩ.
- Field chính:
  - `userId -> User`
  - `stageName`, `bio`, `avatar`, `genres`, `country`
  - `socialLinks.spotify`, `youtube`, `tiktok`, `facebook`
  - `identityInfo.idNumber`, `fullName`, `dateOfBirth`, `frontImage`, `backImage`
  - `status`: `pending | approved | rejected`
  - `reviewedBy -> User`, `reviewedAt`, `rejectReason`

#### ArtistVerificationRequest
- Mục đích: yêu cầu xác minh nghệ sĩ.
- Field chính: `artistId -> Artist`, `userId -> User`, `status`, `note`
- Enum:
  - `status`: `open | closed`
- Index đáng chú ý: `{ artistId, status }`

#### ArtistStat
- Mục đích: thống kê tổng quan cho nghệ sĩ.
- Field chính:
  - `artistId -> Artist`
  - `totalStreams`, `totalFollowers`, `monthlyListeners`
  - `demographics.ageGroups`, `demographics.gender`, `demographics.countries`
- Ràng buộc: `artistId` unique

#### ArtistMonthlyStat
- Mục đích: thống kê theo tháng của nghệ sĩ.
- Field chính: `artistId -> Artist`, `year`, `month`, `newFollowers`, `totalFollowers`, `totalStreams`
- Ràng buộc: unique `{ artistId, year, month }`

### 3. Nội dung âm nhạc và podcast

#### Genre
- Mục đích: danh mục thể loại nhạc.
- Field chính: `name`, `description`, `image`, `isActive`
- Ràng buộc: `name` unique

#### Album
- Mục đích: album của nghệ sĩ.
- Field chính:
  - `title`
  - `artistId -> Artist`
  - `coverImage`
  - `trackList[].trackId -> Track`, `trackList[].order`
  - `releaseDate`
  - `status`: `draft | active | hidden | blocked`
  - `blockedReason`, `totalPlays`
- Index đáng chú ý: `{ artistId, title }`

#### Track
- Mục đích: bài hát/audio track chính của hệ thống.
- Field chính:
  - `title`
  - `artist_artistId -> Artist`
  - `album_albumId -> Album`
  - `genreIds[] -> Genre`
  - `audioFiles[].url`, `format`, `bitrate`, `label`, `priority`
  - `duration`, `avatar`, `coverImage[]`
  - `lyricsStatic`, `lyricsSyncUrl`
  - `stats.totalLike`, `stats.totalPlay`
  - `releaseDate`
  - `activeStatus`: `draft | active | hidden | blocked`
  - `approvalStatus`: `draft | pending | approved | rejected`
  - `rejectReason`, `blockedReason`, `hiddenReason`, `hiddenAt`
- Index đáng chú ý: `{ artist_artistId, title }`

#### Podcast
- Mục đích: podcast do nghệ sĩ sở hữu.
- Field chính:
  - `title`
  - `artistId -> Artist`
  - `description`, `coverImage`, `trailerUrl`
  - `stats.followers`, `stats.totalPlays`
  - `activeStatus`: `draft | active | hidden | blocked`
  - `approvalStatus`: `draft | pending | approved | rejected`
  - `blockedReason`
- Index đáng chú ý: `{ artistId, title }`

#### Episode
- Mục đích: tập podcast.
- Field chính:
  - `podcastId -> Podcast`
  - `title`, `description`, `thumbnailUrl`
  - `audioFiles[]`
  - `duration`
  - `stats.totalPlay`, `stats.totalLikes`
  - `activeStatus`: `draft | active | hidden | blocked`
  - `blockedReason`
- Index đáng chú ý: `{ podcastId, title }`

#### ReleaseSchedule
- Mục đích: lịch phát hành nội dung.
- Field chính: `type`, `targetId`, `artistId -> Artist`, `scheduledAt`, `releasedAt`, `status`
- Enum:
  - `type`: `track | album`
  - `status`: `scheduled | released | cancelled`

### 4. Playlist, tương tác và hành vi nghe

#### Playlist
- Mục đích: playlist của user hoặc do hệ thống/AI tạo.
- Field chính:
  - `userId -> User`
  - `title`, `description`
  - `type`: `user | system | ai_generated`
  - `coverImage`
  - `isPublic`, `isHidden`
  - `aiPrompt`, `aiGeneratedAt`
  - `trackCount`, `totalDuration`
  - `tracks[].trackId -> Track`, `tracks[].addedAt`, `tracks[].order`
- Index đáng chú ý: `{ userId, title }`

#### Interaction
- Mục đích: theo dõi hành động like/follow của user trên nhiều loại đối tượng.
- Field chính: `userId -> User`, `targetType`, `targetId`, `action`
- Enum:
  - `targetType`: `Track | Artist | Album | Episode | Podcast | Post`
  - `action`: `like | follow`
- Ràng buộc: unique `{ userId, targetType, targetId, action }`
- Ghi chú: dùng `refPath: "targetType"` để tham chiếu động

#### ListenEvent
- Mục đích: log từng lần nghe nội dung.
- Field chính:
  - `userId -> User`
  - `trackId -> Track`
  - `artistId -> Artist`
  - `podcastId -> Podcast`
  - `episodeId -> Episode`
  - `listenedAt`, `duration`, `completed`, `skipped`, `device`, `country`
- Index đáng chú ý: `{ userId, listenedAt }`

#### SearchEvent
- Mục đích: log từ khóa tìm kiếm và click sau tìm kiếm.
- Field chính: `userId -> User`, `keyword`, `clickedTrackId -> Track`

#### UserListeningStat
- Mục đích: thống kê nghe nhạc theo tuần cho user.
- Field chính:
  - `userId -> User`
  - `year`, `week`
  - `stats_totalListeningTime`, `stats_totalTracksPlayed`
  - `topGenres[].genreId -> Genre`, `genreName`, `playCount`, `listeningTime`
  - `topTracks[].trackId -> Track`, `title`, `playCount`, `listeningTime`
  - `topArtists[].artistId -> Artist`, `name`, `playCount`
- Ràng buộc: unique `{ userId, year, week }`

### 5. Thanh toán và gói dịch vụ

#### Plan
- Mục đích: gói premium/subscription.
- Field chính: `name`, `price`, `durationDays`, `description`, `features[]`, `status`
- Enum:
  - `status`: `active | inactive`
  - `features[]`:
    - `NO_ADS`
    - `HIGH_QUALITY_AUDIO`
    - `LOSSLESS_AUDIO`
    - `UNLIMITED_SKIP`
    - `OFFLINE_DOWNLOAD`
    - `BACKGROUND_PLAY`
    - `AI_SMART_PLAYLIST`
    - `ADVANCED_RECOMMENDATION`
    - `EARLY_ACCESS`
    - `EXCLUSIVE_CONTENT`
- Ràng buộc: `name` unique

#### Subscription
- Mục đích: đăng ký gói của user.
- Field chính:
  - `userId -> User`
  - `planId -> Plan`
  - `status`: `pending | active | cancelled | expired`
  - `startDate`, `endDate`, `autoRenew`
- Index đáng chú ý: `{ userId, planId, status }`

#### Transaction
- Mục đích: lưu giao dịch thanh toán.
- Field chính:
  - `userId -> User`
  - `subscriptionId -> Subscription`
  - `planId -> Plan`
  - `amount`, `tax`, `totalAmount`, `currency`
  - `paymentMethod`: `momo | vnpay | stripe | card`
  - `paymentGateway`: `momo | vnpay | stripe`
  - `gatewayTransactionId`
  - `status`: `pending | success | failed | refunded`
  - `paidAt`, `failedAt`, `failureReason`, `invoiceNumber`

### 6. Kiểm duyệt, hệ thống, thông báo

#### Report
- Mục đích: báo cáo nội dung vi phạm.
- Field chính:
  - `userId -> User`
  - `targetId`
  - `targetType`: `track | album | podcast | episode | artist`
  - `reason`, `description`, `images[]`
  - `status`: `pending | reviewing | resolved | rejected`
  - `handledBy -> User`, `handledAt`
  - `resolution`: `remove_content | ignore | warning | ""`
  - `resolutionNote`

#### AuditLog
- Mục đích: lưu lịch sử thao tác quản trị/hệ thống.
- Field chính:
  - `actorId -> User`
  - `action`
  - `targetType`: `User | Artist | Track | Album | Podcast | Playlist | Report`
  - `targetId`
  - `reason`
  - `metadata.before`, `metadata.after`, `metadata.note`
  - `ipAddress`, `userAgent`
- Index đáng chú ý:
  - `{ targetType, targetId, createdAt: -1 }`
  - `{ actorId, createdAt: -1 }`

#### Notification
- Mục đích: thông báo hệ thống và thông báo nghiệp vụ.
- Field chính:
  - `userId -> User`
  - `type`: `system | new_release | payment | follow | report | subscription`
  - `title`, `content`
  - `actorId`, `actorType`
  - `targetId`, `targetType`
  - `receiverType`: `single | all | group`
  - `isGlobal`
  - `createdBy -> User`
  - `isDeleted`, `deletedAt`
- Enum bổ sung:
  - `actorType`: `admin | artist | system | user | ""`
  - `targetType`: `track | album | podcast | episode | plan | payment | report | artist | ""`
- Index đáng chú ý: `{ userId, isRead, createdAt: -1 }`

### 7. Thống kê nội dung

#### TrackDailyStat
- Mục đích: thống kê track theo ngày.
- Field chính: `trackId -> Track`, `date`, `playCount`, `uniqueListeners`, `skipCount`
- Ràng buộc: unique `{ trackId, date }`

#### TrackMonthlyStat
- Mục đích: thống kê track theo tháng.
- Field chính: `trackId -> Track`, `year`, `month`, `playCount`, `uniqueListeners`
- Ràng buộc: unique `{ trackId, year, month }`

## Sơ đồ quan hệ khái quát

- `User` là trung tâm cho xác thực, phân quyền, playlist, subscription, transaction, interaction, report và các log.
- `Artist` gắn `1-1` với `User` qua `userId`.
- `Artist` sở hữu nhiều `Album`, `Track`, `Podcast`, `ReleaseSchedule`, `ArtistMonthlyStat`.
- `Podcast` có nhiều `Episode`.
- `Track` có thể thuộc `Album` và nhiều `Genre`.
- `Playlist` chứa nhiều `Track` thông qua mảng `tracks[]`.
- `Subscription` nối `User` với `Plan`.
- `Transaction` bám theo `User`, `Plan` và có thể gắn `Subscription`.
- `ListenEvent`, `SearchEvent`, `Interaction`, `UserListeningStat`, `TrackDailyStat`, `TrackMonthlyStat`, `ArtistStat`, `ArtistMonthlyStat` là nhóm analytics/behavior.
- `Report`, `AuditLog`, `Notification` là nhóm moderation/system support.

## Ghi chú khi đọc code

- Tài liệu này phản ánh đúng tên field hiện tại trong model, kể cả các tên đặc biệt như `artist_artistId`, `album_albumId`, `stats_totalListeningTime`.
- Một số model dùng tham chiếu động hoặc không gắn `ref` trực tiếp cho mọi `targetId`, nên khi đọc service/controller cần đối chiếu thêm logic nghiệp vụ.
