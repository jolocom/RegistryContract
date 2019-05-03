import mocha = require('mocha');
import { expect, use } from 'chai'
import chaiAsPromised = require('chai-as-promised')
import wallet = require('ethereumjs-wallet')

import testData from './data/testData'
import EthereumResolver from '../ts/index'
import { TestUtil } from "./utils";

use(chaiAsPromised)

/**
 * The contract state is reset with every run of the test suite
 * Some tests depend on each other.
 */
describe('Ethereum Resolver', () => {
  let ganacheServer;
  let ethResolver;

  before(async () => {
    ganacheServer = TestUtil.startGanache()

    const address = wallet.fromPrivateKey(Buffer.from(testData.firstKey, 'hex')).getAddress().toString('hex');
    const contractAddress = await TestUtil.deployIdentityContract(address)
    ethResolver  = new EthereumResolver(contractAddress, TestUtil.ganacheUri)

  })

  after(() => {
    ganacheServer.close()
  })

  describe('DID Registry', () => {

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

    /**
     * depends on the test DID registered by `testData.firstKey`.
     */
    it('Should return error in case writing record fails', async () => {
      const ethereumKey = Buffer.from(testData.secondKey, 'hex')

      await expect(ethResolver.updateDIDRecord(
        ethereumKey,
        testData.testUserDID,
        testData.mockDDOHash
      )).to.be.rejectedWith(
        'DID registration failed. Invalid DID private key'
      )
    })

    /**
     * depends on registered test DID
     */
    it('Should correctly query contract for the user\'s DDO hash', async () => {
      const hash = await ethResolver.resolveDID(testData.testUserDID)
      expect(hash).to.equal(testData.mockDDOHash)
    })

    it('Should return error in case reading record fails', async () => {
      await expect(ethResolver.resolveDID('invalidInput')).to.be.rejected
    })
  })

  describe('Identity Recovery', () => {
    const ethereumKey = Buffer.from(testData.firstKey, 'hex')
    const secondKey = Buffer.from(testData.secondKey, 'hex')
    const recoveryKey = Buffer.from(testData.recoveryKey, 'hex')
    const recoveryAddress = wallet.fromPrivateKey(recoveryKey).getAddress().toString('hex');
    const secondAddress = wallet.fromPrivateKey(secondKey).getAddress().toString('hex');

    it('Should set the recovery key correctly', async () => {
      await ethResolver.setRecoveryKey(ethereumKey, testData.testUserDID, recoveryAddress)
      const recovery = await ethResolver.getRecoveryKey(testData.testUserDID)
      expect(recovery).to.equal('0xBe99EE6Ad98269EF7938dFB2B742F5913E17b73b')
    })

    /**
     * depends on a set recovery key for test DID
     */
    it('Should return error if recovery is changed', async () => {
      await expect(ethResolver.setRecoveryKey(ethereumKey, testData.testUserDID, secondAddress))
        .to.be.rejectedWith('Recovery address is already set')
    })

    /**
     * depends on a set recovery key for test DID registered by first Key
     */
    it('Should return error if the wrong private key is used', async () => {
      await expect(ethResolver.setRecoveryKey(secondKey, testData.testUserDID, recoveryAddress))
        .to.be.rejectedWith('Invalid DID private key.')
    })

    it('Should return error if did is not registered', async () => {
      await expect(ethResolver.setRecoveryKey(
        ethereumKey,
        testData.wrongDID,
        recoveryAddress
      )).to.be.rejectedWith('DID is not registered.')
    })

    it('Should change identity owner correctly', async () => {
      await ethResolver.changeIdenityOwner(
        recoveryKey,
        testData.testUserDID,
        secondAddress,
        "New Hash"
      )
      const hash = await ethResolver.resolveDID(testData.testUserDID)
      expect(hash).to.equal('New Hash')
    })

    it('Should return error if the main key was used to change the owner', async () => {
      await expect(ethResolver.changeIdenityOwner(
        ethereumKey,
        testData.testUserDID,
        secondAddress,
        "New Hash"
      )).to.rejectedWith('Invalid recovery private key')
    })

    it('Should return error if the wrong DID is used to change the owner', async () => {
      await expect(ethResolver.changeIdenityOwner(
        recoveryKey,
        testData.wrongDID,
        secondAddress,
        "New Hash"
      )).to.rejectedWith('DID is not registered')
    })
  })
});
