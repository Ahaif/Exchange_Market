const Token = artifacts.require("Token");
const Exchange = artifacts.require("Exchange");

module.exports = async function (deployer) {
  await deployer.deploy(Token);
  //we should fetch ganache account by using etherjs(web3.eth.getAccounts())
  // chose one acc as feeAccount and feePercent
  await deployer.deploy(Exchange,'0x53E24D3D08Fce3D4C7E8AE2a94a149b44D3067Fc', 10);
};
