const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ECommerce", function () {
  // Fixture for deploying contracts and setting up initial state
  async function deployECommerceFixture() {
    const [owner, seller, buyer, other, anotherBuyer, thirdBuyer] = await ethers.getSigners();

    // Deploy MockUSDC with 1,000,000 USDC (6 decimals = 1,000,000e6)
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const initialSupply = ethers.parseUnits("1000000", 6);
    const usdc = await MockUSDC.deploy(initialSupply);

    // Send some USDC to seller, buyer, and other buyers for testing
    await usdc.mint(seller.address, ethers.parseUnits("10000", 6));
    await usdc.mint(buyer.address, ethers.parseUnits("10000", 6));
    await usdc.mint(anotherBuyer.address, ethers.parseUnits("10000", 6));
    await usdc.mint(thirdBuyer.address, ethers.parseUnits("10000", 6));

    // Deploy ECommerce contract
    const ECommerce = await ethers.getContractFactory("ECommerce");
    const ecommerce = await ECommerce.deploy(usdc.target);

    return { ecommerce, usdc, owner, seller, buyer, other, anotherBuyer, thirdBuyer };
  }

  describe("Seller Registration", function () {
    it("Registers a seller", async function () {
      const { ecommerce, seller } = await loadFixture(deployECommerceFixture);

      await expect(
        ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890")
      )
        .to.emit(ecommerce, "SellerRegistered")
        .withArgs(seller.address, "Test Seller", "uri");

      const sellerData = await ecommerce.sellers(seller.address);
      expect(sellerData.name).to.equal("Test Seller");
    });

    it("Prevents double seller registration", async () => {
      const { ecommerce, seller } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");
      await expect(
        ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890")
      ).to.be.revertedWithCustomError(ecommerce, "SellerAlreadyRegistered");
    });
  });

  describe("Product Listing & Purchase", function () {
    async function setupProductAndApprove() {
      const { ecommerce, usdc, seller, buyer } = await loadFixture(deployECommerceFixture);

      // Seller registers
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");

      // Seller lists product
      await ecommerce.connect(seller).createProduct(
        "Phone", "img.com/p.png", ethers.parseUnits("100", 6), "Nice phone", 5
      );
      // Buyer approves USDC
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));

      return { ecommerce, usdc, seller, buyer };
    }

    it("Allows a buyer to purchase a product", async function () {
      const { ecommerce, usdc, seller, buyer } = await setupProductAndApprove();

      await expect(ecommerce.connect(buyer).purchaseProduct(1))
        .to.emit(ecommerce, "ProductPurchased")
        .withArgs(1, "Phone", ethers.parseUnits("100", 6), seller.address, buyer.address, true);

      const product = await ecommerce.products(1);
      expect(product.inventory).to.equal(4);

      const purchase = await ecommerce.getPurchase(1, buyer.address);
      expect(purchase.isPaid).to.equal(true);
      expect(purchase.isSold).to.equal(false);
    });

    it("Buyer cannot purchase if not approved enough USDC", async function () {
      const { ecommerce, usdc, seller, buyer } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");
      await ecommerce.connect(seller).createProduct(
        "Phone", "img.com/p.png", ethers.parseUnits("100", 6), "Nice phone", 5
      );
      // Approve less than needed
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("50", 6));
      await expect(ecommerce.connect(buyer).purchaseProduct(1)).to.be.reverted;
    });

    it("Prevents product creation by blocked or unregistered seller", async () => {
      const { ecommerce, seller, owner } = await loadFixture(deployECommerceFixture);
      // Not registered
      await expect(
        ecommerce.connect(seller).createProduct("Phone", "img", ethers.parseUnits("100", 6), "desc", 5)
      ).to.be.revertedWithCustomError(ecommerce, "SellerNotRegistered");

      // Register, then owner blocks seller using the new owner function
      await ecommerce.connect(seller).registerSeller("S", "uri", "L", "123");
      await ecommerce.connect(owner).blockSellerByOwner(seller.address, "bad actor");
      await expect(
        ecommerce.connect(seller).createProduct("Phone", "img", ethers.parseUnits("100", 6), "desc", 5)
      ).to.be.revertedWithCustomError(ecommerce, "ErrSellerBlocked");
    });

    it("Prevents buying out-of-stock product", async () => {
      const { ecommerce, usdc, seller, buyer, anotherBuyer } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("S", "uri", "L", "123");
      await ecommerce.connect(seller).createProduct("Phone", "img", ethers.parseUnits("100", 6), "desc", 1);
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(buyer).purchaseProduct(1);

      // Another buyer tries to buy (inventory is now 0)
      await usdc.connect(anotherBuyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await expect(
        ecommerce.connect(anotherBuyer).purchaseProduct(1)
      ).to.be.revertedWithCustomError(ecommerce, "ProductOutOfStock");
    });

    it("Prevents seller from buying their own product", async () => {
      const { ecommerce, usdc, seller } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("S", "uri", "L", "123");
      await ecommerce.connect(seller).createProduct("Phone", "img", ethers.parseUnits("100", 6), "desc", 1);
      await usdc.connect(seller).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await expect(
        ecommerce.connect(seller).purchaseProduct(1)
      ).to.be.revertedWithCustomError(ecommerce, "SellerCannotBuyOwnProduct");
    });

    it("Prevents double purchase without cancelling", async () => {
      const { ecommerce, usdc, seller, buyer } = await setupProductAndApprove();
      await ecommerce.connect(buyer).purchaseProduct(1);
      // Try to purchase again
      await expect(ecommerce.connect(buyer).purchaseProduct(1)).to.be.revertedWithCustomError(ecommerce, "ProductAlreadyPurchased");
    });
  });

  describe("Payment Confirmation & Withdraw", function () {
    async function setupAndPurchase() {
      const { ecommerce, usdc, owner, seller, buyer } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");
      await ecommerce.connect(seller).createProduct(
        "Phone", "img.com/p.png", ethers.parseUnits("100", 6), "Nice phone", 5
      );
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(buyer).purchaseProduct(1);
      return { ecommerce, usdc, owner, seller, buyer };
    }

    it("Buyer can confirm payment and seller receives USDC minus fee", async function () {
      const { ecommerce, usdc, seller, buyer } = await setupAndPurchase();

      // Seller's initial balance
      const before = await usdc.balanceOf(seller.address);

      await expect(ecommerce.connect(buyer).confirmPayment(1))
        .to.emit(ecommerce, "PaymentConfirmed");

      // Fee is 5 USDC, seller receives 95 USDC
      const after = await usdc.balanceOf(seller.address);

      expect(after - before).to.equal(ethers.parseUnits("95", 6));
    });

    it("Owner can withdraw collected fees", async function () {
      const { ecommerce, usdc, owner, buyer } = await setupAndPurchase();

      // Confirm payment to collect fees
      await ecommerce.connect(buyer).confirmPayment(1);

      const before = await usdc.balanceOf(owner.address);

      // Withdraw fees (should be 5 USDC)
      await expect(ecommerce.connect(owner).withdrawFees(owner.address))
        .not.to.be.reverted;

      const after = await usdc.balanceOf(owner.address);
      expect(after - before).to.equal(ethers.parseUnits("5", 6));
    });

    it("Prevents confirming payment twice", async () => {
      const { ecommerce, buyer } = await setupAndPurchase();
      await ecommerce.connect(buyer).confirmPayment(1);
      await expect(
        ecommerce.connect(buyer).confirmPayment(1)
      ).to.be.revertedWithCustomError(ecommerce, "ProductAlreadyConfirmed");
    });

    it("Prevents cancel after confirmation", async () => {
      const { ecommerce, buyer } = await setupAndPurchase();
      await ecommerce.connect(buyer).confirmPayment(1);
      await expect(
        ecommerce.connect(buyer).cancelPurchase(1)
      ).to.be.revertedWithCustomError(ecommerce, "ProductAlreadySold");
    });
  });

  describe("Cancellations, Reporting, Blocking", function () {
    async function setupAndPurchaseAndCancel() {
      const { ecommerce, usdc, owner, seller, buyer } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");
      await ecommerce.connect(seller).createProduct(
        "Phone", "img.com/p.png", ethers.parseUnits("100", 6), "Nice phone", 5
      );
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(buyer).purchaseProduct(1);
      return { ecommerce, usdc, owner, seller, buyer };
    }

    it("Allows buyer to cancel and receive refund minus penalty", async () => {
      const { ecommerce, usdc, seller, buyer } = await setupAndPurchaseAndCancel();
      const beforeBuyer = await usdc.balanceOf(buyer.address);
      const beforeSeller = await usdc.balanceOf(seller.address);

      await expect(ecommerce.connect(buyer).cancelPurchase(1)).not.to.be.reverted;

      const afterBuyer = await usdc.balanceOf(buyer.address);
      const afterSeller = await usdc.balanceOf(seller.address);

      // Buyer gets refund minus penalty, seller gets penalty - fee
      const price = ethers.parseUnits("100", 6);
      const penalty = price * BigInt(10) / BigInt(100);
      const refundToBuyer = price - penalty;
      const fee = penalty * BigInt(3) / BigInt(100);
      const paymentToSeller = penalty - fee;

      expect(afterBuyer - beforeBuyer).to.equal(refundToBuyer);
      expect(afterSeller - beforeSeller).to.equal(paymentToSeller);
    });

    it("Allows buyer to report cancelled purchase and blocks seller after threshold", async () => {
      const { ecommerce, usdc, seller, buyer, anotherBuyer, thirdBuyer } = await loadFixture(deployECommerceFixture);
      // Register & list product
      await ecommerce.connect(seller).registerSeller("S", "uri", "L", "123");
      await ecommerce.connect(seller).createProduct("Phone", "img", ethers.parseUnits("100", 6), "desc", 5);

      // Buyer 1
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(buyer).purchaseProduct(1);
      await ecommerce.connect(buyer).cancelPurchase(1);
      await ecommerce.connect(buyer).reportCanceledPurchase(1);

      // Buyer 2
      await usdc.connect(anotherBuyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(anotherBuyer).purchaseProduct(1);
      await ecommerce.connect(anotherBuyer).cancelPurchase(1);
      await ecommerce.connect(anotherBuyer).reportCanceledPurchase(1);

      // Buyer 3 (thirdBuyer)
      await usdc.connect(thirdBuyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(thirdBuyer).purchaseProduct(1);
      await ecommerce.connect(thirdBuyer).cancelPurchase(1);
      await expect(ecommerce.connect(thirdBuyer).reportCanceledPurchase(1))
        .to.emit(ecommerce, "SellerBlocked");
      expect(await ecommerce.isSellerBlocked(seller.address)).to.be.true;
    });

    it("Allows only owner to unblock sellers", async () => {
      const { ecommerce, owner, seller } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("S", "uri", "L", "123");
      await ecommerce.connect(owner).blockSellerByOwner(seller.address, "reason");
      await expect(ecommerce.connect(seller).unblockSeller(seller.address))
        .to.be.revertedWithCustomError(ecommerce, "OwnableUnauthorizedAccount");
      await expect(ecommerce.connect(owner).unblockSeller(seller.address)).to.emit(ecommerce, "SellerUnblocked");
      expect(await ecommerce.isSellerBlocked(seller.address)).to.be.false;
    });

    it("Allows only paid buyers to see seller details", async () => {
      const { ecommerce, usdc, seller, buyer, other } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");
      await ecommerce.connect(seller).createProduct(
        "Phone", "img.com/p.png", ethers.parseUnits("100", 6), "Nice phone", 5
      );
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(buyer).purchaseProduct(1);
      // Buyer can access
      await expect(ecommerce.connect(buyer).getSellerDetails(1)).not.to.be.reverted;
      // Other cannot
      await expect(ecommerce.connect(other).getSellerDetails(1)).to.be.revertedWithCustomError(ecommerce, "NoPaymentForProduct");
    });

    it("Prevents withdrawing to zero address", async () => {
      const { ecommerce, owner } = await loadFixture(deployECommerceFixture);
      await expect(ecommerce.connect(owner).withdrawFees(ethers.ZeroAddress)).to.be.revertedWithCustomError(ecommerce, "InvalidWithdrawAddress");
    });

    it("Prevents getting blocked seller details if not blocked", async () => {
      const { ecommerce, seller } = await loadFixture(deployECommerceFixture);
      await expect(ecommerce.getBlockedSellerDetails(seller.address)).to.be.revertedWithCustomError(ecommerce, "ErrSellerNotBlocked");
    });

    it("reverts when getting blocked details for a non-blocked seller", async () => {
  const { ecommerce, seller } = await loadFixture(deployECommerceFixture);
  // No block yet
  await expect(ecommerce.getBlockedSellerDetails(seller.address))
    .to.be.revertedWithCustomError(ecommerce, "ErrSellerNotBlocked");
});

it("reverts when owner tries to unblock a seller who is not blocked", async () => {
  const { ecommerce, owner, seller } = await loadFixture(deployECommerceFixture);
  // Not blocked yet
  await expect(ecommerce.connect(owner).unblockSeller(seller.address))
    .to.be.revertedWithCustomError(ecommerce, "ErrSellerNotBlocked");
});
  });

  describe("Rating & Info", function () {
    it("Allows buyer to rate seller only as allowed", async () => {
      const { ecommerce, usdc, seller, buyer } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");
      await ecommerce.connect(seller).createProduct(
        "Phone", "img.com/p.png", ethers.parseUnits("100", 6), "Nice phone", 5
      );
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(buyer).purchaseProduct(1);
      // Can't rate yet
      await expect(ecommerce.connect(buyer).rateSeller(seller.address)).to.be.revertedWithCustomError(ecommerce, "SellerHasNoConfirmedPurchases");
      await ecommerce.connect(buyer).confirmPayment(1);
      await expect(ecommerce.connect(buyer).rateSeller(seller.address)).to.emit(ecommerce, "SellerRated");
      // Can't rate more than confirmed purchases
      await expect(ecommerce.connect(buyer).rateSeller(seller.address)).to.be.revertedWithCustomError(ecommerce, "SellerRatingExceeded");
    });

    it("Returns correct product and purchase details", async () => {
      const { ecommerce, usdc, seller, buyer } = await loadFixture(deployECommerceFixture);
      await ecommerce.connect(seller).registerSeller("Test Seller", "uri", "Lagos", "1234567890");
      await ecommerce.connect(seller).createProduct(
        "Phone", "img.com/p.png", ethers.parseUnits("100", 6), "Nice phone", 5
      );
      await usdc.connect(buyer).approve(ecommerce.target, ethers.parseUnits("100", 6));
      await ecommerce.connect(buyer).purchaseProduct(1);

      const prod = await ecommerce.getProduct(1);
      expect(prod.name).to.equal("Phone");
      const purchase = await ecommerce.getPurchase(1, buyer.address);
      expect(purchase.isPaid).to.be.true;
    });
  });
});