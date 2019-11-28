import mocha = require('mocha');
import { expect, use } from 'chai'
import chaiAsPromised = require('chai-as-promised')

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
    const contractAddress = await TestUtil.deployIdentityContract()
    ethResolver = new EthereumResolver(contractAddress, ganacheServer.provider)
  })

  after(async () => {
    ganacheServer.close()
  })

  describe('DID Registry', () => {
    const firstKey = Buffer.from(testData.firstKey.private, 'hex')

    it('Should correctly register a user\'s identity', async () => {
      await expect(ethResolver.updateIdentity(
        firstKey,
        testData.testUserDID,
        "0x" + testData.firstKey.public,
        "",
      )).to.be.fulfilled
    })

    /**
     * depends on registered test DID
     */
    it('Should correctly query contract for the user\'s data', async () => {
      const hash = await ethResolver.resolveDID(testData.testUserDID)
      expect(hash).to.deep.equal({
        owner: "0x" + testData.firstKey.public,
        recovery: null,
        serviceHash: ""
      })
    })

    /**
     * depends on registered test DID
     */
    it('Should update the user\'s data', async () => {
      await ethResolver.updateIdentity(
        firstKey,
        testData.testUserDID,
        "0x" + testData.firstKey.public,
        testData.mockIPFSHash,
      )

      const val = await ethResolver.resolveDID(testData.testUserDID);

      expect(val).to.deep.equal({
        owner: "0x" + testData.firstKey.public,
        recovery: null,
        serviceHash: testData.mockIPFSHash
      })
    })

    /**
     * depends on the test DID registered by `testData.firstKey`.
     */
    it('Should not update registry entry with another key', async () => {
      const secondEthereumKey = Buffer.from(testData.secondKey.private, 'hex')

      await expect(ethResolver.updateIdentity(
        secondEthereumKey,
        testData.testUserDID,
        "0x" + testData.secondKey.public,
        "",
      )).to.be.rejectedWith(
        'Sender is not authorized.'
      )
    })

    it('Should return error in case reading record fails', async () => {
      await expect(ethResolver.resolveDID('invalidInput')).to.be.rejected
    })
  })

  describe('Identity Recovery', () => {
    const firstKey = Buffer.from(testData.firstKey.private, 'hex')
    const secondKey = Buffer.from(testData.secondKey.private, 'hex')
    const recoveryKey = Buffer.from(testData.recoveryKey.private, 'hex')

    before(async () => {
      await ethResolver.updateIdentity(
        firstKey,
        testData.testUserDID,
        "0x" + testData.firstKey.public,
        "",
      )
    })

    it('Should set the recovery key correctly', async () => {
      await ethResolver.setRecoveryKey(
        firstKey,
        testData.testUserDID,
        "0x" + testData.recoveryKey.public)
      const { recovery } = await ethResolver.resolveDID(testData.testUserDID)
      expect(recovery).to.equal('0x' + testData.recoveryKey.public)
    })

    /**
     * depends on a set recovery key for test DID
     */
    it('Should return error if recovery is changed', async () => {
      await expect(ethResolver.setRecoveryKey(
        firstKey,
        testData.testUserDID,
        "0x" + testData.secondKey.public
      ))
        .to.be.rejectedWith('Recovery can not be changed.')
    })

    it('Should not set recovery key with wrong key', async () => {
      await expect(ethResolver.setRecoveryKey(
        secondKey,
        testData.testUserDID,
        "0x" + testData.recoveryKey.public
      ))
        .to.be.rejectedWith('Sender is not authorized.')
    })

    it('Should change identity owner with recovery key', async () => {
      await ethResolver.updateIdentity(
        recoveryKey,
        testData.testUserDID,
        "0x" + testData.secondKey.public,
        testData.mockIPFSHash,
      )
      const { owner, recovery } = await ethResolver.resolveDID(testData.testUserDID)
      expect(owner).to.equal("0x" + testData.secondKey.public)
      expect(recovery).to.equal(null)
    })

    it('Should return error if DID is not registered', async () => {
      await expect(ethResolver.setRecoveryKey(
        firstKey,
        testData.wrongDID,
        '0x' + testData.recoveryKey.public
      )).to.be.rejectedWith('Sender is not authorized.')
    })
  })

  describe('Dates', () => {
      /**
       * Depends on several updates of the userDID registry entry
       */
      it('should find updated and created', async () => {
        const updated = await ethResolver.getUpdated(testData.testUserDID)
        const created = await ethResolver.getCreated(testData.testUserDID)
        expect(updated.getMilliseconds() > created.getMilliseconds()).to.be.true
      });

      /**
       * Depends on several updates of the userDID registry entry
       */
      it('should get updated count', async () => {
        const updatedCount = await ethResolver.getUpdatedCount(testData.testUserDID)
        expect(updatedCount).to.eq(4)
      });

      /**
       * Depends on several updates of the userDID registry entry
       */
      it('should filter for correct DID', async () => {
        await ethResolver.updateIdentity(
          Buffer.from(testData.secondKey.private, 'hex'),
          testData.secondUserDID,
          '0x' + testData.secondKey.public,
          ""
        )
        const updatedCount1 = await ethResolver.getUpdatedCount(testData.testUserDID)
        const updatedCount2 = await ethResolver.getUpdatedCount(testData.secondUserDID)
        expect(updatedCount2).to.eq(1)
        expect(updatedCount1).to.eq(4)
      });
    }
  )
});
