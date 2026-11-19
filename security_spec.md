# Security Specification — ရေချမ်းအိုးကျောင်းတိုက် (Yae Chan Oh Kyaung Tike)

## 1. Data Invariants
1. **Owner-Only PII Isolation**: `userProfiles/{userId}` contains `email` and account details. Only `request.auth.uid == userId` with `email_verified == true` may read or write their own profile; `list` queries on `userProfiles` are unconditionally denied.
2. **Verified Bootstrapped Admin (`ashinzargara08@gmail.com`)**: Admin privileges (`posts`, `audioTalks`, `videos`, `books` CRUD and comment moderation) are granted ONLY when `request.auth != null`, `request.auth.token.email_verified == true`, and (`request.auth.token.email == 'ashinzargara08@gmail.com'` or `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`).
3. **Deterministic Identity-Bound Reactions**: `reactions/{reactionId}` requires deterministic ID `${postId}_${reactionType}_${request.auth.uid}` and `isPublic == true`.
4. **Author-Bound Comments**: `comments/{commentId}` requires `authorId == request.auth.uid`, strict size limits (`text` 1..1000 chars), server timestamp (`request.time`), and `isPublic == true`. Only the author or verified Admin (`ashinzargara08@gmail.com`) may delete a comment.
5. **No Shadow Fields or Timestamp Spoofing**: Every collection enforces strict `keys().hasAll(...)` and `keys().hasOnly(...)` schema validation, `createdAt == request.time` on creation, and `updatedAt == request.time` on updates.

## 2. The "Dirty Dozen" Adversarial Payloads
1. Unauthenticated `create` on `posts/p1` -> `PERMISSION_DENIED`
2. Non-admin verified user (`japan99848090@gmail.com`) `create` on `posts/p1` -> `PERMISSION_DENIED`
3. Spoofed admin email with `email_verified: false` (`ashinzargara08@gmail.com`, unverified) `create` on `audioTalks/a1` -> `PERMISSION_DENIED`
4. Shadow field injection `create` on `userProfiles/{uid}` with `isAdmin: true` -> `PERMISSION_DENIED`
5. Cross-user PII read `get` on `userProfiles/victim_uid` by non-owner -> `PERMISSION_DENIED`
6. User profile scraping `list` on `userProfiles` -> `PERMISSION_DENIED`
7. Non-admin `update` or `delete` on `videos/v1` or `books/b1` -> `PERMISSION_DENIED`
8. Backdated `createdAt` timestamp spoofing on `posts/p2` even by admin -> `PERMISSION_DENIED`
9. Oversized comment text > 1000 chars on `comments/c4` -> `PERMISSION_DENIED`
10. Invalid `audioTalks.category` enum value on `audioTalks/a2` -> `PERMISSION_DENIED`
11. Unauthorized deletion of another user's comment by non-admin -> `PERMISSION_DENIED`
12. Immutable `createdBy` / `createdAt` mutation on `books/b1` update -> `PERMISSION_DENIED`
