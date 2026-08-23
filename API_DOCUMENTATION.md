# Vitatrix Backend API Documentation & Angular TypeScript Interfaces

This document provides a comprehensive, production-ready specification of the Vitatrix Backend API and the corresponding TypeScript interfaces required for seamless integration with the Angular frontend.

---

## 1. General API Specs

### Base URL
*   **Development**: `http://localhost:5000/api/v1`
*   **Production**: `https://api.vitatrix.com/api/v1` (or your production domain)

### Authentication
The API utilizes a dual-token JWT mechanism for authentication:
1.  **Access Token**:
    *   **Lifetime**: Short-lived (15 minutes).
    *   **Transmission**: Sent in the HTTP request headers as a Bearer token:
        ```http
        Authorization: Bearer <your_access_token>
        ```
2.  **Refresh Token**:
    *   **Lifetime**: Long-lived (7 days).
    *   **Transmission**: Automatically handled via HTTP-Only, Secure cookies with `sameSite: 'strict'`.
    *   **Cookie Name**: `refreshToken`

### Standard Response Envelopes

#### Success Response
All successful responses return a `20x` status code and adhere to the following JSON structure:
```json
{
  "success": true,
  "message": "Human readable success message",
  "data": {} // Payload object, array, or null
}
```
*Note: Some endpoints (like Login) also return the `accessToken` at the root level.*

#### Error Response
Failed requests return an appropriate `4xx` or `5xx` status code and a standard error envelope:
```json
{
  "success": false,
  "message": "Detailed error summary or message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ] // Optional list of validation or field-specific errors
}
```

---

## 2. Endpoint Specifications

### A. Auth Module (`/api/v1/auth`)

#### 1. Login User
*   **Method**: `POST`
*   **Route**: `/api/v1/auth/login`
*   **Access**: Public
*   **Headers**: `Content-Type: application/json`
*   **Payload (JSON)**:
    ```json
    {
      "email": "superadmintest@vitatrix.com",
      "password": "123456789"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Logged in successfully",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "data": {
        "user": {
          "id": "64b0f37e4f1a2c001d8b4567",
          "name": "superadmintest",
          "email": "superadmintest@vitatrix.com",
          "role": "superadmin"
        }
      }
    }
    ```

#### 2. Refresh Access Token
*   **Method**: `POST`
*   **Route**: `/api/v1/auth/refresh`
*   **Access**: Public (Cookie-based validation)
*   **Headers**: None (expects HTTP-Only `refreshToken` cookie)
*   **Payload**: None
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Access token refreshed",
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
    ```

#### 3. Logout User
*   **Method**: `POST`
*   **Route**: `/api/v1/auth/logout`
*   **Access**: Protected (Requires valid Access Token)
*   **Headers**: `Authorization: Bearer <token>`
*   **Payload**: None
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Logged out successfully"
    }
    ```

#### 4. Create Admin Account
*   **Method**: `POST`
*   **Route**: `/api/v1/auth/create-admin`
*   **Access**: Protected (SuperAdmin only)
*   **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
*   **Payload (JSON)**:
    ```json
    {
      "name": "New Admin",
      "email": "admin@vitatrix.com",
      "password": "Password123",
      "role": "admin" // 'admin' or 'superadmin'
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "تم إنشاء حساب الأدمن بنجاح",
      "data": {
        "id": "64b0f37e4f1a2c001d8b4569",
        "name": "New Admin",
        "email": "admin@vitatrix.com",
        "role": "admin",
        "createdAt": "2026-08-12T01:40:00.000Z"
      }
    }
    ```

---

### B. Products Module (`/api/v1/products`)

#### 1. Fetch Catalog (Get All Active Products)
*   **Method**: `GET`
*   **Route**: `/api/v1/products`
*   **Access**: Public
*   **Headers**: None
*   **Payload**: None
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "64b0f37e4f1a2c001d8b4570",
          "name": "Vitamin C Gummies",
          "slug": "vitamin-c-gummies",
          "description": "High-quality Vitamin C daily gummies.",
          "benefits": ["Boosts Immunity", "Antioxidant Support"],
          "isBestSeller": true,
          "isFeatured": true,
          "image": "https://example.com/images/vit-c.png",
          "variants": [
            {
              "_id": "64b0f37e4f1a2c001d8b4571",
              "count": 60,
              "price": 250,
              "originalPrice": 300,
              "discountPercentage": 16,
              "stock": 100
            }
          ],
          "isActive": true,
          "createdAt": "2026-08-12T01:40:00.000Z",
          "updatedAt": "2026-08-12T01:40:00.000Z"
        }
      ]
    }
    ```

#### 2. Get Single Product by Slug
*   **Method**: `GET`
*   **Route**: `/api/v1/products/:slug`
*   **Access**: Public
*   **Headers**: None
*   **Payload**: None
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4570",
        "name": "Vitamin C Gummies",
        "slug": "vitamin-c-gummies",
        "description": "High-quality Vitamin C daily gummies.",
        "benefits": ["Boosts Immunity", "Antioxidant Support"],
        "isBestSeller": true,
        "isFeatured": true,
        "image": "https://example.com/images/vit-c.png",
        "variants": [
          {
            "_id": "64b0f37e4f1a2c001d8b4571",
            "count": 60,
            "price": 250,
            "originalPrice": 300,
            "discountPercentage": 16,
            "stock": 100
          }
        ],
        "isActive": true,
        "createdAt": "2026-08-12T01:40:00.000Z",
        "updatedAt": "2026-08-12T01:40:00.000Z"
      }
    }
    ```

#### 3. Create Product
*   **Method**: `POST`
*   **Route**: `/api/v1/products`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
*   **Payload (JSON)**:
    ```json
    {
      "name": "Multivitamin Gummies",
      "slug": "multivitamin-gummies",
      "description": "Essential daily vitamins for all ages.",
      "benefits": ["Complete Health Support", "Natural Flavors"],
      "isBestSeller": false,
      "isFeatured": true,
      "image": "https://example.com/images/multivit.png",
      "variants": [
        {
          "count": 90,
          "price": 320,
          "originalPrice": 350,
          "discountPercentage": 8,
          "stock": 50
        }
      ],
      "isActive": true
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "تم إضافة المنتج بنجاح",
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4588",
        "name": "Multivitamin Gummies",
        "slug": "multivitamin-gummies",
        "description": "Essential daily vitamins for all ages.",
        "benefits": ["Complete Health Support", "Natural Flavors"],
        "isBestSeller": false,
        "isFeatured": true,
        "image": "https://example.com/images/multivit.png",
        "variants": [
          {
            "_id": "64b0f37e4f1a2c001d8b4589",
            "count": 90,
            "price": 320,
            "originalPrice": 350,
            "discountPercentage": 8,
            "stock": 50
          }
        ],
        "isActive": true,
        "createdAt": "2026-08-12T01:40:00.000Z",
        "updatedAt": "2026-08-12T01:40:00.000Z"
      }
    }
    ```

#### 4. Update Product Details
*   **Method**: `PUT`
*   **Route**: `/api/v1/products/:id`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
*   **Payload (JSON)**: Any subset of Product fields (partial updates are supported).
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "تم تحديث المنتج بنجاح",
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4588",
        "name": "Updated Multivitamin Gummies",
        "variants": [ ... ],
        ...
      }
    }
    ```

#### 5. Delete Product
*   **Method**: `DELETE`
*   **Route**: `/api/v1/products/:id`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`
*   **Payload**: None
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "تم حذف المنتج بنجاح"
    }
    ```

---

### C. Orders Module (`/api/v1/orders`)

#### 1. Guest Checkout
*   **Method**: `POST`
*   **Route**: `/api/v1/orders`
*   **Access**: Public
*   **Headers**: `Content-Type: application/json`
*   **Payload (JSON)**:
    ```json
    {
      "customer": {
        "name": "Ahmed Salem",
        "phone": "+201234567890",
        "email": "ahmed.salem@gmail.com",
        "address": "12 Tahrir Street, Apt 4",
        "city": "Cairo"
      },
      "items": [
        {
          "productId": "64b0f37e4f1a2c001d8b4570",
          "variantCount": 60,
          "quantity": 2
        }
      ],
      "paymentMethod": "cod" // 'cod' or 'card'
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Order placed successfully",
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4590",
        "orderNumber": "VT-52849",
        "customer": {
          "name": "Ahmed Salem",
          "phone": "+201234567890",
          "email": "ahmed.salem@gmail.com",
          "address": "12 Tahrir Street, Apt 4",
          "city": "Cairo"
        },
        "items": [
          {
            "product": "64b0f37e4f1a2c001d8b4570",
            "variantCount": 60,
            "quantity": 2,
            "price": 250,
            "_id": "64b0f37e4f1a2c001d8b4591"
          }
        ],
        "totalAmount": 500,
        "paymentMethod": "cod",
        "paymentStatus": "pending",
        "orderStatus": "pending",
        "paymentRef": null,
        "createdAt": "2026-08-12T01:40:00.000Z",
        "updatedAt": "2026-08-12T01:40:00.000Z"
      }
    }
    ```

#### 2. Fetch All Orders (Admin Panel)
*   **Method**: `GET`
*   **Route**: `/api/v1/orders/admin`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`
*   **Query Parameters**:
    *   `status` (optional): Filter by `orderStatus` (`pending`, `processing`, `shipped`, `delivered`, `cancelled`)
    *   `paymentStatus` (optional): Filter by `paymentStatus` (`pending`, `paid`, `failed`)
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "64b0f37e4f1a2c001d8b4590",
          "orderNumber": "VT-52849",
          "customer": { ... },
          "items": [ ... ],
          "totalAmount": 500,
          "paymentMethod": "cod",
          "paymentStatus": "pending",
          "orderStatus": "pending",
          "createdAt": "2026-08-12T01:40:00.000Z"
        }
      ]
    }
    ```

#### 3. Fetch Single Order Breakdown
*   **Method**: `GET`
*   **Route**: `/api/v1/orders/admin/:id`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4590",
        "orderNumber": "VT-52849",
        "customer": { ... },
        "items": [ ... ],
        "totalAmount": 500,
        "paymentMethod": "cod",
        "paymentStatus": "pending",
        "orderStatus": "pending",
        "createdAt": "2026-08-12T01:40:00.000Z"
      }
    }
    ```

#### 4. Update Order Status
*   **Method**: `PATCH`
*   **Route**: `/api/v1/orders/admin/:id/status`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`, `Content-Type: application/json`
*   **Payload (JSON)**:
    ```json
    {
      "orderStatus": "processing", // Optional: 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
      "paymentStatus": "paid"      // Optional: 'pending', 'paid', 'failed'
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Order status updated",
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4590",
        "orderNumber": "VT-52849",
        ...
        "orderStatus": "processing",
        "paymentStatus": "paid",
        "updatedAt": "2026-08-12T01:45:00.000Z"
      }
    }
    ```

---

### D. Quiz Module (`/api/v1/quiz`)

#### 1. Submit Health Survey
*   **Method**: `POST`
*   **Route**: `/api/v1/quiz`
*   **Access**: Public
*   **Headers**: `Content-Type: application/json`
*   **Payload (JSON)**:
    ```json
    {
      "answers": {
        "age": 28,
        "gender": "female",
        "goals": ["skin", "energy"],
        "diet": "vegan"
      }
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Quiz submitted successfully",
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4599",
        "answers": {
          "age": 28,
          "gender": "female",
          "goals": ["skin", "energy"],
          "diet": "vegan"
        },
        "recommendedProduct": "64b0f37e4f1a2c001d8b4570", // Recommended Product ID
        "convertedToOrder": false,
        "createdAt": "2026-08-12T01:40:00.000Z",
        "updatedAt": "2026-08-12T01:40:00.000Z"
      }
    }
    ```

#### 2. Get All Quiz Results (Admin Panel)
*   **Method**: `GET`
*   **Route**: `/api/v1/quiz/admin`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_id": "64b0f37e4f1a2c001d8b4599",
          "answers": { ... },
          "recommendedProduct": "64b0f37e4f1a2c001d8b4570",
          "convertedToOrder": false,
          "createdAt": "2026-08-12T01:40:00.000Z"
        }
      ]
    }
    ```

#### 3. Mark Quiz Result as Converted
*   **Method**: `PATCH`
*   **Route**: `/api/v1/quiz/admin/:id/convert`
*   **Access**: Protected (Admin/SuperAdmin)
*   **Headers**: `Authorization: Bearer <token>`
*   **Payload**: None
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Marked as converted",
      "data": {
        "_id": "64b0f37e4f1a2c001d8b4599",
        "convertedToOrder": true,
        "updatedAt": "2026-08-12T01:48:00.000Z"
      }
    }
    ```

---

## 3. TypeScript Interfaces for Angular

Create these interfaces under `src/app/core/models/` in your Angular project:

### Generic Envelope (`src/app/core/models/api-response.model.ts`)
```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface ApiError {
  field?: string;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiError[];
}
```

### User & Auth (`src/app/core/models/auth.model.ts`)
```typescript
export type UserRole = 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  accessToken: string;
  data: {
    user: User;
  };
}

export interface RefreshResponse {
  success: boolean;
  message: string;
  accessToken: string;
}
```

### Product (`src/app/core/models/product.model.ts`)
```typescript
export interface Variant {
  _id?: string;
  count: number;             // e.g. 60 or 120 gummies
  price: number;             // current selling price
  originalPrice: number | null; // slashed price for UI
  discountPercentage: number;  // discount badge value
  stock: number;             // -1 = unlimited/unmanaged
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  benefits: string[];
  isBestSeller: boolean;
  isFeatured: boolean;
  image: string;
  variants: Variant[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ProductResponse = ApiResponse<Product>;
export type ProductListResponse = ApiResponse<Product[]>;
```

### Order (`src/app/core/models/order.model.ts`)
```typescript
import { Product } from './product.model';

export type PaymentMethod = 'cod' | 'card';
export type PaymentStatus = 'pending' | 'paid' | 'failed';
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface CustomerInfo {
  name: string;
  phone: string;
  email: string | null;
  address: string;
  city: string;
}

export interface OrderItem {
  _id?: string;
  product: string | Product; // Can be product ID string or populated Product details
  variantCount: number;      // gummy count, e.g. 60
  quantity: number;          // quantity purchased
  price: number;             // captured price snapshot
}

export interface OrderInput {
  customer: CustomerInfo;
  items: {
    productId: string;
    variantCount: number;
    quantity: number;
  }[];
  paymentMethod?: PaymentMethod;
}

export interface Order {
  _id: string;
  orderNumber: string;
  customer: CustomerInfo;
  items: OrderItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export type OrderResponse = ApiResponse<Order>;
export type OrderListResponse = ApiResponse<Order[]>;
```

### Quiz (`src/app/core/models/quiz.model.ts`)
```typescript
import { ApiResponse } from './api-response.model';

export interface QuizAnswers {
  [questionKey: string]: any; // Flexible structure for survey responses
}

export interface QuizRecommendation {
  _id: string;
  answers: QuizAnswers;
  recommendedProduct: string | null; // ID of recommended product
  convertedToOrder: boolean;
  createdAt: string;
  updatedAt: string;
}

export type QuizResponse = ApiResponse<QuizRecommendation>;
export type QuizListResponse = ApiResponse<QuizRecommendation[]>;
```
