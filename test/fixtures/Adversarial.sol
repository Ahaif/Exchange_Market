// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
interface IExchange {
 function depositEther() external payable;
 function withdrawEther(uint256) external;
 function withdrawToken(uint256) external;
}
contract TestToken is ERC20 {
 uint8 public mode;
 constructor() ERC20("Adversarial fixture","TEST") {_mint(msg.sender,1_000_000 ether);}
 function setMode(uint8 value) external {mode=value;}
 function transferFrom(address from,address to,uint256 value) public override returns(bool){if(mode==2)return false;return super.transferFrom(from,to,value);}
 function _update(address from,address to,uint256 value) internal override {
  if(mode==1&&from!=address(0)&&to!=address(0)&&value>0){super._update(from,to,value-1);super._update(from,address(0),1);}else super._update(from,to,value);
 }
}
contract NoReturnToken {
 mapping(address=>uint256)public balanceOf;
 mapping(address=>mapping(address=>uint256))public allowance;
 constructor(){balanceOf[msg.sender]=1_000_000 ether;}
 function approve(address spender,uint256 value)external{allowance[msg.sender][spender]=value;}
 function transferFrom(address from,address to,uint256 value)external{require(allowance[from][msg.sender]>=value);allowance[from][msg.sender]-=value;balanceOf[from]-=value;balanceOf[to]+=value;}
 function transfer(address to,uint256 value)external{balanceOf[msg.sender]-=value;balanceOf[to]+=value;}
}
contract WithdrawalReceiver {
 IExchange public exchange;
 bool public blocked;
 bool public rejectPayment;
 constructor(address target){exchange=IExchange(target);}
 function deposit()external payable{exchange.depositEther{value:msg.value}();}
 function withdraw(uint256 value,bool reject)external{rejectPayment=reject;exchange.withdrawEther(value);}
 receive()external payable{
  if(rejectPayment)revert("Receiver rejected payment");
  (bool ok,bytes memory result)=address(exchange).call(abi.encodeCall(IExchange.withdrawEther,(1)));
  blocked=!ok&&result.length>=4&&bytes4(result)==bytes4(keccak256("ReentrancyGuardReentrantCall()"));
 }
}
