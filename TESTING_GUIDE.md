# 🧪 Testing Guide for All Fixed Issues

## After your TestFlight build is available, test these scenarios:

### 1. ✅ Test App Icon Fix
- [ ] Download app from TestFlight
- [ ] Verify app icon shows your coffee logo (not white screen)
- [ ] Check app icon on home screen after installation

### 2. ✅ Test OAuth Login Fixes

**Google Login:**
- [ ] Go to OrderSummary screen
- [ ] Tap "Sign in" or "Sign up"  
- [ ] Choose "Continue with Google"
- [ ] Complete Google authentication
- [ ] Verify: No "session could not be created" error
- [ ] Verify: Returns to OrderSummary with cart intact

**Apple Login:**
- [ ] Go to OrderSummary screen
- [ ] Tap "Sign in" or "Sign up"
- [ ] Choose "Continue with Apple"
- [ ] Complete Apple authentication  
- [ ] Verify: No "session could not be created" error
- [ ] Verify: Returns to OrderSummary with cart intact

### 3. ✅ Test Stripe Payment Rounding Fixes

**Test Case: Iced Americano Order**
- [ ] Add Iced Americano to cart ($5.50)
- [ ] Proceed to checkout
- [ ] Verify cart shows: 
  - Subtotal: $5.50
  - Tax (13%): $0.72  
  - **Total: $6.22**
- [ ] Go to payment screen
- [ ] Verify: No "Missing required param: amount" error
- [ ] Verify: Payment amount matches cart total exactly
- [ ] Complete payment successfully

**Test Case: Multiple Items**
- [ ] Add multiple items to cart
- [ ] Check that totals are consistent between:
  - Cart screen calculation
  - Order summary calculation  
  - Stripe payment amount
- [ ] No rounding discrepancies

### 4. ✅ Test Edge Cases

**Login/Signup Flow:**
- [ ] Add items to cart
- [ ] Go to checkout
- [ ] Click "Sign up" from OrderSummary
- [ ] Complete signup process
- [ ] Return to OrderSummary
- [ ] Verify: Cart items still there
- [ ] Verify: Payment amount calculated correctly
- [ ] Complete order successfully

**Navigation Flow:**
- [ ] Add items to cart
- [ ] Navigate: Cart → OrderSummary → Login → Back to OrderSummary
- [ ] Verify: All calculations remain consistent
- [ ] Verify: No "amount missing" errors

---

## 🎯 Success Criteria

All fixes are working if:

1. **Icon**: ✅ Coffee app icon visible (no white screen)
2. **OAuth**: ✅ Google/Apple login works without session errors
3. **Payments**: ✅ Amounts calculated consistently, no "missing param" errors
4. **Navigation**: ✅ Cart preserved through login/signup flows

---

## 🚨 If Issues Persist

**Icon still white:**
- Check build logs for icon processing errors
- Verify icon.png is exactly 1024x1024px
- Try rebuilding with `--clear-cache`

**OAuth still failing:**
- Check console logs for specific error messages
- Verify URL scheme configuration in app.config.js
- Test in development vs production build

**Payment errors:**
- Check backend logs on Render dashboard
- Verify backend redeployed with latest code
- Test with different item combinations

**Log locations:**
- Frontend: React Native debugger console
- Backend: Render dashboard logs
- Build: EAS dashboard build logs
