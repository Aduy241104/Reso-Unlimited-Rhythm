# Model Overview

Tai lieu nay mo ta toan bo model hien tai trong `src/models` de ban co the nhin nhanh cau truc du lieu, field, rang buoc, enum, `ref`, va index dang duoc su dung.

## Tong quan

- Tong so model hien tai: `30`
- Cong nghe ODM: `mongoose`
- File export tong hop: `src/models/index.js`
- Da so model dung `timestamps: true`
- Mot so model dung subdocument array va nested object de luu thong tin thong ke / moderation / portfolio

## Luu y chung

- Tai lieu nay bam theo ten field dung nhu trong code hien tai, ke ca nhung ten khong dong deu nhu `artist_artistId`, `album_albumId`, `stats_totalListeningTime`.
- `ObjectId -> ModelName` nghia la field do tham chieu toi model khac qua `ref`.
- Cac model `Interaction` va `SearchEvent` chi tao `createdAt`, khong tao `updatedAt`.

## Nhom 1: User va xac thuc

### User

Muc dich: luu tai khoan, quyen, trang thai, profile, setting va thong tin premium.

Fields:

- `email`: `String`, required, trim, lowercase, unique, index
- `password`: `String`, required neu `authProvider === "local"`
- `authProvider`: `String`, enum `local | google`, default `local`, index
- `googleId`: `String`, trim, sparse, index
- `avatar`: `String`, default `""`
- `role`: `String`, enum `user | artist | admin`, default `user`, index
- `activeStatus`: `String`, enum `active | inactive | blocked`, default `active`, index
- `emailVerified`: `Boolean`, default `false`, index
- `profile.fullName`: `String`, trim, default `""`
- `profile.gender`: `String`, enum `male | female | other | prefer_not_to_say`, default `prefer_not_to_say`
- `profile.dateOfBirth`: `Date`
- `profile.country`: `String`, trim, default `""`
- `settings.language`: `String`, default `vi`
- `settings.notificationsEnabled`: `Boolean`, default `true`
- `settings.shufflePlayDefault`: `Boolean`, default `false`
- `subscription.isPremium`: `Boolean`, default `false`, index
- `subscription.currentPlanId`: `ObjectId -> Plan`, index
- `subscription.premiumEndDate`: `Date`
- `stats.totalListeningTime`: `Number`, default `0`, min `0`
- `stats.totalTracksPlayed`: `Number`, default `0`, min `0`

### RefreshToken

Muc dich: luu refresh token dang nhap.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `token`: `String`, required, unique, index
- `expiresAt`: `Date`, required, index
- `isRevoked`: `Boolean`, default `false`, index

### VerificationToken

Muc dich: luu token/OTP cho xac minh email va reset password.

Fields:

- `userId`: `ObjectId -> User`, default `null`, index
- `email`: `String`, trim, lowercase, index
- `token`: `String`, required, unique, index
- `otp`: `String`, trim, index
- `type`: `String`, enum `reset_password | verify_email`, required, index
- `expiresAt`: `Date`, required, index
- `isUsed`: `Boolean`, default `false`, index

## Nhom 2: Artist va xac minh artist

### Artist

Muc dich: ho so artist gan 1-1 voi mot user.

Fields:

- `userId`: `ObjectId -> User`, required, unique, index
- `name`: `String`, required, trim, index
- `bio`: `String`, default `""`
- `avatar`: `String`, default `""`
- `coverImage`: `String`, default `""`
- `socialLinks.facebook`: `String`, default `""`
- `socialLinks.instagram`: `String`, default `""`
- `socialLinks.youtube`: `String`, default `""`
- `verificationStatus`: `String`, enum `pending | verified | rejected`, default `pending`, index
- `stats.followers`: `Number`, default `0`, min `0`
- `stats.totalStreams`: `Number`, default `0`, min `0`
- `activeStatus`: `String`, enum `active | inactive | blocked`, default `active`, index
- `blockedReason`: `String`, default `""`

### ArtistRequest

Muc dich: yeu cau tro thanh artist.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `stageName`: `String`, required, trim
- `bio`: `String`, default `""`
- `avatar`: `String`, trim, default `""`
- `genres[]`: `String`, trim
- `socialLinks.spotify`: `String`, default `""`
- `socialLinks.youtube`: `String`, default `""`
- `socialLinks.tiktok`: `String`, default `""`
- `socialLinks.facebook`: `String`, default `""`
- `socialLinks.instagram`: `String`, default `""`
- `socialLinks.soundcloud`: `String`, default `""`
- `socialLinks.website`: `String`, default `""`
- `socialLinks.other`: `String`, default `""`
- `identityInfo.idNumber`: `String`, required, trim
- `identityInfo.fullName`: `String`, required, trim
- `identityInfo.dateOfBirth`: `Date`
- `identityInfo.frontImage`: `String`, required
- `identityInfo.backImage`: `String`, required
- `portfolio.demoTrackUrls[]`: `String`, trim
- `portfolio.musicLinks[]`: `String`, trim
- `portfolio.description`: `String`, default `""`
- `artistDeclaration.acceptedTerms`: `Boolean`, default `false`
- `artistDeclaration.copyrightCommitment`: `Boolean`, default `false`
- `artistDeclaration.truthfulInformationCommitment`: `Boolean`, default `false`
- `artistDeclaration.acceptedAt`: `Date`, default `null`
- `review.adminNote`: `String`, default `""`
- `review.checklist.profileComplete`: `Boolean`, default `false`
- `review.checklist.identityVerified`: `Boolean`, default `false`
- `review.checklist.hasMusicActivity`: `Boolean`, default `false`
- `review.checklist.socialLinksValid`: `Boolean`, default `false`
- `review.checklist.noImpersonation`: `Boolean`, default `false`
- `review.checklist.acceptedCopyrightPolicy`: `Boolean`, default `false`
- `status`: `String`, enum `pending | approved | rejected`, default `pending`, index
- `reviewedBy`: `ObjectId -> User`
- `reviewedAt`: `Date`
- `rejectReason`: `String`, default `""`

### ArtistVerificationRequest

Muc dich: yeu cau xac minh artist.

Fields:

- `artistId`: `ObjectId -> Artist`, required, index
- `userId`: `ObjectId -> User`, required, index
- `status`: `String`, enum `open | closed`, default `open`, index
- `note`: `String`, trim, default `""`, maxlength `2000`

Indexes:

- `{ artistId: 1, status: 1 }`

### ArtistStat

Muc dich: thong ke tong quan cho artist.

Fields:

- `artistId`: `ObjectId -> Artist`, required, unique, index
- `totalStreams`: `Number`, default `0`, min `0`
- `totalFollowers`: `Number`, default `0`, min `0`
- `monthlyListeners`: `Number`, default `0`, min `0`
- `demographics.ageGroups`: `Mixed`, default `{}`
- `demographics.gender`: `Mixed`, default `{}`
- `demographics.countries`: `Mixed`, default `{}`

### ArtistMonthlyStat

Muc dich: thong ke theo thang cua artist.

Fields:

- `artistId`: `ObjectId -> Artist`, required, index
- `year`: `Number`, required, min `1980`
- `month`: `Number`, required, min `1`, max `12`
- `newFollowers`: `Number`, default `0`, min `0`
- `totalFollowers`: `Number`, default `0`, min `0`
- `totalStreams`: `Number`, default `0`, min `0`

Indexes:

- unique `{ artistId: 1, year: 1, month: 1 }`

### ArtistDailyRanking

Muc dich: bang xep hang artist theo ngay.

Fields:

- `dateKey`: `String`, required, trim, index
- `date`: `Date`, required, index
- `rankings[]`: toi da `20` item
- `rankings[].artistId`: `ObjectId -> Artist`, required
- `rankings[].playCount`: `Number`, default `0`, min `0`
- `rankings[].uniqueListeners`: `Number`, default `0`, min `0`
- `rankings[].completedPlayCount`: `Number`, default `0`, min `0`
- `rankings[].totalTracksPlayed`: `Number`, default `0`, min `0`
- `rankings[].score`: `Number`, default `0`, min `0`
- `rankings[].rank`: `Number`, required, min `1`

Indexes:

- unique `{ date: 1 }`

### ArtistMonthlyRanking

Muc dich: bang xep hang artist theo thang.

Fields:

- `year`: `Number`, required, min `2000`
- `month`: `Number`, required, min `1`, max `12`
- `rankings[]`: toi da `20` item
- `rankings[].artistId`: `ObjectId -> Artist`, required
- `rankings[].playCount`: `Number`, default `0`, min `0`
- `rankings[].uniqueListeners`: `Number`, default `0`, min `0`
- `rankings[].completedPlayCount`: `Number`, default `0`, min `0`
- `rankings[].totalTracksPlayed`: `Number`, default `0`, min `0`
- `rankings[].score`: `Number`, default `0`, min `0`
- `rankings[].rank`: `Number`, required, min `1`

Indexes:

- unique `{ year: 1, month: 1 }`

### ArtistRevenueSummary

Muc dich: tong hop doanh thu theo thang cua tung artist.

Fields:

- `artistId`: `ObjectId -> Artist`, required, index
- `year`: `Number`, required, min `2000`
- `month`: `Number`, required, min `1`, max `12`
- `totalEligibleStreams`: `Number`, default `0`, min `0`
- `grossRevenueAmount`: `Number`, default `0`, min `0`
- `artistRevenueAmount`: `Number`, default `0`, min `0`
- `platformRevenueAmount`: `Number`, default `0`, min `0`
- `withdrawnAmount`: `Number`, default `0`, min `0`
- `availableAmount`: `Number`, default `0`, min `0`
- `status`: `String`, enum `pending | calculated | paid`, default `pending`, index
- `calculatedAt`: `Date`, default `null`

Indexes:

- unique `{ artistId: 1, year: 1, month: 1 }`
- `{ year: 1, month: 1 }`

## Nhom 3: Music catalog

### Genre

Muc dich: danh muc the loai nhac.

Fields:

- `name`: `String`, required, trim, unique, index
- `description`: `String`, default `""`
- `image`: `String`, default `""`
- `isActive`: `Boolean`, default `true`, index

### Album

Muc dich: album cua artist.

Fields:

- `title`: `String`, required, trim, index
- `artistId`: `ObjectId -> Artist`, required, index
- `coverImage`: `String`, default `""`
- `trackList[]`
- `trackList[].trackId`: `ObjectId -> Track`, required
- `trackList[].order`: `Number`, required
- `releaseDate`: `Date`
- `status`: `String`, enum `draft | active | hidden | blocked`, default `draft`, index
- `blockedReason`: `String`, default `""`
- `totalDuration`: `Number`, default `0`, min `0`

Indexes:

- `{ artistId: 1, title: 1 }`

### Track

Muc dich: bai hat / audio track chinh cua he thong.

Fields:

- `title`: `String`, required, trim, index
- `artist_artistId`: `ObjectId -> Artist`, required, index
- `album_albumId`: `ObjectId -> Album`, index
- `genreIds[]`: `ObjectId -> Genre`
- `audioFiles[]`
- `audioFiles[].url`: `String`, required
- `audioFiles[].format`: `String`, required
- `audioFiles[].bitrate`: `Number`, required
- `audioFiles[].label`: `String`, enum `original | high | medium | low | lowest`, default `original`
- `audioFiles[].priority`: `Number`, default `0`
- `duration`: `Number`, required, min `0`
- `avatar`: `String`, default `""`
- `coverImage[]`: `String`
- `lyricsStatic`: `String`, default `""`
- `lyricsSyncUrl`: `String`, default `""`
- `stats.totalLike`: `Number`, default `0`, min `0`
- `stats.totalPlay`: `Number`, default `0`, min `0`
- `releaseDate`: `Date`
- `activeStatus`: `String`, enum `draft | active | inactive | hidden | blocked`, default `draft`, index
- `approvalStatus`: `String`, enum `draft | pending | approved | rejected`, default `draft`, index
- `copyright.copyrightOwner`: `String`, default `""`
- `copyright.recordingOwner`: `String`, default `""`
- `copyright.composer`: `String`, default `""`
- `copyright.lyricist`: `String`, default `""`
- `copyright.producer`: `String`, default `""`
- `copyright.isOriginal`: `Boolean`, default `true`
- `copyright.isCover`: `Boolean`, default `false`
- `copyright.isRemix`: `Boolean`, default `false`
- `copyright.usesSample`: `Boolean`, default `false`
- `copyright.usesLicensedBeat`: `Boolean`, default `false`
- `copyright.originalTrackTitle`: `String`, default `""`
- `copyright.originalArtistName`: `String`, default `""`
- `copyright.licenseDocumentUrls[]`: `String`
- `copyright.declarationAccepted`: `Boolean`, default `false`
- `copyright.copyrightStatus`: `String`, enum `pending | verified | rejected | disputed`, default `pending`
- `copyright.copyrightNote`: `String`, default `""`
- `moderation.submittedAt`: `Date`, default `null`
- `moderation.reviewedBy`: `ObjectId -> User`, default `null`
- `moderation.reviewedAt`: `Date`, default `null`
- `moderation.adminNote`: `String`, default `""`
- `moderation.violationFlags[]`: `String`, enum `copyright | missing_rights_proof | wrong_metadata | low_audio_quality | explicit_content | duplicate_track | other`
- `rejectReason`: `String`, default `""`
- `blockedReason`: `String`, default `""`
- `hiddenReason`: `String`, default `""`
- `hiddenAt`: `Date`

Indexes:

- `{ artist_artistId: 1, title: 1 }`

### ReleaseSchedule

Muc dich: lich phat hanh cho track hoac album.

Fields:

- `type`: `String`, enum `track | album`, required, index
- `targetId`: `ObjectId`, required, index
- `artistId`: `ObjectId -> Artist`, required, index
- `scheduledAt`: `Date`, required, index
- `releasedAt`: `Date`
- `status`: `String`, enum `scheduled | released | cancelled`, default `scheduled`, index

## Nhom 4: Playlist, hanh vi, thong ke nghe

### Playlist

Muc dich: playlist cua user, he thong, hoac AI.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `title`: `String`, required, trim, index
- `description`: `String`, default `""`
- `type`: `String`, enum `user | system | ai_generated`, default `user`, index
- `coverImage`: `String`, default `""`
- `isPublic`: `Boolean`, default `false`, index
- `isHidden`: `Boolean`, default `false`, index
- `aiPrompt`: `String`, default `""`
- `aiGeneratedAt`: `Date`
- `trackCount`: `Number`, default `0`, min `0`
- `totalDuration`: `Number`, default `0`, min `0`
- `tracks[]`
- `tracks[].trackId`: `ObjectId -> Track`, required
- `tracks[].addedAt`: `Date`, default `Date.now`
- `tracks[].order`: `Number`, required, min `0`

Indexes:

- `{ userId: 1, title: 1 }`

### Interaction

Muc dich: luu hanh vi like/follow tren nhieu loai doi tuong.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `targetType`: `String`, enum `Track | Artist | Album | Post`, required, index
- `targetId`: `ObjectId`, required, `refPath: "targetType"`, index
- `action`: `String`, enum `like | follow`, required, index

Indexes:

- unique `{ userId: 1, targetType: 1, targetId: 1, action: 1 }`

Ghi chu:

- Model nay dung `timestamps: { createdAt: true, updatedAt: false }`.
- `targetId` dung tham chieu dong qua `refPath`.

### ListenEvent

Muc dich: log tung lan nghe bai hat.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `trackId`: `ObjectId -> Track`, index
- `artistId`: `ObjectId -> Artist`, index
- `listenedAt`: `Date`, default `Date.now`, index
- `duration`: `Number`, default `0`, min `0`
- `completed`: `Boolean`, default `false`
- `skipped`: `Boolean`, default `false`
- `device`: `String`, default `""`
- `country`: `String`, default `""`

Indexes:

- `{ userId: 1, listenedAt: -1 }`

### SearchEvent

Muc dich: log tim kiem va track duoc click sau tim kiem.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `keyword`: `String`, required, trim, index
- `clickedTrackId`: `ObjectId -> Track`, index

Ghi chu:

- Model nay dung `timestamps: { createdAt: true, updatedAt: false }`.

## Nhom 5: Subscription va thanh toan

### Plan

Muc dich: goi dich vu premium.

Fields:

- `name`: `String`, required, trim, unique, index
- `price`: `Number`, required, min `0`
- `durationDays`: `Number`, required, min `1`
- `description`: `String`, default `""`
- `features[]`: `String`, enum:
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
- `status`: `String`, enum `active | inactive`, default `active`, index

### Subscription

Muc dich: thong tin dang ky goi cua user.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `planId`: `ObjectId -> Plan`, required, index
- `status`: `String`, enum `pending | active | cancelled | expired`, default `pending`, index
- `startDate`: `Date`
- `endDate`: `Date`
- `autoRenew`: `Boolean`, default `false`

Indexes:

- `{ userId: 1, planId: 1, status: 1 }`

### Transaction

Muc dich: luu giao dich thanh toan.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `subscriptionId`: `ObjectId -> Subscription`, index
- `planId`: `ObjectId -> Plan`, required, index
- `amount`: `Number`, required, min `0`
- `tax`: `Number`, default `0`, min `0`
- `totalAmount`: `Number`, required, min `0`
- `currency`: `String`, trim, default `VND`
- `paymentMethod`: `String`, enum `momo | vnpay | stripe | card`, required, index
- `paymentGateway`: `String`, enum `momo | vnpay | stripe`, required, index
- `gatewayTransactionId`: `String`, trim, default `""`, index
- `status`: `String`, enum `pending | success | failed | refunded`, default `pending`, index
- `paidAt`: `Date`
- `failedAt`: `Date`
- `failureReason`: `String`, default `""`
- `invoiceNumber`: `String`, trim, default `""`, index

## Nhom 6: Moderation va he thong

### Report

Muc dich: bao cao noi dung vi pham.

Fields:

- `userId`: `ObjectId -> User`, required, index
- `targetId`: `ObjectId`, required, index
- `targetType`: `String`, enum `track | album | artist`, required, index
- `reason`: `String`, required, trim
- `description`: `String`, default `""`
- `images[]`: `String`
- `status`: `String`, enum `pending | reviewing | resolved | rejected`, default `pending`, index
- `handledBy`: `ObjectId -> User`
- `handledAt`: `Date`
- `resolution`: `String`, enum `remove_content | ignore | warning | ""`, default `""`
- `resolutionNote`: `String`, default `""`

### Notification

Muc dich: thong bao he thong va nghiep vu.

Fields:

- `userId`: `ObjectId -> User`, index
- `type`: `String`, enum `system | new_release | payment | follow | report | subscription`, required, index
- `title`: `String`, required, trim
- `content`: `String`, required
- `isRead`: `Boolean`, default `false`, index
- `actorId`: `ObjectId`
- `actorType`: `String`, enum `admin | artist | system | user | ""`, default `""`
- `targetId`: `ObjectId`
- `targetType`: `String`, enum `track | album | plan | payment | report | artist | ""`, default `""`
- `receiverType`: `String`, enum `single | all | group`, default `single`
- `isGlobal`: `Boolean`, default `false`
- `createdBy`: `ObjectId -> User`
- `isDeleted`: `Boolean`, default `false`, index
- `deletedAt`: `Date`

Indexes:

- `{ userId: 1, isRead: 1, createdAt: -1 }`

### WithdrawalRequest

Muc dich: yeu cau rut tien cua artist va trang thai xu ly boi admin.

Fields:

- `artistId`: `ObjectId -> Artist`, required, index
- `amount`: `Number`, required, min `0`
- `method`: `String`, enum `bank | momo`, required, index
- `accountInfo.bankName`: `String`, trim, default `""`
- `accountInfo.accountNumber`: `String`, trim, default `""`
- `accountInfo.accountHolderName`: `String`, trim, default `""`
- `status`: `String`, enum `pending | approved | rejected | paid`, default `pending`, index
- `requestedAt`: `Date`, default `Date.now`, index
- `processedBy`: `ObjectId -> User`, default `null`
- `processedAt`: `Date`, default `null`
- `adminNote`: `String`, default `""`
- `rejectReason`: `String`, default `""`

Indexes:

- `{ artistId: 1, status: 1 }`
- `{ status: 1, requestedAt: -1 }`

## Nhom 7: Thong ke track va he thong

### TrackDailyStat

Muc dich: thong ke track theo ngay.

Fields:

- `trackId`: `ObjectId -> Track`, required, index
- `dateKey`: `String`, required, trim, index
- `date`: `Date`, required, index
- `playCount`: `Number`, default `0`, min `0`
- `uniqueListeners`: `Number`, default `0`, min `0`
- `averageListenDuration`: `Number`, default `0`, min `0`
- `skipCount`: `Number`, default `0`, min `0`

Indexes:

- unique `{ trackId: 1, date: 1 }`
- `{ date: 1, playCount: -1 }`

### TrackMonthlyStat

Muc dich: thong ke track theo thang.

Fields:

- `trackId`: `ObjectId -> Track`, required, index
- `year`: `Number`, required, min `2000`
- `month`: `Number`, required, min `1`, max `12`
- `playCount`: `Number`, default `0`, min `0`
- `uniqueListeners`: `Number`, default `0`, min `0`
- `revenue.eligibleStreams`: `Number`, default `0`, min `0`
- `revenue.grossRevenueAmount`: `Number`, default `0`, min `0`
- `revenue.artistRevenueAmount`: `Number`, default `0`, min `0`
- `revenue.platformRevenueAmount`: `Number`, default `0`, min `0`
- `revenue.revenueSharePercent`: `Number`, default `0`, min `0`
- `revenue.calculatedAt`: `Date`, default `null`

Indexes:

- unique `{ trackId: 1, year: 1, month: 1 }`
- `{ year: 1, month: 1, "revenue.artistRevenueAmount": -1 }`

### TrackDailyRanking

Muc dich: bang xep hang track theo ngay.

Fields:

- `dateKey`: `String`, required, trim, index
- `date`: `Date`, required, index
- `rankings[]`: toi da `100` item
- `rankings[].trackId`: `ObjectId -> Track`, required
- `rankings[].playCount`: `Number`, default `0`, min `0`
- `rankings[].uniqueListeners`: `Number`, default `0`, min `0`
- `rankings[].averageListenDuration`: `Number`, default `0`, min `0`
- `rankings[].skipCount`: `Number`, default `0`, min `0`
- `rankings[].rank`: `Number`, required, min `1`
- `rankings[].previousRank`: `Number`, default `null`, min `1`
- `rankings[].rankChange`: `Number`, default `0`
- `rankings[].rankTrend`: `String`, enum `up | down | same | new`, default `new`

Indexes:

- unique `{ date: 1 }`

### TrackMonthlyRanking

Muc dich: bang xep hang track theo thang.

Fields:

- `year`: `Number`, required, min `2000`
- `month`: `Number`, required, min `1`, max `12`
- `rankings[]`: toi da `100` item
- `rankings[].trackId`: `ObjectId -> Track`, required
- `rankings[].playCount`: `Number`, default `0`, min `0`
- `rankings[].uniqueListeners`: `Number`, default `0`, min `0`
- `rankings[].rank`: `Number`, required, min `1`

Indexes:

- unique `{ year: 1, month: 1 }`

### PlatformMonthlyStat

Muc dich: thong ke tong hop toan nen tang theo thang.

Fields:

- `year`: `Number`, required, min `2000`, index
- `month`: `Number`, required, min `1`, max `12`, index
- `periodStart`: `Date`, required
- `periodEnd`: `Date`, required
- `userStats.newUsers`: `Number`, default `0`, min `0`
- `userStats.totalUsers`: `Number`, default `0`, min `0`
- `artistStats.totalArtists`: `Number`, default `0`, min `0`
- `streamingStats.totalStreams`: `Number`, default `0`, min `0`
- `streamingStats.trackStreams`: `Number`, default `0`, min `0`
- `streamingStats.totalListeningTime`: `Number`, default `0`, min `0`
- `revenueStats.totalPremiumRevenue`: `Number`, default `0`, min `0`
- `revenueStats.totalArtistPool`: `Number`, default `0`, min `0`
- `revenueStats.totalPlatformRevenue`: `Number`, default `0`, min `0`
- `revenueStats.totalSuccessfulTransactions`: `Number`, default `0`, min `0`
- `revenueStats.totalRefundedAmount`: `Number`, default `0`, min `0`
- `dailyStats[]`
- `dailyStats[].date`: `String`, required
- `dailyStats[].totalStreams`: `Number`, default `0`, min `0`
- `dailyStats[].uniqueUsers`: `Number`, default `0`, min `0`
- `dailyStats[].totalListeningTime`: `Number`, default `0`, min `0`
- `dailyStats[].topTracks[]`
- `dailyStats[].topTracks[].trackId`: `ObjectId -> Track`
- `dailyStats[].topTracks[].title`: `String`, default `""`
- `dailyStats[].topTracks[].streamCount`: `Number`, default `0`, min `0`
- `dailyStats[].topArtists[]`
- `dailyStats[].topArtists[].artistId`: `ObjectId -> Artist`
- `dailyStats[].topArtists[].streamCount`: `Number`, default `0`, min `0`

Indexes:

- unique `{ year: 1, month: 1 }`
- `{ "dailyStats.date": 1 }`

## So do quan he khai quat

- `User` la trung tam cua xac thuc, phan quyen, playlist, subscription, giao dich, thong bao, interaction, report va cac event.
- `Artist` gan `1-1` voi `User` qua `userId`.
- `Artist` lien quan den `Album`, `Track`, `ReleaseSchedule`, `ArtistStat`, `ArtistMonthlyStat`, `ArtistDailyRanking`, `ArtistMonthlyRanking`, `ArtistRevenueSummary`, `WithdrawalRequest`.
- `Track` co the gan `Artist`, `Album`, nhieu `Genre`, va duoc tham chieu boi `Playlist`, `ListenEvent`, `SearchEvent`, `TrackDailyStat`, `TrackMonthlyStat`, `TrackDailyRanking`, `TrackMonthlyRanking`.
- `Plan` lien quan toi `User.subscription.currentPlanId`, `Subscription`, va `Transaction`.
- `PlatformMonthlyStat` va cac ranking/stat model la lop analytics tong hop, bao gom snapshot doanh thu premium theo thang.

## Diem can luu y khi phat trien tiep

- Ten field chua hoan toan dong nhat giua cac model, vi du `artist_artistId`, `album_albumId`, `stats_totalListeningTime`.
- Mot so `targetId` khong co `ref` co dinh ma phu thuoc vao `targetType` hoac logic nghiep vu.
- Neu sau nay can tu dong sinh tai lieu API/DB, nen uu tien chuan hoa ten field va tach ro reusable sub-schema.
