import testData from "./data/testData";
import { ethers } from 'ethers';
const ganache = require('ganache-core')
const RegistryContract = require('../build/contracts/Registry.json');

/*
* Helper class to assist with local deployment for testing purposes
*/
const PORT = 8545
export class TestUtil {
  private static gasUsageLogger = {
    log : (evt) => {
      if (evt.indexOf('Gas usage') !== -1)
        console.log(evt)
    }
  }

  public static ganacheUri = `http://localhost:${PORT}`;

  public static startGanache() {
    const balance = 1e+24
    const server = ganache.server({
      accounts: [
        { secretKey: '0x' + testData.firstKey.private, balance, },
        { secretKey: '0x' + testData.secondKey.private, balance, },
        { secretKey: '0x' + testData.recoveryKey.private, balance, },
      ],
      logger: TestUtil.gasUsageLogger, // use `console` to print everything
    })
    server.listen(PORT, (err, blockchain) => blockchain)
    return server
  }

  public static async deployIdentityContract(): Promise<string> {
    console.log('Deploying Test Contract')
    let provider = new ethers.providers.JsonRpcProvider(this.ganacheUri)
    let wallet = new ethers.Wallet(testData.firstKey.private, provider)
    let factory = new ethers.ContractFactory(RegistryContract.abi, RegistryContract.bytecode, wallet)
    let contract = (await factory.deploy());
    await contract.deployed()
    return contract.address
  }
}