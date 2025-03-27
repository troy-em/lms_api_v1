# Loan Management System API

This service comprises of two modules

1. Loan Management Module
   - integrated with a bank system for customer kyc and customer transactions
   - integrated with a scoring system to enable loan request validations

2. Customer Transactions Middleware
   - acts as a bridge between the scoring engine and the bank system for fetching customer transactions

## 🚀 Deployment

### Prerequisites

- Node.js v16+
- PostgreSQL database
- Redis (for caching) (optional)

### Installation

```bash
git clone https://github.com/your-repo/lms-api.git
cd lms-api
npm install
```

### Configuration

- Create .env file with this attributes

```bash
PORT=
URL=
POSTGRES_PASSWORD=
POSTGRES_USER=
POSTGRES_DB=
POSTGRES_HOST=
#
JWT_SECRET=
JWT_EXPIRATION=
JWT_EXPIRATION_SHORT=
JWT_REFRESH_EXPIRATION=
OTP_EXPIRATION_TIME=
#
# SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=
SMTP_USER=
SMTP_PASS=
#
# CBS SYSTEM
CBS_USERNAME=
CBS_PASSWORD=
CUSTOMER_TRANSACTIONS_URL=
CUSTOMER_KYC_URL=
#
# SCORING SYSTEM
CLIENT_TOKEN=
INITIATE_SCORING_URL=
QUERY_SCORE_URL=
RETRY_DELAY=
MAX_RETRY=
```

- Configure nginx file for maping the endpoint to a domain for external access and register an ssl certificate for it using certbot or any other means
- Install Pm2 - allows running multiple instances of the api for smooth access, logging and monitoring

### Run it

- Run below command from the api root

```bash
pm2 start server.js -i 2 --name credablelms-prod-api
```

- This will start two instances of the api under the name credablelms-prod-api
- Run below command to check if api is running

```bash
pm2 status
```

- Run below command to check logs

```bash
pm2 logs credablelms-prod-api
```

## 📚 LMS API Documentation

Base URL
https://api.yourdomain.com/v1

Authentication
Bearer token required for all endpoints:
```bash
{
  "Authorization": "Bearer your_access_token"
}
```

### 🔐 Authentication Endpoints

#### 1. Create Client

**Client Object Schema**

```json
{
  "type": "object",
  "required": ["name", "url", "password", "email"],
  "properties": {
    "id": { "type": "integer" },
    "name": { "type": "string" },
    "email": { "type": "string" },
    "password": { "type": "string" },
    "url": { "type": "string" },
    "status_id": { "type": "integer" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

`POST /create`

**Description**: Register a new client application

**Request Body**:

```json
{
  "name": "Client App",
  "email": "client@example.com",
  "password": "securePassword123",
  "url": "https://clientapp.com"
}
```

**Required Fields:** name, email, password, url

**Success Response (201)**:

```json
{
    "message": "Client was registered successfully!",
    "client": {
        "id": "3",
        "name": "123 Bank",
        "email": "bank123@mail.com",
        "url": "https://credable.io/test"
    },
    "status": {
        "id": 18,
        "name": "active"
    },
    "accessToken": "eyJhmV4cCI6MTc0MzAzOTc4OX0.tQ2VsvUP3Lwi2GddHFc2mwzEaygHK1oZ4ZcG_9dTua0",
    "refreshToken": "179f2c0d-8607-4ca2-91698a3"
}
```

**Error Responses:**

`400 Bad Request:` Missing required fields

`409 Conflict:` Email already exists

`500 Internal Server Error:` Server error

#### 2. Get Access Tokens

`POST /get-tokens`

**Description**: Authenticate and receive JWT tokens

**Request Body**:

```json
{
  "name": "123 Bank",
  "password": "securePassword123"
}
```

**Success Response (200):**

```json
{
  "access_token": "eyJhbGciOi...",
  "refresh_token": "eyJhbGciOi...",
  "expires_in": 3600
}
```

### 🐼 Subscription Endpoints

**Subscription Schema**

```json
{
  "type": "object",
  "required": ["customer_number", "client_id"],
  "properties": {
    "id": { "type": "integer" },
    "customer_number": { "type": "string" },
    "client_id": { "type": "integer" },
    "status_id": { "type": "integer" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

#### 1. Create Subscription

`POST /subscriptions/create`

**Description**: Create a new customer subscription

**Authentication**: Bearer Token (Active client required)

**Required Headers**:

- `Authorization: Bearer <access_token>`

**Request Body**:

```json
{
  "customer_number": "CUST12345",
  "client_id": 1
}
```

**Required Fields**: customer_number, client_id

**Success Response (201)**:

```json
{
  "id": 1,
  "customer_number": "CUST12345",
  "client_id": 1,
  "status_id": 1,
  "created_at": "2023-08-20T12:00:00.000Z"
}
```

**Error Responses**:

`400 Bad Request`: Missing required fields

`401 Unauthorized`: Invalid/expired token

`403 Forbidden`: Client account inactive

`409 Conflict`: Subscription already exists

`500 Internal Server Error`: Server error

#### 2. Update Subscription

`PATCH /subscriptions/update/:id`

**Description**:

Update an existing subscription

**Authentication**:

`Bearer Token (Active client required)`

**Parameters**:

`id (path): Subscription ID to update`

Request Body

```json
{
  "status_id": 2
}
```

**Success Response (200)**:

```json
{
  "id": 1,
  "customer_number": "CUST54321",
  "client_id": 1,
  "status_id": 2,
  "updated_at": "2023-08-20T12:30:00.000Z"
}
```

**Error Responses**:
`400 Bad Request:` No fields provided

`401 Unauthorized:` Invalid/expired token

`403 Forbidden:` Client account inactive

`404 Not Found:` Subscription not found

`500 Internal Server Error`: Server error

#### 3. Search Subscriptions

`GET /subscriptions/search`

**Description:**

Search subscriptions with filtering

**Authentication:**

Bearer Token (Active client required)

**Query Parameters:**

| Parameter         | Type     | Description                              | Default |
|-------------------|----------|------------------------------------------|---------|
| `customer_number` | string   | Filter by customer number               | -       |
| `client_id`       | integer  | Filter by client ID                     | -       |
| `status_id`       | integer  | Filter by status ID                     | -       |
| `page`            | integer  | Page number for pagination              | `1`     |
| `limit`           | integer  | Number of items per page                | `10`    |

**Success Response (200):**

```json
{
  "results": [
    {
      "id": 1,
      "customer_number": "CUST12345",
      "client_id": 1,
      "status_id": 1,
      "created_at": "2023-08-20T12:00:00.000Z",
      "updated_at": "2023-08-20T12:30:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 10
}
```

**Error Responses:**

`401 Unauthorized:` Invalid/expired token

`403 Forbidden:` Client account inactive

`500 Internal Server Error`: Server error

### 📝 Loan Request Endpoints

**Loan Request Schema**

```json
{
  "type": "object",
  "required": ["customer_number", "amount"],
  "properties": {
    "id": { "type": "integer" },
    "customer_number": { "type": "string" },
    "amount": { "type": "number" },
    "customer_score": { "type": "number" },
    "customer_limit": { "type": "number" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

#### 1. Create Loan Request

`POST /loan-requests/create`

**Description**: Create a new loan request

**Authentication**: `Bearer Token (Active client required)`

**Required Headers**:

- `Authorization`: Bearer Token
- `Content-Type`: application/json

**Request Body**:

```json
{
  "customer_number": "CUST12345",
  "amount": 5000
}
```

`Required Fields:` customer_number, amount

**Success Response (201):**

```json
{
  "id": 1,
  "customer_number": "CUST12345",
  "amount": 5000,
  "status": "processing",
  "created_at": "2023-08-20T12:00:00.000Z"
}
```

**Error Responses:**

`400 Bad Request:` Missing required fields or invalid amount

`401 Unauthorized:` Invalid/expired token

`403 Forbidden:` Client account inactive

`409 Conflict:` Customer has active loan

`500 Internal Server Error:` Server error

#### 2. Search Loan Requests

`GET /loan-requests/search`

`Description:` Search loan requests with filtering
`Authentication:` Bearer Token (Active client required)

**Query Parameters:**

| Parameter         | Type     | Description                              | Default |
|-------------------|----------|------------------------------------------|---------|
| `customer_number` | string   | Filter by customer number               | -       |
| `amount`          | number   | Filter by exact amount                  | -       |
| `min_amount`      | number   | Filter by minimum amount                | -       |
| `max_amount`      | number   | Filter by maximum amount                | -       |
| `status`          | string   | Filter by status (processing/approved/rejected) | - |
| `page`            | integer  | Page number for pagination              | `1`     |
| `limit`           | integer  | Number of items per page                | `10`    |

**Success Response (200):**

```json
{
    "results": [
        {
            "id": 1,
            "customer_number": "318411216",
            "amount": "7000.00",
            "customer_score": null,
            "customer_limit": null,
            "created_at": "2025-03-26T23:46:55.961Z",
            "updated_at": "2025-03-26T23:46:55.961Z",
            "loanStatus": {
                "id": 1,
                "loan_request_id": 1,
                "status_id": 17,
                "remarks": "Could not fetch scoring data",
                "created_at": "2025-03-26T23:46:56.659Z",
                "updated_at": "2025-03-26T23:46:56.659Z",
                "status": {
                    "id": 17,
                    "name": "failed",
                    "created_at": "2025-03-26T22:45:42.999Z",
                    "updated_at": "2025-03-26T22:45:42.999Z"
                }
            },
            "payments": []
        }
    ],
    "total": 1
}
```

**Error Responses:**

`401 Unauthorized:` Invalid/expired token

`403 Forbidden:` Client account inactive

`500 Internal Server Error:` Server error

### 🔃 Loan Status Endpoints

**Loan Status Schema**

```json
{
  "type": "object",
  "required": ["loan_request_id"],
  "properties": {
    "id": { "type": "integer" },
    "loan_request_id": { "type": "integer" },
    "status_id": { "type": "integer" },
    "remarks": { "type": "string" },
    "created_at": { "type": "string", "format": "date-time" },
    "updated_at": { "type": "string", "format": "date-time" }
  }
}
```

#### 1. Update Loan Status

`PATCH /loan-status/update/:id`

**Description**: Update an existing loan status

**Authentication**: Bearer Token (Active client required)

**Headers**:

- `Authorization:` Bearer <access_token>

- `Content-Type:` application/json

**Path Parameters**:

| Parameter | Type   | Description          |
|-----------|--------|----------------------|
| `id`      | integer | Loan Status ID to update |

**Request Body**:

```json
{
  "status_id": 2
}
```

**Success Response (200):**

```json
{
  "id": 1,
  "loan_request_id": 5,
  "status_id": 2,
  "remarks": "Approved by system",
  "updated_at": "2023-08-25T14:30:00.000Z"
}
```

**Error Responses**

`400 Bad Request:` Invalid status ID or remarks

`401 Unauthorized:` Invalid/expired token

`403 Forbidden:` Client account inactive

`404 Not Found:` Loan status not found

`500 Internal Server Error:` Server error

#### 2. Search Loan Statuses

`GET /loan-status/search`

**Description:** Search loan status records

**Authentication:** Bearer Token (Active client required)

**Query Parameters:**

| Parameter         | Type     | Description                              | Default |
|-------------------|----------|------------------------------------------|---------|
| `customer_number` | string   | Filter by customer number               | -       |
| `loan_request_id` | number   | Filter by loan request number               | -       |
| `status_id` | number   | Filter by status number               | -       |
| `amount`          | number   | Filter by exact amount                  | -       |
| `min_amount`      | number   | Filter by minimum amount                | -       |
| `max_amount`      | number   | Filter by maximum amount                | -       |
| `status`          | string   | Filter by status (processing/approved/rejected) | - |
| `page`            | integer  | Page number for pagination              | `1`     |
| `limit`           | integer  | Number of items per page                | `10`    |

**Success Response (200):**

```json
{
    "results": [
        {
            "id": 1,
            "loan_request_id": 1,
            "status_id": 17,
            "remarks": "Could not fetch scoring data",
            "created_at": "2025-03-26T23:46:56.659Z",
            "updated_at": "2025-03-26T23:46:56.659Z",
            "loanRequest": {
                "id": 1,
                "customer_number": "318411216",
                "amount": "7000.00",
                "customer_score": null,
                "customer_limit": null,
                "created_at": "2025-03-26T23:46:55.961Z",
                "updated_at": "2025-03-26T23:46:55.961Z"
            },
            "payments": [],
            "status": {
                "id": 17,
                "name": "failed",
                "created_at": "2025-03-26T22:45:42.999Z",
                "updated_at": "2025-03-26T22:45:42.999Z"
            }
        }
    ],
    "total": 1
}
```

**Error Responses:**

`401 Unauthorized:` Invalid/expired token

`403 Forbidden:` Client account inactive

`500 Internal Server Error:` Server error

## ⚙️ Customer Transactions Middleware

🪜 Flow Diagram

- Client sends request with credentials

- System validates client credentials

- System connects to CBS with configured credentials

- System retrieves transactions

- System returns formatted transaction data

📂 Environment Variables:

`CUSTOMER_TRANSACTIONS_URL`: WSDL endpoint for CBS

`CBS_USERNAME`: Core Banking System username

`CBS_PASSWORD`: Core Banking System password

### 🔄 Get Customer Transactions

`GET /transactions/get/:customerNumber`

**Description**: Retrieve transaction history for a specific customer from the core banking system

---

### 🔐 Authentication

#### 1. Client Authentication (Required)

**Method**: Basic Authentication
**Request Body**:

```json
{
  "username": "your_client_username",
  "password": "your_client_password"
}
```

#### 2. CBS Authentication (System)

Automatically handled using environment variables:

`CBS_USERNAME`

`CBS_PASSWORD`

#### 3. 📥 Request

Endpoint:
`GET /transactions/get/{customerNumber}`

**Path Parameters:**

| Parameter | Type   | Description          |
|-----------|--------|----------------------|
| `customerNumber`      | string | Unique customer identifier |

**Request Body (for client authentication):**

```json
{
  "username": "client_username",
  "password": "client_password"
}
```

#### 4. 📤 Response

**Success Response (200):**

```json
{
  "transactions": [
    {
      "transactionId": "TXN12345",
      "amount": 1500.00,
      "date": "2023-08-15",
      "type": "credit",
      "description": "Salary Credit"
    },
    {
      "transactionId": "TXN12346",
      "amount": 250.00,
      "date": "2023-08-16",
      "type": "debit",
      "description": "Utility Payment"
    }
  ]
}
```

**Error Responses:**

`400 Bad Request`: Missing username or password

`401 Unauthorized`: Invalid client credentials

`500 Server Error`: CBS connection or processing error

📜 License

This API is licensed under the MIT License. See [LICENSE](LICENSE) for details.
