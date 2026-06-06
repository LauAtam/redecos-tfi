# Withdrawal Nodes Specification

## Purpose
Management of physical points where orders are collected. Includes name, address, and manager details.

## Requirements

### Requirement: Admin Node CRUD
The system SHALL allow users with the `admin` role to create, read, update, and delete withdrawal nodes.

#### Scenario: Admin creates a new node
- GIVEN an authenticated user with the `admin` role
- WHEN the user sends a POST request to `/nodes` with valid data (name, address, manager_name)
- THEN the system SHALL create the node and return a 201 status code
- AND the node SHALL be persisted in the database

#### Scenario: Admin updates an existing node
- GIVEN an authenticated user with the `admin` role and an existing node
- WHEN the user sends a PATCH request to `/nodes/:id` with updated data
- THEN the system SHALL update the node and return a 200 status code

#### Scenario: Admin deletes a node
- GIVEN an authenticated user with the `admin` role and an existing node
- WHEN the user sends a DELETE request to `/nodes/:id`
- THEN the system SHALL remove the node and return a 204 status code

### Requirement: Public Node Read Access
The system SHALL allow any user (authenticated or not) to read withdrawal nodes.

#### Scenario: Guest user lists nodes
- GIVEN an unauthenticated user
- WHEN the user sends a GET request to `/nodes`
- THEN the system SHALL return a list of all nodes and a 200 status code

### Requirement: Unauthorized Node Mutation
The system SHALL NOT allow users without the `admin` role to create, update, or delete withdrawal nodes.

#### Scenario: Client user tries to create a node
- GIVEN an authenticated user with the `authenticated` (client) role
- WHEN the user sends a POST request to `/nodes`
- THEN the system SHALL return a 403 Forbidden status code
- AND the node SHALL NOT be created
