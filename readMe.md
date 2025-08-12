# ECommerce Smart Contract Project

A robust, upgradeable ECommerce marketplace smart contract system for the Ethereum blockchain. This project allows sellers to register and list products, buyers to purchase using USDC, and features secure payment, automated fee and penalty handling, reporting, and seller management.

## Features

- **Seller Registration:** Sellers can register with profile and contact information.
- **Product Listings:** Sellers can create, update, and manage product listings with inventory.
- **USDC Payments:** Buyers purchase products using the USDC ERC20 token.
- **Marketplace Fees:** Platform fee, seller penalty, and cancellation penalty are all configurable.
- **Order Lifecycle:** Buyers can confirm payments, cancel purchases (with penalties), and rate sellers.
- **Seller Reputation:** Buyers can report sellers for canceled purchases. Sellers can be automatically or manually blocked/unblocked.
- **Admin Controls:** Owner can block/unblock sellers and withdraw accumulated platform fees.
- **Upgradeable and Secure:** Designed with security in mind, using OpenZeppelin's libraries.

## Contracts

- `ECommerce.sol` — Main marketplace contract.
- `MockUSDC.sol` — Mock USDC ERC20 token for development and testing.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Hardhat](https://hardhat.org/)
- [Yarn](https://yarnpkg.com/) or [npm](https://www.npmjs.com/)
- [Git](https://git-scm.com/)

### Installation

```bash
git clone https://github.com/Peer-Mart/Smart-Contract-.git
cd Smart-Contract
npm install
```

### Compile Contracts

```bash
npx hardhat compile
```

### Run Tests

```bash
npx hardhat test
```

### Deploy (using Hardhat Ignition)

This project is configured to use [Hardhat Ignition](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-ignition) for deployment.

Edit `ignition/modules/ECommerceModule.js` as needed. By default, it deploys both the `MockUSDC` and `ECommerce` contracts.

```bash
npx hardhat ignition deploy ignition/modules/ECommerceModule.js
```

## Contract Overview

### ECommerce.sol

- **registerSeller(...)**: Sellers register with details.
- **createProduct(...)**: List new products.
- **purchaseProduct(...)**: Buyers purchase with USDC.
- **confirmPayment(...)**: Buyer confirms and seller receives funds.
- **cancelPurchase(...)**: Buyer cancels (refund minus penalty).
- **reportCanceledPurchase(...)**: Report canceled purchase.
- **rateSeller(...)**: Rate sellers after confirmed purchase.
- **blockSellerByOwner(...) / unblockSeller(...)**: Admin controls.
- **withdrawFees(...)**: Owner withdraws platform fees.

### MockUSDC.sol

A simple ERC20 token mimicking USDC for testing.

## Security

- Uses [OpenZeppelin](https://openzeppelin.com/) contracts for access control and token standards.
- Protects against reentrancy, double-spending, and unauthorized access.
- All critical actions and state changes are covered by unit tests.

## Project Structure

```
contracts/
  ECommerce.sol
  MockUSDC.sol
test/
  ECommerce.js
ignition/
  modules/
    ECommerceModule.js
README.md
hardhat.config.js
...
```

## Contributing

1. Fork and clone this repository.
2. Create a new branch for your feature or bugfix.
3. Commit and push your changes.
4. Open a Pull Request describing your changes.

# Deployed Addresses

ECommerceModule#MockUSDC - 0xb7Aa8b8Be8fd0d07F5d00a94DCb7A187f69b21ff
ECommerceModule#ECommerce - 0x445d64454aEe5dDB67413b9e8334767AFEd06f21

# Verification

Verifying contract "contracts/MockUSDC.sol:MockUSDC" for network fuji...
Successfully verified contract "contracts/MockUSDC.sol:MockUSDC" for network fuji:
  - https://testnet.avax.routescan.io/address/0xb7Aa8b8Be8fd0d07F5d00a94DCb7A187f69b21ff#code

Verifying contract "contracts/ECommerce.sol:ECommerce" for network fuji...
Successfully verified contract "contracts/ECommerce.sol:ECommerce" for network fuji:
  - https://testnet.avax.routescan.io/address/0x445d64454aEe5dDB67413b9e8334767AFEd06f21#code

---

**Contact:**  
Maintained by [rocknwa](https://github.com/rocknwa) and contributors.