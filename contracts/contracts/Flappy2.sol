// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Flappy2 {
    uint public silverScore = 10;
    uint public goldScore = 40;
    uint public silverPrize = 0.1 ether;
    uint public goldPrize = 0.5 ether;
    address public owner;
    bool public active = true;

    uint[] public price = [0, 1 ether, 3 ether, 5 ether, 8 ether, 10 ether];
    mapping(address => bool) public isPlaying;
    mapping(address => mapping(uint => bool)) public ownedBirds;
    mapping(address => uint) public usingBird;
    mapping(address => uint) public pendingRewards; // Stores pending rewards

    event GameStarted(address indexed player);
    event GameEnded(address indexed player, uint score, uint reward);
    event RewardClaimed(address indexed player, uint amount);
    event BirdPurchased(address indexed player, uint birdId, uint price);
    event ContractDeactivated();
    event FundsWithdrawn(address indexed owner, uint amount);
    event Received(address indexed sender, uint amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can perform this action");
        _;
    }

    modifier isActive() {
        require(active, "Contract is inactive");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setSilverPrize(uint prize) external onlyOwner {
        silverPrize = prize;
    }

    function setGoldPrize(uint prize) external onlyOwner {
        goldPrize = prize;
    }

    function play() external isActive {
        require(!isPlaying[msg.sender], "Player is already in a game");
        isPlaying[msg.sender] = true;
        emit GameStarted(msg.sender);
    }

    function endGame(uint score) external isActive {
        require(isPlaying[msg.sender], "Player must be in a game");
        isPlaying[msg.sender] = false;

        uint reward = 0;
        if (score >= goldScore) {
            reward = goldPrize;
        } else if (score >= silverScore) {
            reward = silverPrize;
        }

        if (reward > 0) {
            pendingRewards[msg.sender] += reward; // Store reward instead of sending
        }

        emit GameEnded(msg.sender, score, reward);
    }

    function claimReward() external isActive {
        uint amount = pendingRewards[msg.sender];
        require(amount > 0, "No reward to claim");
        require(address(this).balance >= amount, "Contract does not have enough funds");

        pendingRewards[msg.sender] = 0; // Reset before sending to avoid re-entrancy
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Reward transfer failed");

        emit RewardClaimed(msg.sender, amount);
    }

    function quit() external isActive {
        require(isPlaying[msg.sender], "Player must be in a game");
        isPlaying[msg.sender] = false;
    }

    function purchase(uint birdId) external payable isActive {
        require(birdId < price.length, "Invalid birdId");
        require(msg.value >= price[birdId], "Insufficient funds to purchase");

        ownedBirds[msg.sender][birdId] = true;
        emit BirdPurchased(msg.sender, birdId, msg.value);
    }

    function withdrawAll() external onlyOwner {
        uint balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = payable(owner).call{value: balance}("");
        require(success, "Withdraw failed");
        
        emit FundsWithdrawn(owner, balance);
    }

    function deactivateContract() external onlyOwner {
        active = false;
        emit ContractDeactivated();
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }
}
