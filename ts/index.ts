import { ethers } from 'ethers'
import { Web3Provider } from "ethers/providers";

const Web3 = require('web3');

const RegistryContract = require('../build/contracts/Registry.json');

export interface IdentityData {
  owner: string,
  recovery: string,
  serviceHash: string,
}

export default class EthereumResolver {
  private readonly provider;
  private contract;
  private web3contract;

  constructor(contractAddress: string, provider: string | Web3Provider) {
    const filter = {
      address: contractAddress
    }
    if (typeof provider == 'string')
      this.provider = new ethers.providers.JsonRpcProvider(provider)
    else
      this.provider = new ethers.providers.Web3Provider(provider)

    // @ts-ignore
    const web3 = new Web3(provider)
    this.web3contract = new web3.eth.Contract(RegistryContract.abi, contractAddress)

    this.contract = new ethers.Contract(contractAddress, RegistryContract.abi, this.provider)
  }

  async resolveDID(did: string): Promise<IdentityData> {
    const idString = this._stripMethodPrefix(did);
    const result = await this.contract.getIdentity(idString)
    return {
      owner: result[0], recovery: result[1] == '0x' ? null : result[1], serviceHash: result[2]
    }
  }

  async updateIdentity(ethereumKey: Buffer, did: string, owner: string, servicesHash: string): Promise<void> {
    console.log('\nUpdate Identity')
    const idString = this._stripMethodPrefix(did);
    let tx = await this.getSigner(ethereumKey).setIdentity(idString, owner, servicesHash)
    await tx.wait()
  }

  async setRecoveryKey(ethereumKey: Buffer, did: string, recovery: string): Promise<void> {
    console.log('\nSet recovery')
    const idString = this._stripMethodPrefix(did);
    let tx = await this.getSigner(ethereumKey).setRecovery(idString, recovery)
    await tx.wait()
  }

  async getUpdated(did): Promise<Date> {
    const updates = await this.getUpdatedEvents(did)
    return new Date(updates[updates.length - 1])
  }

  async getCreated(did): Promise<Date> {
    const updates = await this.getUpdatedEvents(did)
    return new Date(updates[0])
  }

  private async getUpdatedEvents(did): Promise<number[]> {
    const idString = this._stripMethodPrefix(did);
    return (await this.web3contract.getPastEvents('Updated', {
      filter: { did: idString },
      fromBlock: 0,
      toBlock: 'latest',
    })).map(e => e.returnValues.timestamp.toNumber())
  }


  private _stripMethodPrefix(did: string): string {
    return `0x${ did.substring(did.lastIndexOf(':') + 1) }`
  }

  private getSigner(privateKey: Buffer) {
    const wallet = new ethers.Wallet(privateKey, this.provider)
    return this.contract.connect(wallet)
  }
}
