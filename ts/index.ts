import wallet = require('ethereumjs-wallet');
import * as Transaction from 'ethereumjs-tx'

const RegistryContract = require('../build/contracts/Registry.json');
const Web3 = require('web3');

/*
* Helper class to assist with local deployment for testing purposes
*/
export class TestDeployment {
  public static deployIdentityContract(web3: any, from: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const contract = new web3.eth.Contract(RegistryContract.abi);

      contract.deploy({
        data: RegistryContract.bytecode
      }).send({
        gas: 467000,
        from
      }).on('receipt', receipt => {
        return resolve(receipt.contractAddress)
      }).on('error', reject)
    })
  }
}

export default class EthereumResolver {
  private web3: any;
  private indexContract: any;
  private contractAddress: string;
  private gasLimit = 250000;
  private gasPrice = 20e9;

  constructor(address: string, providerUri: string) {
    const provider = new Web3.providers.HttpProvider(providerUri);
    this.web3 = new Web3(provider);
    this.contractAddress = address;
    this.indexContract = new this.web3.eth.Contract(RegistryContract.abi, address)
  }

  resolveDID(did: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const keyHash = this._stripMethodPrefix(did);
      this.indexContract.methods.getRecord(keyHash).call((error, result) => {
        if (error) {
          return reject(error)
        }
        return resolve(result)
      })
    })
  }

  updateDIDRecord(ethereumKey: any, did: string, newHash: string): Promise<void> {
    const keyHash = this._stripMethodPrefix(did);

    const callData = this.indexContract.methods.setRecord(keyHash, newHash)
      .encodeABI();

    return this.sendTransaction(ethereumKey, callData)
  }

  setRecoveryKey(ethereumKey: any, did: string, recoveryAddress: string): Promise<void> {
    const didHash = this._stripMethodPrefix(did);

    const callData = this.indexContract.methods.setRecovery(didHash, recoveryAddress).encodeABI();
    return this.sendTransaction(ethereumKey, callData)
  }

  changeIdenityOwner(recoveryKey: any, did: string, newOwnerAddress: string, newHash: string): Promise<void> {
    const didHash = this._stripMethodPrefix(did);

    const callData = this.indexContract.methods.changeOwner(didHash, newOwnerAddress, newHash).encodeABI();
    return this.sendTransaction(recoveryKey, callData)
  }

  // TODO test helper method
  getRecoveryKey(did: string):Promise<void>{

    return new Promise((resolve, reject) => {
      const keyHash = this._stripMethodPrefix(did);
      this.indexContract.methods.getRecoveryAddress(keyHash).call((error, result) => {
        if (error) {
          return reject(error)
        }
        return resolve(result)
      })
    })

  }

  private _stripMethodPrefix(did: string): string {
    return `0x${ did.substring(did.lastIndexOf(':') + 1) }`
  }

  private sendTransaction(ethereumKey: any, callData: string): Promise<void> {
    const w = wallet.fromPrivateKey(ethereumKey);
    const address = w.getAddress().toString('hex');

    return this.web3.eth.getTransactionCount(address).then(nonce => {
      const tx = new Transaction({
        nonce: nonce,
        gasLimit: this.gasLimit,
        gasPrice: this.gasPrice,
        data: callData,
        to: this.contractAddress
      });

      tx.sign(ethereumKey);
      const serializedTx = tx.serialize();

      return new Promise((resolve, reject) => {
        this.web3.eth.sendSignedTransaction(`0x${ serializedTx.toString('hex') }`)
          .on('confirmation', () => resolve())
          .on('error', (err) => reject(err))
      })
    })
  }
}
