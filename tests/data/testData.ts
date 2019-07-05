import { ethers } from "ethers";

const first = ethers.Wallet.createRandom()
const second = ethers.Wallet.createRandom()
const recovery = ethers.Wallet.createRandom()

export default {
  firstKey: {
    private: first.privateKey.slice(2),
    public: ethers.utils.computePublicKey(first.privateKey, false).slice(4),
  },
  secondKey: {
    private: second.privateKey.slice(2),
    public: ethers.utils.computePublicKey(second.privateKey, false).slice(4),
  },
  recoveryKey: {
    private: recovery.privateKey.slice(2),
    public: ethers.utils.computePublicKey(recovery.privateKey, false).slice(4),
  },
  mockIPFSHash: 'Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a',
  testUserDID:'did:jolo:bf8095f75ec116362eb31d5e68736be6688f82db616d1dd7df5e9f99047347b2',
  wrongDID:'did:jolo:a634484858571199b681f6dfdd9ecd2f01df5b38f8379b3aaa89436c61fd1912',
  contrAddr: '0xc4b48901af7891d83ce83877e1f8fb4c81a94907',
}
