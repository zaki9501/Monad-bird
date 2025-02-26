const HUDController = require('HUDController');
const Web3 = require('web3.min');
const PRICE_PER_OPEN = '1'; // in Finney
const GAS_PRICE_DEFAULT = '20000000000';

const MONAD_TESTNET_RPC = "https://testnet-rpc.monad.xyz"; // Monad Testnet RPC
const MONAD_NETWORK_ID = "10143"; // Monad Testnet Network ID

const Web3Controller = cc.Class({
  extends: cc.Component,

  properties: {
    Web3: null,
    Web3Provider: null,
    Contract: null,
    ContractABI: cc.JsonAsset,
    CurrentAccount: 'NA',

    connectWalletButton: {
      default: null,
      type: cc.Node
    }, // Button for connecting wallet

    walletText: {
      default: null,
      type: cc.Label
    }, // Label to display wallet address

    playButton: {
      default: null,
      type: cc.Node
    },

    settingButton: cc.Node,
    txConfirm: cc.Node,
  },

  statics: {
    instance: null
  },

  onLoad() {
    console.log("✅ Web3Controller Loaded");

    Web3Controller.instance = this;

    this.txConfirm.active = false;
    this.playButton.active = false; // Disable play button until wallet is connected

    if (this.connectWalletButton) {
      this.connectWalletButton.active = true; // Show Connect Wallet button
      this.connectWalletButton.on('click', this.connectWallet, this);
      console.log("✅ Connect Wallet Button Ready!");
    }
  },

  async connectWallet() {
    console.log("🔄 Connecting Wallet...");

    if (window.ethereum) {
      this.Web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        console.log("✅ MetaMask Connected");
        await this.initAccount();
      } catch (error) {
        console.error("🛑 MetaMask Connection Error:", error);
      }
    } else {
      console.error("🛑 MetaMask is not installed! Please install it to use this feature.");
    }
  },

  async initAccount() {
    console.log("🔄 Initializing Account...");

    const accounts = await this.Web3.eth.getAccounts();
    if (accounts.length > 0) {
      this.CurrentAccount = accounts[0].toLowerCase();
      console.log("✅ Connected Account:", this.CurrentAccount);

      if (this.walletText) {
        this.walletText.string = `Wallet: ${this.CurrentAccount}`;
      }

      if (this.connectWalletButton) {
        this.connectWalletButton.active = false; // Hide connect button
      }

      if (this.playButton) {
        this.playButton.active = true; // Enable play button
      }

      await this.initContract();
      await this.updateBalance();
    } else {
      console.error("🛑 No accounts found! Please log in to MetaMask.");
    }
  },

  async initContract() {
    const networkId = await this.Web3.eth.net.getId();
    console.log("🌐 Connected to Network:", networkId);

    if (networkId.toString() !== MONAD_NETWORK_ID) {
      console.error(`🛑 Wrong network! Please switch to Monad Testnet (${MONAD_NETWORK_ID})`);
      return;
    }

    if (!this.ContractABI || !this.ContractABI.json || !this.ContractABI.json.abi) {
      console.error("🛑 Contract ABI is missing!");
      return;
    }

    if (!this.ContractABI.json.networks || !this.ContractABI.json.networks[MONAD_NETWORK_ID]) {
      console.error("🛑 Contract not deployed on Monad Testnet!");
      return;
    }

    this.Contract = new this.Web3.eth.Contract(
      this.ContractABI.json.abi,
      this.ContractABI.json.networks[MONAD_NETWORK_ID]?.address
    );

    console.log("✅ Contract Loaded:", this.Contract.options.address);
  },

  async playTx() {
    console.log("🔄 Starting Play Transaction...");

    if (!this.Contract) {
      console.error("🛑 Contract not initialized! Cannot play.");
      return;
    }

    if (this.CurrentAccount === 'NA') {
      console.error("🛑 No wallet connected!");
      return;
    }

    this.txConfirm.active = true;
    this.playButton.active = false;
    this.settingButton.active = false;

    try {
      const tx = await this.Contract.methods.play().send({
        from: this.CurrentAccount,
        value: this.Web3.utils.toWei(PRICE_PER_OPEN, 'finney'),
        gas: 250000,
        gasPrice: GAS_PRICE_DEFAULT
      });

      console.log("✅ Play Transaction Sent:", tx);

      // ✅ Wait for confirmation
      const receipt = await this.Web3.eth.getTransactionReceipt(tx.transactionHash);
      console.log("✅ Transaction Confirmed:", receipt);

    } catch (error) {
      console.error("🛑 Play Error:", error);
    } finally {
      setTimeout(() => {
        this.txConfirm.active = false;
        this.playButton.active = true;
        this.settingButton.active = true;
      }, 2000);
    }
  },

  async updateBalance() {
    try {
      const balance = await this.Web3.eth.getBalance(this.CurrentAccount);
      HUDController.instance.updateBalanceText(this.fromWei(balance));
    } catch (error) {
      console.error("🛑 Error fetching balance:", error);
    }
  },

  fromWei(value) {
    return parseInt(this.Web3.utils.fromWei(value, 'ether'));
  }
});

module.exports = Web3Controller;
