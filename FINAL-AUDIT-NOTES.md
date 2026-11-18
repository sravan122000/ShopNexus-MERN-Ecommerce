# ShopNexus finalization notes

## Changes in this package
1. Added an admin-only `GET /api/orders/admin/:id` endpoint that returns the full order, including customer, purchased items, totals, payment information, and delivery address.
2. Added a **View details** panel to the admin Orders tab.
3. Removed `Cancelled` from the admin status dropdown because the backend intentionally rejects admin status changes to Cancelled. The supported admin statuses now match the PDF: Pending, Processing, Shipped, Delivered.
4. Extracted reusable quantity and discount calculations into `backend/src/utils/commerce.js` and added tests for valid/invalid quantities, percentage discounts, fixed discounts, subtotal caps, and maximum discount caps.
5. Kept category/product deletion as soft-deactivation. This preserves historical references and supports reactivation; the UI explicitly calls these actions Deactivate rather than pretending records are permanently deleted.
6. Added frontend `.gitignore` and removed `.env` files and `node_modules` from the distributable ZIP. Safe `.env.example` files are included.

## Verification performed during packaging
- Backend automated tests: 5 passed, 0 failed.
- Node syntax checks: all 17 backend source JavaScript files passed.
- The previous manual end-to-end customer-to-delivery test for order `#39ceb289` was successful (COD order; customer saw Delivered; COD payment remains Pending until collected).

## Still requires local verification
- Run `npm install` in `backend` and `frontend`, then run `npm test` in backend and `npm run build` in frontend on the target Windows machine. A clean frontend build could not be confirmed in the packaging environment because its Vite executable was unavailable/permission-blocked after dependency installation timed out.
- Open Admin > Orders > View details in the local app and confirm the new details panel renders correctly.
- Confirm the `.env` files are created locally from the examples and populated with newly rotated credentials.
- Production Razorpay, production SMTP delivery, deployment security, and webhook handling are not certified by this local test package.
