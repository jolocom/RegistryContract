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

    const address = wallet.fromPrivateKey(Buffer.from(testData.firstKey.private, 'hex')).getAddress().toString('hex');
    const contractAddress = await TestUtil.deployIdentityContract(address)
    ethResolver = new EthereumResolver(contractAddress, TestUtil.ganacheUri)

  })

  after(() => {
    ganacheServer.close()
  })

  describe('DID Registry', () => {

    it('Should correctly register a user\'s DDO hash', async () => {
      const ethereumKey = Buffer.from(testData.firstKey.private, 'hex')
      await ethResolver.updateIdentity(
        ethereumKey,
        testData.testUserDID,
        "0x" + testData.firstKey.public,
        "",
      )

      const val = await ethResolver.resolveDID(testData.testUserDID);

      expect(val).to.deep.equal({
        0: "0x" + testData.firstKey.public,
        1: null,
        2: ""
      })
    })

    /**
     * depends on the test DID registered by `testData.firstKey`.
     */
    it('Should return error in case writing record fails', async () => {
      const ethereumKey = Buffer.from(testData.secondKey.private, 'hex')

      await expect(ethResolver.updateIdentity(
        ethereumKey,
        testData.testUserDID,
        "0x" + testData.secondKey.public,
        "",
      )).to.be.rejectedWith(
        'Sender is not authorized.'
      )
    })

    /**
     * depends on registered test DID
     */
    it('Should correctly query contract for the user\'s data', async () => {
      const hash = await ethResolver.resolveDID(testData.testUserDID)
      expect(hash).to.deep.equal({
        0: "0x" + testData.firstKey.public,
        1: null,
        2: ""
      })
    })

    /**
     * depends on registered test DID
     */
    it('Should update the user\'s data', async () => {
      const ethereumKey = Buffer.from(testData.firstKey.private, 'hex')

      await ethResolver.updateIdentity(
        ethereumKey,
        testData.testUserDID,
        "0x" + testData.firstKey.public,
        testData.mockIPFSHash
      )

      const val = await ethResolver.resolveDID(testData.testUserDID);

      expect(val).to.deep.equal({
        0: "0x" + testData.firstKey.public,
        1: null,
        2: testData.mockIPFSHash
      })

    })

    it('Should return error in case reading record fails', async () => {
      await expect(ethResolver.resolveDID('invalidInput')).to.be.rejected
    })
  })

  describe('Identity Recovery', () => {
    const ethereumKey = Buffer.from(testData.firstKey.private, 'hex')
    const secondKey = Buffer.from(testData.secondKey.private, 'hex')
    const recoveryKey = Buffer.from(testData.recoveryKey.private, 'hex')

    it('Should not set recovery key with wrong key', async () => {
      await expect(ethResolver.setRecoveryKey(
        secondKey,
        testData.testUserDID,
        "0x" + testData.recoveryKey.public
      ))
        .to.be.rejectedWith('Sender is not authorized.')
    })

    it('Should set the recovery key correctly', async () => {
      await ethResolver.setRecoveryKey(
        ethereumKey,
        testData.testUserDID,
        "0x" + testData.recoveryKey.public)
      const recovery = await ethResolver.resolveDID(testData.testUserDID)
      expect(recovery[1]).to.equal('0x' + testData.recoveryKey.public)
    })

    /**
     * depends on a set recovery key for test DID
     */
    it('Should return error if recovery is changed', async () => {
      await expect(ethResolver.setRecoveryKey(
        ethereumKey,
        testData.testUserDID,
        "0x" + testData.secondKey.public
      ))
        .to.be.rejectedWith('Recovery is not empty')
    })


    it('Should return error if did is not registered', async () => {
      await expect(ethResolver.setRecoveryKey(
        ethereumKey,
        testData.wrongDID,
        '0x' + testData.recoveryKey.public
      )).to.be.rejectedWith('Sender is not authorized.')
    })

    it('Should change identity owner with recovery key', async () => {

      await ethResolver.updateIdentity(
        recoveryKey,
        testData.testUserDID,
        "0x"+ testData.secondKey.public,
        testData.mockIPFSHash,
      )
      const hash = await ethResolver.resolveDID(testData.testUserDID)
      expect(hash[0]).to.equal("0x" + testData.secondKey.public)
    })
  })
});
