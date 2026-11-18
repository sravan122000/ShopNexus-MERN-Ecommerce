# ShopNexus — Module 1: Authentication & Product Management

This release is organized around Module 1 of the supplied Beginner E-commerce Project PDF.

## Included Module 1 requirements

### Admin
- Admin login using the same login endpoint with a database-backed `admin` role.
- Create, list, edit and deactivate categories.
- Create, list, edit and deactivate products.
- Product image upload: 1–3 JPEG, PNG, WebP or GIF images, up to 5 MB each.
- Manage product name, description, price, stock and category.
- List users and block/unblock user accounts.

### User
- Home page with active product listings.
- Registration and login with frontend and backend validation.
- Password hashing with bcrypt (12 rounds) and JWT authentication.
- Product detail page with product images, price, description, stock and category.
- Search products by name/description and filter by category.

## Requirements
- Node.js 20+
- MongoDB local instance or MongoDB Atlas connection

## Setup

1. Open a terminal in `backend`.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and configure `MONGO_URI`, a long random `JWT_SECRET`, and admin credentials.
4. Run `npm run seed:admin` to create or promote the configured admin account.
5. Run `npm run dev`.
6. Open another terminal in `frontend`.
7. Run `npm install`.
8. Copy `.env.example` to `.env` if needed. The default API URL is `http://localhost:5000/api`.
9. Run `npm run dev` and open the Vite URL, normally `http://localhost:5173`.

## First login
Use the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values configured in `backend/.env`. Change the example password before using the app outside local development.

Register a normal account through the website to test the user experience. Admin-created categories and products appear on the public shop page.

## Important implementation notes
- Product/category deletion is implemented as soft deletion (`isActive=false`) to preserve existing references and order history.
- The backend independently enforces admin authorization; hiding admin screens in the frontend is not the security boundary.
- Blocked users are rejected by the authentication middleware, including when they still possess an old JWT.
- Uploaded product images are stored in `backend/uploads` and served from `/uploads`.
- Payment, cart, checkout, orders, wishlist, coupons, reports and invoices belong to Modules 2–4 and are not part of this Module 1 acceptance check.

## Module 1 acceptance checklist
- [ ] MongoDB connection succeeds.
- [ ] Admin can log in and open the Admin panel.
- [ ] Admin can create, edit and deactivate categories.
- [ ] Admin can create, edit and deactivate products with 1–3 images.
- [ ] Admin can change price, description and stock.
- [ ] Admin can block and unblock a registered user.
- [ ] User can register, log in and log out.
- [ ] User can browse product listings and product details.
- [ ] User can search by product name and filter by category.
- [ ] A blocked user cannot authenticate or continue using protected APIs.

The backend source files were checked with `node --check`. Full live integration testing requires a configured MongoDB instance and installed npm dependencies.
