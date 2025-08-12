require("@nomicfoundation/hardhat-toolbox");
  require('dotenv').config();

  module.exports = {
    solidity: {
      version: "0.8.28",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200,
        },
        viaIR: false,
      },
    },
    networks: {
      // Avalanche Fuji Testnet configuration
      'fuji': {
        url: "https://api.avax-test.network/ext/bc/C/rpc",
        accounts: [process.env.WALLET_KEY], // Your private key stored in .env
        gasPrice: 1000000000, // 1 Gwei gas price
      },
    },
    etherscan: {
       apiKey: {
      fuji: "snowtrace", // Placeholder — Snowtrace now uses Routescan, no API key required
    },
    customChains: [
      {
        network: "fuji",
        chainId: 43113,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/43113/etherscan",
          browserURL: "https://testnet.avax.routescan.io",
        },
      },
    ],
    },
    sourcify: {
      enabled: false
    },
  };
