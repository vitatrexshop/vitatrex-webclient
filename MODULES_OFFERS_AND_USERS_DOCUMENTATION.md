# Offers, Bundles & Unified Promotions Module Documentation

This document provides the full backend API specifications, payload/response examples, and corresponding Angular frontend models and services for the **Offers & Bundles** module, the **Combined Promotions** endpoint, and the **Superadmin Admin/Team Management** module.

---

## 0. Unified Promotions Endpoint (`/api/v1/promotions/combined`)

### Endpoint Specification
*   **Method**: `GET`
*   **Route**: `/api/v1/promotions/combined` (or alias `/api/v1/offers/combined`)
*   **Access**: Public
*   **Description**: Merges all active **Offers** and active **Bundles** into a single unified JSON array with a `type: 'offer' | 'bundle'` discriminator.

### Backend Node.js / Express Controller Implementation
```javascript
// controllers/promotionController.js
const Offer = require('../models/Offer');
const Bundle = require('../models/Bundle');

exports.getCombinedPromotions = async (req, res, next) => {
  try {
    const now = new Date();

    // 1. Fetch active offers
    const offers = await Offer.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
      ],
    }).populate('items.product');

    // 2. Fetch active bundles
    const bundles = await Bundle.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        { startDate: { $lte: now }, endDate: { $gte: now } },
        { startDate: { $lte: now }, endDate: null },
        { startDate: null, endDate: { $gte: now } },
      ],
    })
      .populate('fixedProducts.product')
      .populate('selectableOptions');

    // 3. Map offers into unified format
    const normalizedOffers = offers.map((offer) => ({
      id: offer._id,
      type: 'offer',
      title: offer.title,
      slug: offer.slug,
      description: offer.description,
      badgeText: offer.badgeText || (offer.discountPercentage > 0 ? `وفر ${offer.discountPercentage}%` : null),
      image: offer.image,
      originalPrice: offer.originalPrice,
      discountedPrice: offer.offerPrice,
      discountPercentage: offer.discountPercentage,
      items: offer.items,
      createdAt: offer.createdAt,
    }));

    // 4. Map bundles into unified format
    const normalizedBundles = bundles.map((bundle) => ({
      id: bundle._id,
      type: 'bundle',
      title: bundle.title,
      slug: bundle.slug,
      description: bundle.description,
      badgeText: bundle.badgeText || (bundle.discountPercentage > 0 ? `وفر ${bundle.discountPercentage}%` : 'باقة التوفير'),
      image: bundle.image,
      originalPrice: bundle.originalPrice,
      discountedPrice: bundle.bundlePrice,
      discountPercentage: bundle.discountPercentage,
      fixedProducts: bundle.fixedProducts,
      selectableOptions: bundle.selectableOptions,
      createdAt: bundle.createdAt,
    }));

    // 5. Merge and sort
    const merged = [...normalizedBundles, ...normalizedOffers];

    return res.status(200).json({
      success: true,
      count: merged.length,
      data: merged,
    });
  } catch (error) {
    next(error);
  }
};
```

### Express Route Setup
```javascript
// routes/promotionRoutes.js
const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');

router.get('/combined', promotionController.getCombinedPromotions);

module.exports = router;

// in server.js / app.js:
// app.use('/api/v1/promotions', require('./routes/promotionRoutes'));
// app.use('/api/v1/offers/combined', promotionController.getCombinedPromotions);
```

---

## 1. Offers & Bundles Module

### Base Route: `/api/v1/offers`

### A. Endpoint Specifications

#### 1. Get All Offers (Public / Admin)
*   **Method**: `GET`
*   **Route**: `/api/v1/offers`
*   **Access**: Public (if requested by a non-logged-in client) / Admin (if requester is admin/superadmin, showing inactive offers too).
*   **Query Filtering**:
    *   *Public Client*: Returns only offers where `isActive: true` AND `startDate <= now <= endDate` (or no date restriction). Populates the nested product variants details.
    *   *Admin Client*: Returns all offers (active + inactive) populated with product details.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "64b0f37e4f1a2c001d8b4999",
          "title": "باقة التوفير العائلية",
          "slug": "باقة-التوفير-العائلية",
          "description": "وفر 30% مع باقة الفيتامينات الكاملة للعائلة",
          "image": "https://res.cloudinary.com/.../family_bundle.png",
          "badgeText": "الأكثر مبيعاً",
          "items": [
            {
              "product": {
                "_id": "64b0f37e4f1a2c001d8b4001",
                "name": "فيتامين ج للكبار",
                "slug": "vitamin-c-adults"
              },
              "quantity": 2
            }
          ],
          "originalPrice": 600,
          "offerPrice": 420,
          "discountPercentage": 30,
          "isActive": true,
          "startDate": "2026-08-01T00:00:00.000Z",
          "endDate": "2026-08-31T23:59:59.000Z",
          "createdAt": "2026-08-12T15:00:00.000Z",
          "updatedAt": "2026-08-12T15:00:00.000Z"
        }
      ]
    }
    ```

#### 2. Get Offer by Slug (Public)
*   **Method**: `GET`
*   **Route**: `/api/v1/offers/:slug`
*   **Access**: Public
*   **Response (200 OK)**: Returns the single offer details matching the slug if active and within date range. Returns `404` otherwise.

#### 3. Create Offer (Admin / Superadmin)
*   **Method**: `POST`
*   **Route**: `/api/v1/offers`
*   **Access**: Protected (Requires role: `admin` or `superadmin`)
*   **Payload (JSON)**:
    ```json
    {
      "title": "عرض نهاية الأسبوع المزدوج",
      "description": "احصل على عبوتين بسعر مخفض لفترة محدودة",
      "image": "https://res.cloudinary.com/.../offer.png",
      "badgeText": "عرض خاص",
      "items": [
        {
          "product": "64b0f37e4f1a2c001d8b4001",
          "quantity": 2
        }
      ],
      "originalPrice": 400,
      "offerPrice": 300,
      "startDate": "2026-08-14T00:00:00.000Z",
      "endDate": "2026-08-16T23:59:59.000Z",
      "isActive": true
    }
    ```
*   **Response (201 Created)**:
    *   *Note*: `slug` and `discountPercentage` are auto-calculated and returned.

#### 4. Update Offer (Admin / Superadmin)
*   **Method**: `PUT`
*   **Route**: `/api/v1/offers/:id`
*   **Access**: Protected (Requires role: `admin` or `superadmin`)
*   **Payload (JSON)**: Any subset of creation parameters. If `originalPrice` or `offerPrice` are changed, `discountPercentage` is recalculated automatically.

#### 5. Delete Offer (Admin / Superadmin)
*   **Method**: `DELETE`
*   **Route**: `/api/v1/offers/:id`
*   **Access**: Protected (Requires role: `admin` or `superadmin`)

---

### B. Angular Client Reference

#### 1. TypeScript Interfaces (`src/app/core/models/offer.model.ts`)
```typescript
import { ApiResponse } from './api-response.model';
import { Product } from './product.model';

export interface OfferItem {
  product: string | Product; // Product ID or populated Product details
  quantity: number;
}

export interface Offer {
  _id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  badgeText: string | null;
  items: OfferItem[];
  originalPrice: number;
  offerPrice: number;
  discountPercentage: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OfferPayload {
  title: string;
  slug?: string;
  description?: string;
  image: string;
  badgeText?: string | null;
  items: { product: string; quantity: number }[];
  originalPrice: number;
  offerPrice: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
}

export type OfferResponse = ApiResponse<Offer>;
export type OfferListResponse = ApiResponse<Offer[]>;
```

#### 2. Service Class (`src/app/core/services/offer.service.ts`)
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Offer, OfferPayload, OfferListResponse, OfferResponse } from '../models/offer.model';
import { ApiResponse } from '../models/api-response.model';

const API_BASE = '/api/v1/offers';

@Injectable({ providedIn: 'root' })
export class OfferService {
  constructor(private http: HttpClient) {}

  getOffers(): Observable<OfferListResponse> {
    return this.http.get<OfferListResponse>(API_BASE);
  }

  getOfferBySlug(slug: string): Observable<OfferResponse> {
    return this.http.get<OfferResponse>(`${API_BASE}/${slug}`);
  }

  createOffer(payload: OfferPayload): Observable<OfferResponse> {
    return this.http.post<OfferResponse>(API_BASE, payload, { withCredentials: true });
  }

  updateOffer(id: string, payload: Partial<OfferPayload>): Observable<OfferResponse> {
    return this.http.put<OfferResponse>(`${API_BASE}/${id}`, payload, { withCredentials: true });
  }

  deleteOffer(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${API_BASE}/${id}`, { withCredentials: true });
  }
}
```

---
---

## 2. Superadmin Admin/Team Management Module

### Base Route: `/api/v1/users/admins`

### A. Endpoint Specifications

#### 1. Get All Admins (Superadmin Only)
*   **Method**: `GET`
*   **Route**: `/api/v1/users/admins`
*   **Access**: Protected (Strictly requires role: `superadmin`)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "64b0f37e4f1a2c001d8b4123",
          "name": "محمود صالح",
          "email": "mahmoud@vitatrix.com",
          "role": "admin",
          "isActive": true,
          "createdAt": "2026-08-12T15:20:00.000Z"
        }
      ]
    }
    ```

#### 2. Create Admin (Superadmin Only)
*   **Method**: `POST`
*   **Route**: `/api/v1/users/admins`
*   **Access**: Protected (Strictly requires role: `superadmin`)
*   **Payload (JSON)**:
    ```json
    {
      "name": "هاني شاكر",
      "email": "hani@vitatrix.com",
      "password": "TemporaryPassword123",
      "role": "admin"
    }
    ```
    *   *Password Rules*: Must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, and one number.
*   **Response (201 Created)**: Returns the registered account details (excluding the hashed password).

#### 3. Update Admin (Superadmin Only)
*   **Method**: `PATCH`
*   **Route**: `/api/v1/users/admins/:id`
*   **Access**: Protected (Strictly requires role: `superadmin`)
*   **Payload (JSON)**:
    ```json
    {
      "name": "هاني شاكر الجديد",
      "email": "hani.new@vitatrix.com",
      "role": "superadmin",
      "isActive": false
    }
    ```
*   **Security & Self-Protection Rules**:
    *   The backend validates the target profile ID against the current requester ID (`req.user.id`).
    *   If a Superadmin attempts to **demote themselves** (change role from `superadmin` to `admin`) or **deactivate themselves** (`isActive: false`), the API returns a `403 Forbidden` response:
        ```json
        {
          "success": false,
          "message": "لا يمكنك إلغاء تفعيل حسابك الخاص أو تغيير دورك"
        }
        ```

#### 4. Delete Admin (Superadmin Only)
*   **Method**: `DELETE`
*   **Route**: `/api/v1/users/admins/:id`
*   **Access**: Protected (Strictly requires role: `superadmin`)
*   **Security & Self-Protection Rules**:
    *   If a Superadmin attempts to **delete themselves**, the API returns a `403 Forbidden` error:
        ```json
        {
          "success": false,
          "message": "لا يمكنك حذف حسابك الخاص"
        }
        ```

---

### B. Account Deactivation Rule (`isActive`)
When an Admin/Superadmin account is set to `isActive: false` (deactivated):
1.  **Login Attempt**: If they attempt to sign in, the login endpoint blocks the request and returns:
    *   *HTTP Status*: `403 Forbidden`
    *   *Payload*:
        ```json
        {
          "success": false,
          "message": "هذا الحساب معطل. يرجى التواصل مع المدير العام."
        }
        ```
2.  **Access Verification (`protect` middleware)**: If they are already logged in when deactivated, their authorization token is invalidated on their very next API request, yielding a `403 Forbidden` response.
3.  **Silent Refresh (`POST /auth/refresh`)**: Refuses token renewals for deactivated profiles.

---

### C. Angular Client Reference

#### 1. TypeScript Interfaces (`src/app/core/models/auth.model.ts`)
```typescript
export type UserRole = 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}
```

#### 2. Service Class (`src/app/core/services/user.service.ts`)
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminUser, CreateAdminPayload, UpdateAdminPayload } from '../models/auth.model';
import { ApiResponse } from '../models/api-response.model';

const API_BASE = '/api/v1/users/admins';

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getAdmins(): Observable<ApiResponse<AdminUser[]>> {
    return this.http.get<ApiResponse<AdminUser[]>>(API_BASE, { withCredentials: true });
  }

  createAdmin(payload: CreateAdminPayload): Observable<ApiResponse<AdminUser>> {
    return this.http.post<ApiResponse<AdminUser>>(API_BASE, payload, { withCredentials: true });
  }

  updateAdmin(id: string, payload: UpdateAdminPayload): Observable<ApiResponse<AdminUser>> {
    return this.http.patch<ApiResponse<AdminUser>>(`${API_BASE}/${id}`, payload, { withCredentials: true });
  }

  deleteAdmin(id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${API_BASE}/${id}`, { withCredentials: true });
  }
}
```
