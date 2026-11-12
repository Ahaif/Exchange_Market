import { isAddress } from "ethers";
import sepolia from "../deployments/11155111.json";
export const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
export const chainName = chainId === 31337 ? "Local development" : "Sepolia";
export const tokenAddress =
  process.env.NEXT_PUBLIC_TOKEN_ADDRESS ||
  (chainId === 11155111 ? sepolia.token : "");
export const exchangeAddress =
  process.env.NEXT_PUBLIC_EXCHANGE_ADDRESS ||
  (chainId === 11155111 ? sepolia.exchange : "");
export const configured =
  [11155111, 31337].includes(chainId) &&
  isAddress(tokenAddress) &&
  isAddress(exchangeAddress);
export const deploymentBlock = Number(
  process.env.NEXT_PUBLIC_DEPLOYMENT_BLOCK ||
    (chainId === 11155111 ? sepolia.block : 0),
);
export const tokenAbi = [
  "function balanceOf(address) view returns(uint256)",
  "function allowance(address,address) view returns(uint256)",
  "function approve(address,uint256) returns(bool)",
];
export const exchangeAbi = [
  "event Trade(uint256 indexed id,address indexed maker,address indexed taker)",
  "function token() view returns(address)",
  "function feeBps() view returns(uint256)",
  "function balanceOf(address,address) view returns(uint256)",
  "function depositEther() payable",
  "function withdrawEther(uint256)",
  "function depositToken(uint256)",
  "function withdrawToken(uint256)",
  "function orderCount() view returns(uint256)",
  "function orders(uint256) view returns(uint256 id,address user,address tokenGet,uint256 amountGet,address tokenGive,uint256 amountGive,uint256 timestamp)",
  "function orderFilled(uint256) view returns(bool)",
  "function orderCancelled(uint256) view returns(bool)",
  "function makeOrder(address,uint256,address,uint256)",
  "function cancelOrder(uint256)",
  "function fillOrder(uint256)",
];

export const publicRpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (chainId === 31337
    ? "http://127.0.0.1:8545"
    : "https://ethereum-sepolia-rpc.publicnode.com");
