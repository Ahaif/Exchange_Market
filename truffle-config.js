
require('dotenv').config();
const HDWalletProvider = require("@truffle/hdwallet-provider");



// const PRIVATE_KEYS='e2acec3a4bf39ab7b011f8be1cdc2e1f94aa476dd37ee7972f1c71bb266a09f6,9536298e694d863d85d86e7b5fb7e2159daf340f669518460d70ab64ccdc9a23'
// const INFURA_API_KEY= "https://kovan.infura.io/v3/1b21b86ebb1c4aee8048fb612a51126e"

module.exports = {

  networks: {
    development:{
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    },
    // kovan: {
    //   provider: function() {
    //     return new HDWalletProvider(
    //       PRIVATE_KEYS.split(','), 
    //      INFURA_API_KEY
    //     )
    //   },
    //   gas: 5000000,
    //   gasPrice: 25000000000,
    //   network_id: 42
    // }
  },
  contracts_directory : './src/contracts/',
  contracts_build_directory : './src/abis/',

  // Configure your compilers
  compilers: {
    solc: {
      version: "0.8.13",      // Fetch exact version from solc-bin (default: truffle's version)
       optimizer: {
         enabled: false,
         runs: 200
       },
      //  evmVersion: "byzantium"
      // }
    }
  },
};
