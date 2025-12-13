# Work Log

## December 13, 2024

### AWS Cleanup - Old Project Resources Deleted

**Context:** User requested review and cleanup of AWS resources to reduce costs and remove unused resources from old projects.

**Resources Deleted:**

#### S3 Buckets (25 total)
All non-Family Helper buckets were deleted:

1. `aws-sam-cli-managed-default-samclisourcebucket-bq87ca08br21` (versioned bucket)
2. `cf-templates-od1244c63r93-ap-southeast-2`
3. `custom-mannequin-dev-distbucket-ykmp77zgz7t9`
4. `custom-mannequin-dev-serverlessdeploymentbucket-4v29bneox4c7`
5. `custom-mannequin-prod-serverlessdeploymentbucket-rthjxjn7wv3e`
6. `custom-mannequin-producti-serverlessdeploymentbuck-6oljoglmm13p`
7. `game1-02-dev-serverlessdeploymentbucket-cub6nejs6z6i`
8. `game1-02-dev-serverlessdeploymentbucket-lpovjw3xc9jp`
9. `game1-dev-distbucket-bxqschnuvgcs`
10. `game1-dev-distbucket-cjtaigjqwme8`
11. `game1-dev-serverlessdeploymentbucket-lywjl2qfc5v0`
12. `game1-dev-serverlessdeploymentbucket-tmhywoefarcg`
13. `iamusernotify`
14. `internalskillsearch-dev-distbucket-nvdcjzxnukgf`
15. `internalskillsearch-dev-serverlessdeploymentbucket-etrjk5d24l7m`
16. `rosterhelperserverless-d-serverlessdeploymentbuck-eibmuk6kc2fz`
17. `rosterhelperserverless-dev-distbucket-1qibg6gymgza1`
18. `serverless-custom-manneq-serverlessdeploymentbuck-bnu8cav6n6hz`
19. `serverless-custom-mannequin-dev-distbucket-h3z2bwaed5w7`
20. `serverless-custom-manniquin-dev-distbucket-1ktpqp6vkfnde`
21. `serverless-portfolio-dev-distbucket-7iebujnzoka9`
22. `serverless-portfolio-dev-serverlessdeploymentbuck-lbv1pey9lsjd`
23. `serverlessreactboilerplat-serverlessdeploymentbuck-sl5brotv9wna`
24. `ssa-dev-distbucket-nwavsfzrvicz`
25. `ssa-dev-serverlessdeploymentbucket-cyjhvzyu6xch`

#### CloudFront Distribution (1)
- `E1FANZJFDUQV1` (d2o5ja8q1b1ri4.cloudfront.net)
  - Domain alias: custommannequin.com
  - Origin: f25i7f8kq1.execute-api.ap-southeast-2.amazonaws.com/dev (deleted API Gateway)
  - Status: Had to disable first, wait for deployment, then delete

**Commands Used:**
```bash
# Delete regular S3 buckets
aws s3 rb s3://bucket-name --force

# Delete versioned bucket (required special handling)
aws s3api list-object-versions --bucket bucket-name --query 'Versions[].{Key:Key,VersionId:VersionId}' --output text | while read key versionId; do
  aws s3api delete-object --bucket bucket-name --key "$key" --version-id "$versionId"
done
# Also delete DeleteMarkers, then delete bucket

# Delete CloudFront (must disable first)
aws cloudfront get-distribution-config --id E1FANZJFDUQV1 > config.json
# Modify config to set Enabled: false
aws cloudfront update-distribution --id E1FANZJFDUQV1 --distribution-config file://config-disabled.json --if-match ETAG
# Wait for Status: Deployed
aws cloudfront delete-distribution --id E1FANZJFDUQV1 --if-match NEW_ETAG
```

**Remaining AWS Resources (Family Helper only):**
| Resource | Name/ID |
|----------|---------|
| S3 | family-helper-files-prod, family-helper-web-prod |
| CloudFront | EOFB5YCW926IM (familyhelperapp.com) |
| Lightsail | family-helper-prod (52.65.37.116) |
| EC2 | family-helper-bastion (i-085ac3030ad9e712c) |
| RDS | family-helper-db-prod |
| Lambda | family-helper-media-processor-prod |

**Monthly Cost Estimate:** ~$50-70/month (no change - deleted resources were already inactive)

**Documentation Updated:** `infrastructure/AWS_RESOURCES.md`

---

### Bug Fixes - Registry Passcode Reset & Emoji Picker

**Bug 1: Gift Registry Reset Passcode 404 Error**

**Symptom:** Error when clicking "Reset Passcode" on gift registry:
```
POST /users/personal-registries/gift-registries/:id/reset-passcode 404 (Not Found)
```

**Root Cause:** HTTP method mismatch:
- Frontend was using `api.post()`
- Backend route expected `PUT`

**Files Fixed:**
1. `mobile-main/src/screens/account/PersonalGiftRegistryDetailScreen.jsx` (line 129)
   - Changed `api.post()` to `api.put()`
2. `mobile-main/src/screens/account/PersonalItemRegistryDetailScreen.jsx` (line 129)
   - Changed `api.post()` to `api.put()`

**Additional Fix - Missing Group Item Registry Endpoint:**
The group-level item registry was missing the reset-passcode endpoint entirely.

3. `backend/controllers/itemRegistry.controller.js`
   - Added `resetPasscode()` function (lines 1462-1561)
4. `backend/routes/itemRegistry.routes.js`
   - Added POST route for `/:registryId/reset-passcode` (lines 69-74)

---

**Bug 2: Reaction Search Box Disappearing**

**Symptom:** When clicking inside the emoji picker search box on web, the modal closes.

**Root Cause:** Click events were propagating through the emoji picker container to the parent TouchableOpacity overlay, triggering the close handler.

**Fix:** Wrapped the emoji picker container in a `Pressable` component with `onPress={(e) => e.stopPropagation()}` to prevent event bubbling.

**File Fixed:** `mobile-main/src/screens/groups/MessagesScreen.jsx`
- Lines 1429-1442: Message input emoji picker
- Lines 1461-1474: Reaction emoji picker

**Changes:**
```jsx
// Before (View doesn't stop propagation)
<View style={styles.webEmojiPickerContainer}>
  <WebEmojiPicker ... />
</View>

// After (Pressable stops propagation)
<Pressable
  style={styles.webEmojiPickerContainer}
  onPress={(e) => e.stopPropagation()}
>
  <WebEmojiPicker ... />
</Pressable>
```

---
