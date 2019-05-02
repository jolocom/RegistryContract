import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as wallet from 'ethereumjs-wallet'

import testData from './data/testData'

import EthereumResolver from '../ts/index'

chai.use(chaiAsPromised)
const expect = chai.expect


describe('Ethereum Resolver', () => {
  const rpcEndpoint = 'http://localhost:8545'
  const ethResolver = new EthereumResolver(testData.contrAddr, rpcEndpoint)

  it('Should correctly register a user\'s DDO hash', async () => {
    const ethereumKey = Buffer.from(testData.firstKey, 'hex')
    await ethResolver.updateDIDRecord(
      ethereumKey,
      testData.testUserDID,
      testData.mockDDOHash
    )
    const val = await ethResolver.resolveDID(testData.testUserDID);
    expect(val).to.equal(testData.mockDDOHash)
  })

  it('Should return error in case writing record fails', async () => {
    const ethereumKey = Buffer.from(testData.secondKey, 'hex')

    await expect(ethResolver.updateDIDRecord(
      ethereumKey,
      testData.testUserDID,
      testData.mockDDOHash
    )).to.be.rejectedWith(
      'Returned error: VM Exception while processing transaction: revert'
    )
  })

  it('Should correctly query contract for the user\'s DDO hash', async () => {
    const hash = await ethResolver.resolveDID(testData.testUserDID)
    expect(hash).to.equal(testData.mockDDOHash)
  })

  it('Should return error in case reading record fails', async () => {
    await expect(ethResolver.resolveDID('invalidInput')).to.be.rejected
  })

  it('Should set the recovery key correctly', async () => {
    const ethereumKey = Buffer.from(testData.firstKey, 'hex')
    const recoveryKey = Buffer.from(testData.secondKey, 'hex')
    const recoveryAddress = wallet.fromPrivateKey(recoveryKey).getAddress().toString('hex');

    await ethResolver.setRecoveryKey(
      ethereumKey,
      testData.testUserDID,
      recoveryAddress
    )
    const recovery = await ethResolver.getRecoveryKey(testData.testUserDID)

    expect(recovery).to.equal('0xc1947e1a6880335477C7dE4FF07D12d359234473')
  })
});
