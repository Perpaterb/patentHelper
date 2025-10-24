# Endpoint Change Checklist

## ⚠️ MANDATORY: Before Changing ANY Endpoint

**NEVER skip these steps. If you skip steps, you WILL break other apps.**

### Step 1: Check Current Documentation
```bash
# Read API.md to see what the endpoint currently returns
less API.md
```
- [ ] Read the endpoint definition in API.md
- [ ] Note which apps use this endpoint
- [ ] Note what fields they expect

### Step 2: Find ALL Consumers
```bash
# Run this script to find which apps use the endpoint
cd backend/scripts
./check-endpoint-usage.sh "/subscriptions/current"
```
- [ ] Check web-admin usage
- [ ] Check mobile-main usage
- [ ] Check mobile-messenger usage
- [ ] Read the code to see EXACTLY what fields each app uses

### Step 3: Update API.md FIRST
- [ ] Update API.md with the new structure
- [ ] Document all fields (old AND new)
- [ ] Mark which apps use which fields
- [ ] Get approval if removing/changing fields

### Step 4: Update Backend Code
- [ ] Make the change in the controller
- [ ] Keep old fields if any app still uses them
- [ ] Add new fields without breaking existing ones

### Step 5: Update Tests
- [ ] Update `__tests__/subscriptions.test.js` (or relevant test file)
- [ ] Add tests for new fields
- [ ] Ensure tests validate the structure in API.md

### Step 6: Run Tests
```bash
cd backend
npm test
```
- [ ] All tests pass
- [ ] No test failures

### Step 7: Manual Testing
- [ ] Test web-admin at http://localhost:3001
- [ ] Test mobile-main with Expo
- [ ] Test mobile-messenger (if applicable)
- [ ] Verify all apps still work

## Golden Rules

1. **API.md is the source of truth** - Update it FIRST, not last
2. **Never remove fields** - Apps may still be using them
3. **Adding fields is safe** - But still follow all steps
4. **Tests must match API.md** - They enforce the contract
5. **Check ALL 3 apps** - web-admin, mobile-main, mobile-messenger

## Example: Adding a Field

```javascript
// ✅ SAFE: Adding a new field
{
  isActive: true,      // Existing field
  isSubscribed: true,  // NEW field - apps that don't use it will ignore it
  createdAt: "..."     // NEW field
}
```

## Example: Removing a Field

```javascript
// ❌ DANGEROUS: Removing a field
{
  isActive: true,
  // isSubscribed: removed - THIS WILL BREAK APPS THAT USE IT!
}
```

**If you MUST remove a field:**
1. Find all consumers first
2. Update all consumers to NOT use that field
3. Deploy app updates
4. Then remove the field from backend
5. Update API.md
6. Update tests

## When in Doubt

**Ask the user!** Don't guess whether a change is safe.
