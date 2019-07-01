import wallet = require('ethereumjs-wallet');
import * as Transaction from 'ethereumjs-tx'

const Web3 = require("web3");
const RegistryContract = require('../build/contracts/Registry.json');


export default class EthereumResolver {
  private web3;
  private contract;
  private readonly contractAddress: string;
  private gasLimit = 250000;
  private gasPrice = 20e9;

  constructor(address: string, providerUri: string) {
    this.web3 = new Web3(providerUri);
    this.contractAddress = address;
    this.contract = new this.web3.eth.Contract(RegistryContract.abi, address)
  }

  resolveDID(did: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const idString = this._stripMethodPrefix(did);

      try {
        this.contract.methods.getIdentity(idString).call()
          .then(result => resolve(result))
          .catch(reason => reject(reason))
      } catch (e) {
        reject(e)
      }
    })
  }

  updateIdentity(ethereumKey: Buffer, did: string, owner: string, servicesHash: string): Promise<{}> {
    const idString = this._stripMethodPrefix(did);
    const callData = this.contract.methods.setIdentity(idString, owner, servicesHash)
      .encodeABI();

    return this.sendTransaction(ethereumKey, callData)
  }

  setRecoveryKey(ethereumKey: Buffer, did: string, recovery: string): Promise<{}> {
    const didHash = this._stripMethodPrefix(did);
    const callData = this.contract.methods.setRecovery(didHash, recovery).encodeABI();
    return this.sendTransaction(ethereumKey, callData)
  }

  private _stripMethodPrefix(did: string): string {
    return `0x${ did.substring(did.lastIndexOf(':') + 1) }`
  }

  private sendTransaction(ethereumKey: Buffer, callData: string): Promise<{}> {
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
          .on('receipt', r => console.log("gas used: ", r.gasUsed))
          .on('error', (err) => reject(err))
      })
    })
  }
}
