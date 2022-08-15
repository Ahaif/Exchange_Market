import React from 'react';
import { Component } from 'react';
// import { ethers } from 'ethers'
// import Token from '../abis/Token.json'

import './App.css';
import { 
  loadWeb3,
  loadAccount,
  load_Token,
  load_Exchange,
  load_ExchangeSigner,
  load_TokenSigner
} from '../store/interactions';
import Navbar from './Navbar'
import Content from './Content'
import { contractsLoadedSelector } from '../store/selectors';

import { connect } from 'react-redux';

class App extends Component { 

 componentDidMount(){
  this.loadBlockchainData(this.props.dispatch)

  }
  async loadBlockchainData(dispatch)
  {

    const provider = loadWeb3(dispatch)
    if(!provider)
    {
      window.alert('Please Login With Metamask')
      return 
    }
    const networkID = await(await provider.getNetwork()).chainId
    await loadAccount(provider, dispatch)
    
    const token = await load_Token(provider, networkID, dispatch)
    if(!token)
    {
      window.alert('Token Smart Contract is not Deployed to the current network')
      return 
    }
    const exchange = await load_Exchange(provider, networkID, dispatch)
    if(!exchange)
    {
      window.alert('Exchange Smart Contract is not Deployed to the current network')
      return 
    }
    await load_ExchangeSigner(provider, networkID, dispatch)
    await load_TokenSigner(provider, networkID, dispatch)

  }
    
  
 


render() {

  return (
    <div>
      <Navbar/>
      {this.props.contractsLoaded ? <Content/> : <div className='content'></div>}
  
    </div>
  );
  }
}

function mapStateToProps(state)
{
  
  return{

    contractsLoaded : contractsLoadedSelector(state)
      
  }
}

export default connect(mapStateToProps)(App);

// export default App;
