import testData from "./data/testData";

const Web3 = require('web3')
const ganache = require('ganache-core')
const RegistryContract = require('../build/contracts/Registry.json');

/*
* Helper class to assist with local deployment for testing purposes
*/
export class TestUtil {
  public static ganacheUri = 'http://localhost:8545';

  public static startGanache() {
    const server = ganache.server({
      "accounts": [
        {
          secretKey: '0x' + testData.firstKey,
          balance: 1e+24,
        },
        {
          secretKey: '0x' + testData.secondKey,
          balance: 1e+24,
        },
        {
          secretKey: '0x' + testData.recoveryKey,
          balance: 1e+24,
        },

      ],
    })
    server.listen(8545, (err, blockchain) => blockchain)
    return server
  }

  public static deployIdentityContract(address: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const web3 = new Web3(new Web3.providers.HttpProvider(TestUtil.ganacheUri))
      const contract = new web3.eth.Contract(RegistryContract.abi);
      contract.deploy({
        data: RegistryContract.bytecode,
        arguments: []
      }).send({
          gas: 1158307,
          from: address,
        }).on('receipt', receipt => {
        return resolve(receipt.contractAddress)
      }).on('error', reject)
    })
  }
}