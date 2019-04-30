pragma solidity 0.5.7;

contract Registry {

    struct Record {
        address owner;
        string ddoHash;
        address recovery;
    }

    mapping (bytes32 => Record) private didToHash;

    address private owner;

    constructor() public {
        owner = msg.sender;
    }

    function setRecord(bytes32 did, string memory newHash) public {
        bytes memory emptyTest = bytes(didToHash[did].ddoHash);
        if (emptyTest.length != 0 && didToHash[did].owner != msg.sender) {
            revert("DID registration failed. Invalid DID private key.");
        }
        address recovery = address(0);
        if(emptyTest.length != 0){
            recovery = didToHash[did].recovery;
        }

        didToHash[did] = Record(msg.sender, newHash, recovery);
    }

    function changeOwner(bytes32 did, address newOwner, string memory newHash) public {
        if (bytes(didToHash[did].ddoHash).length == 0){
            revert("DID is not registered");
        }
        if (didToHash[did].recovery != msg.sender){
            revert("Invalid recovery private key");
        }

        didToHash[did] = Record(newOwner, newHash, address(0));
    }

    function setRecovery(bytes32 did, address recoveryAddress) public {
        bytes memory emptyTest = bytes(didToHash[did].ddoHash);
        if (emptyTest.length == 0) {
            revert("DID is not registered.");
        }
        if (emptyTest.length != 0 && didToHash[did].owner != msg.sender) {
            revert("Invalid DID private key.");
        }
        didToHash[did] = Record(msg.sender, didToHash[did].ddoHash, recoveryAddress);
    }

    function getHash(bytes32 did) public view returns (string memory) {
        return didToHash[did].ddoHash;
    }

    // TODO remove
    function getRecoveryAddress(bytes32 _did) public view returns (address){
        return didToHash[did].recovery;
    }

    // TODO remove
    function getOwner(bytes32 did) public view returns(address){
        return didToHash[did].owner;
    }

}
