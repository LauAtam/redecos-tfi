# Product Catalog Specification

## Purpose
Management of products offered in the system. Includes pricing and bulk size information.

## Requirements

### Requirement: Admin Product CRUD
The system SHALL allow users with the `admin` role to create, read, update, and delete products in the catalog.

#### Scenario: Admin adds a product
- GIVEN an authenticated user with the `admin` role
- WHEN the user sends a POST request to `/products` with valid data (name, price, bulk_size)
- THEN the system SHALL create the product and return a 201 status code
- AND the product SHALL be persisted in the database

#### Scenario: Admin updates a product price
- GIVEN an authenticated user with the `admin` role and an existing product
- WHEN the user sends a PATCH request to `/products/:id` with a new price
- THEN the system SHALL update the product price and return a 200 status code

### Requirement: Public Product Read Access
The system SHALL allow any user to read the product catalog.

#### Scenario: Guest user views product details
- GIVEN an unauthenticated user and an existing product
- WHEN the user sends a GET request to `/products/:id`
- THEN the system SHALL return the product details and a 200 status code

### Requirement: Unauthorized Product Mutation
The system SHALL NOT allow users without the `admin` role to modify the product catalog.

#### Scenario: Unauthenticated user tries to delete a product
- GIVEN an unauthenticated user and an existing product
- WHEN the user sends a DELETE request to `/products/:id`
- THEN the system SHALL return a 401 Unauthorized or 403 Forbidden status code
- AND the product SHALL NOT be deleted
