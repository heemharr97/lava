const { Web3 } = require("web3");
const axios = require("axios");

// Array of rpc urls - Input you Lava rpc links here
const rpcEndpoints = ['https://eth1.lava.build/lava-referer-f59258e3-ba11-48c5-92d2-0ec6b13f3991/','https://eth1.lava.build/lava-referer-180869f6-e5f6-4c46-a116-09d5d02730bc/'];

// input your wallet address here
const walletAddress = "0x2D04FB4F94328E2DD539f820622720E236D27525";

// Contract address and ABI - Dai contract and ABI -- you can change to another contract
const contractAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
const contractABI = [ { constant: true, inputs: [{ internalType: "address", name: "", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], payable: false, stateMutability: "view", type: "function" }, { constant: true, inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], payable: false, stateMutability: "view", type: "function" } ];

// JSON-RPC payloads - Axios
const payloads = [ { method: "eth_chainId", params: [], id: 1 }, { method: "eth_protocolVersion", params: [], id: 2 }, { method: "net_version", params: [], id: 3 }, { method: "eth_getBlockByNumber", params: ["latest", true], id: 4 }, { method: "eth_getLogs", params: [{ fromBlock: "latest", toBlock: "latest", address: walletAddress }, ], id: 5, }, { method: "eth_getTransactionReceipt", params: ["0xf7ac13b8a6872aa5b24dd1a407350b0bd0ec7883ec1a03b659defdfac47f6d9c",], id: 6, }, { method: "eth_blockNumber", params: [], id: 7, }, { method: "eth_call", params: [{ "to": "0xb1f8e55c7f64d203c1400b9d8555d050f94adf39", "data": "0xf0002ea90000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000001e08dddff486a2da7d539bc6fee2bd0b6154100600000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000" }, "latest"], id: 8 }, ]

// Chainlink price feed contracts in key-value pairs - you can find more online or on etherscan and add it
const pairs = {
  "BTC / USD": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c",
  "ETH / USD": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
  "LINK / USD": "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c",
  "1INCH / USD": "0xc929ad75B72593967DE83E7F7Cda0493458261D9",
  "AAVE / USD": "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9",
  "APE / USD": "0xD10aBbC76679a20055E167BB80A24ac851b37056",
  "DAI / USD": "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
  "SOL / USD": "0x4ffC43a60e009B551865A93d232E33Fce9f01507",
  "YFI / USD": "0xA027702dbb89fbd58938e4324ac03B58d812b0E1",
  "UNI / USD": "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
  "BNB / USD": "0x14e613AC84a31f709eadbdF89C6CC390fDc9540A",
  "LTC / USD": "0x6AF09DF7563C363B5763b9102712EbeD3b9e859B",
};

// ABI for Chainlink AggregatorV3Interface
const aggregatorV3InterfaceABI = [ {inputs:[],name:"decimals",outputs:[{internalType:"uint8",name:"",type:"uint8"}],stateMutability:"view",type:"function"}, {inputs:[],name:"description",outputs:[{internalType:"string",name:"",type:"string"}],stateMutability:"view",type:"function"}, {inputs:[{internalType:"uint80",name:"_roundId",type:"uint80"}],name:"getRoundData",outputs:[{internalType:"uint80",name:"roundId",type:"uint80"},{internalType:"int256",name:"answer",type:"int256"},{internalType:"uint256",name:"startedAt",type:"uint256"},{internalType:"uint256",name:"updatedAt",type:"uint256"},{internalType:"uint80",name:"answeredInRound",type:"uint80"}],stateMutability:"view",type:"function"}, {inputs:[],name:"latestRoundData",outputs:[{internalType:"uint80",name:"roundId",type:"uint80"},{internalType:"int256",name:"answer",type:"int256"},{internalType:"uint256",name:"startedAt",type:"uint256"},{internalType:"uint256",name:"updatedAt",type:"uint256"},{internalType:"uint80",name:"answeredInRound",type:"uint80"}],stateMutability:"view",type:"function"}, {inputs:[],name:"version",outputs:[{internalType:"uint256",name:"",type:"uint256"}],stateMutability:"view",type:"function"} ];

// ENS Resolver contract address and ABI
const ensResolverContractAddress = "0x3671aE578E63FdF66ad4F3E12CC0c0d71Ac7510C";
const ensResolverContractABI = [ {inputs:[{internalType:"contract ENS",name:"_ens",type:"address"}],stateMutability:"nonpayable",type:"constructor"}, {inputs:[{internalType:"address[]",name:"addresses",type:"address[]"}],name:"getNames",outputs:[{internalType:"string[]",name:"r",type:"string[]"}],stateMutability:"view",type:"function"} ];

let conversionRate = {};

// Helper function to execute async tasks concurrently
async function executeAsyncTasks(asyncFunctions, ...args) {
  try {
    const results = await Promise.all(asyncFunctions.map((fn) => fn(...args)));
    return results;
  } catch (error) {
    throw new Error("Error executing async tasks:", error); // Throw a new Error object to propagate the error further
  }
}

// Fetch prices for pairs - Chainlink
async function fetchPrices(web3) {
  try {
    for (let pair of Object.entries(pairs)) { // Use Object.entries() to iterate over key-value pairs
      const [pairName, pairAddress] = pair;
      const priceFeed = new web3.eth.Contract(
        aggregatorV3InterfaceABI,
        pairAddress
      );
      const roundData = await priceFeed.methods.latestRoundData().call();
      const price = Number(roundData.answer) / 1e8;
      conversionRate[pairName] = price.toFixed(2);
    }
    console.log("Prices fetched:", conversionRate);
  } catch (error) {
    console.error("Error fetching prices:", error);
  }
}

// Main function to execute all tasks
async function main(web3) {
  try {
    const asyncFunctions = [
      async () => await getEthBalance(web3, walletAddress),
      async () => await getTransactionCount(web3, walletAddress, "latest"),
      async () => await getGasPrice(web3),
      async () => await web3.eth.getBlockNumber(),
      async () => await web3.eth.getChainId(),
      async () => await web3.eth.isSyncing(),
    ];

    const [
      ethBalance,
      transactionCount,
      gasPrice,
      blockNumber,
      chainId,
      syncingStatus,
    ] = await executeAsyncTasks(asyncFunctions);

    console.log(`Eth Balance: ${ethBalance}`);
    console.log(`Transaction Count: ${transactionCount}`);
    console.log(`Gas Price: ${gasPrice}`);
    console.log(`Block Number: ${blockNumber}`);
    console.log(`Chain ID: ${chainId}`);
    console.log(`Syncing Status: ${syncingStatus}`);

    const tokenContract = new web3.eth.Contract(contractABI, contractAddress);
    const tokenBalance = await getTokenBalance(tokenContract, walletAddress);
    const tokenName = await getTokenName(tokenContract);
    console.log(
      `The Token balance of ${walletAddress} is ${tokenBalance} ${tokenName}`
    );

    const ensResolverContract = new web3.eth.Contract(
      ensResolverContractABI,
      ensResolverContractAddress
    );
    const ensName = await getEnsName(ensResolverContract, walletAddress);
    console.log(`The ENS Name of ${walletAddress} is ${ensName}`);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Initialize connection - Axios stuffs
async function initializeConnection(rpcEndpoint) {
  try {
    const rpcResponses = await Promise.all(
      payloads.map((payload) => axios.post(rpcEndpoint, payload))
    );

    rpcResponses.forEach((response, index) => {
      const method = payloads[index].method;
      console.log(`Response from ${method}:`);

      if (response.data.result) {
        console.log(response.data.result);
      } else {
        console.log("No data found in the response.");
      }
    });
  } catch (error) {
    console.error("Error initializing connection:", error.message);
  }
}

// Helper functions
async function getTokenName(contract) {
  const tokenName = await contract.methods.name().call();
  return tokenName;
}

async function getTokenBalance(contract, address) {
  const balance = await contract.methods.balanceOf(address).call();
  return balance;
}

async function getEnsName(contract, address) {
  try {
    const ensNames = await contract.methods.getNames([address]).call();
    return ensNames[0];
  } catch (error) {
    console.error("Error getting ENS name:", error.message);
    throw new Error("Failed to retrieve ENS name");
  }
}

async function getEthBalance(web3, address) {
  const balance = await web3.eth.getBalance(address);
  return web3.utils.fromWei(balance, "ether");
}

async function getTransactionCount(web3, address, blockNumber) {
  const count = await web3.eth.getTransactionCount(address, blockNumber);
  return count;
}

async function getGasPrice(web3) {
  const gasPrice = await web3.eth.getGasPrice();
  return web3.utils.fromWei(gasPrice, "gwei");
}

// Main function to run all tasks and start fetching prices in intervals
async function mainAndConnection() {
  const providers = rpcEndpoints.map(endpoint => new Web3.providers.HttpProvider(endpoint));

  // Array to store promises
  const promiseArray = [];

  // Loop through each endpoint and create a promise for main and initializeConnection
  for (let i = 0; i < rpcEndpoints.length; i++) {
    const rpcEndpoint = rpcEndpoints[i];
    const provider = providers[i];

    const web3 = new Web3(provider);

    // Push the promise to the array
    promiseArray.push(main(web3));
    promiseArray.push(initializeConnection(rpcEndpoint));
    promiseArray.push(fetchPrices(web3));
  }

  // Run all promises concurrently
  await Promise.all(promiseArray);

  // Run main and initializeConnection every 20 seconds
  setInterval(async () => {
    const promiseArray = [];

    for (let i = 0; i < rpcEndpoints.length; i++) {
      const rpcEndpoint = rpcEndpoints[i];
      const provider = providers[i];

      const web3 = new Web3(provider);

      // Push the promise to the array -
      promiseArray.push(main(web3));
      promiseArray.push(initializeConnection(rpcEndpoint));
      promiseArray.push(fetchPrices(web3));
    }

    // We now Run all promises concurrently - old code ran them one after another
    await Promise.all(promiseArray);
  }, 20000);
}

// Call mainAndConnection
mainAndConnection();