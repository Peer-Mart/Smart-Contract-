const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("ECommerceModule", (m) => {
  // Deploy MockUSDC first
  const initialSupply = m.getParameter("initialSupply", "1000000000000000"); // 1,000,000 USDC with 6 decimals
  const mockUsdc = m.contract("MockUSDC", [initialSupply]);

  // Deploy ECommerce with address of deployed MockUSDC
  const ecommerce = m.contract("ECommerce", [mockUsdc]);

  return { ecommerce, mockUsdc };
});