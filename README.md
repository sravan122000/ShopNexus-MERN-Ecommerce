# ShopNexus — Complete MERN E-commerce Project

A beginner-friendly full-stack e-commerce application implementing the four modules in the supplied requirements PDF.

## Stack
- React + Vite, React Router, Axios
- Node.js + Express, MongoDB + Mongoose
- JWT authentication, bcrypt password hashing, role-based access
- Razorpay Checkout (server-created orders and signature verification)
- Nodemailer email notifications and password-reset OTP
- Multer image uploads (local `backend/uploads` storage)
- PDF invoices with PDFKit

## Requirements
Node.js 18.18+ (20 LTS recommended), MongoDB 6+, npm.

## Setup
1. Extract the ZIP.
2. Start MongoDB locally or create a MongoDB Atlas database.
3. Backend:
   ```bash
   cd backend
   Copy-Item .env.example .env
   npm install
   npm run seed:admin
   npm run dev
   ```
4. Frontend (new terminal):
   ```bash
   cd frontend
   Copy-Item .env.example .env
   npm install
   npm run dev
   ```
5. Open `http://localhost:5173`.

Default seeded admin is controlled by `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `backend/.env`. Change the password before deployment.

## Environment configuration
See `backend/.env.example` and `frontend/.env.example`. Razorpay and SMTP features require your own credentials. The app remains usable for COD without Razorpay keys. Do not put secrets in frontend environment variables.

## Main user flows
- Register / login, browse and search products, filter categories
- Product details and related products, wishlist
- Cart quantity management (server validates stock), address book and checkout
- COD or Razorpay checkout, order history, eligible cancellation and tracking
- Profile editing, email OTP password reset
- Invoice PDF download

## Admin flows
- Admin login and dashboard
- Category and product management, 1–3 product images, stock and pricing. Delete actions are soft-deletes (deactivation) so existing order history and references remain intact.
- Block / unblock users
- Order list and full order details (customer, items, totals, delivery address) and status transitions
- Coupon create/edit/deactivate
- Sales summary and date-range report

## Notes
- Product images are stored in `backend/uploads`; this is suitable for local development. For production, replace local storage with S3/Cloudinary and configure persistent storage.
- Razorpay requires a valid Key ID and Key Secret. Signature verification is performed on the backend.
- SMTP credentials are needed for email OTP and order notifications. If SMTP is not configured, email sending is skipped with a server log; password reset OTP is still generated but is not exposed in the API response.
- Validate and configure HTTPS, secure cookies/token storage, rate limiting, backups, and production image storage before public deployment.
- Run `npm run test` in the backend for the included API utility tests.


## Security and distribution
- The distributable ZIP intentionally excludes `.env` files and all `node_modules` folders. Copy each `.env.example` to `.env` and enter your own local credentials.
- Generate a unique long random `JWT_SECRET`; change the seeded admin password immediately.
- Never commit or share backend `.env`, SMTP passwords, Razorpay secrets, or database credentials. Rotate any credentials that have previously been shared.
- `frontend/.env` must contain only public configuration. Razorpay secret keys stay in `backend/.env`; the backend supplies the public Key ID to checkout.
- For public deployment, configure HTTPS, a production email provider, secure token handling, database backups, and persistent image storage.
- Run `npm test` in `backend` to execute the included utility tests.
