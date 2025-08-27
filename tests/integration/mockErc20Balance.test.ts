// mock the balance of an address for an ERC20 token, and then use eth_call to get the balance by passing in the stateDiff to override the storage

import { createPublicClient, http, type Address, encodeAbiParameters, encodeFunctionData, decodeFunctionResult, parseAbiItem, getAddress, toHex } from "viem";
import { generateMockBalanceData, getErc20Balance } from "../../src";
import { base, mainnet } from "viem/chains";

describe("mockErc20Balance", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  const mockAddress = getAddress(`0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`);

  it("[solidity] should mock the balance of an address for an ERC20 token", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const holderAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const mockBalanceAmount = "9600000";
    const maxSlots = 100;

    // get balance of mockAddress before, to make sure its 0 before we mock it
    const balanceBefore = await getErc20Balance(
      baseClient,
      tokenAddress,
      mockAddress
    );
    expect(balanceBefore.toString()).toBe("0");

    const data = await generateMockBalanceData(baseClient, {
      tokenAddress,
      holderAddress,
      mockAddress,
      mockBalanceAmount,
      maxSlots,
    });

    // Create the stateDiff object
    const stateDiff = {
      [tokenAddress]: {
        stateDiff: {
          [data.slot]: data.balance,
        },
      },
    };

    // Function selector for balanceOf(address)
    const balanceOfCalldata = encodeFunctionData({
      abi: [parseAbiItem('function balanceOf(address owner) view returns (uint256)')],
      functionName: 'balanceOf',
      args: [mockAddress]
    });

    // Use the new stateDiff to get the balance
    const result = await baseClient.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: balanceOfCalldata,
        },
        'latest',
        stateDiff,
      ],
    });

    // Decode the result
    const decodedBalance = decodeFunctionResult({
      abi: [parseAbiItem('function balanceOf(address owner) view returns (uint256)')],
      functionName: 'balanceOf',
      data: result
    });

    // 9600000
    expect(decodedBalance.toString()).toBe(mockBalanceAmount);
  }, 120000);

  it("[vyper] should mock the balance of an address for an ERC20 token", async () => {
    const tokenAddress: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const holderAddress: Address = "0x0A59649758aa4d66E25f08Dd01271e891fe52199";
    const mockBalanceAmount = "99000000";
    const maxSlots = 100;

    // get balance of mockAddress before, to make sure its 0 before we mock it
    const balanceBefore = await getErc20Balance(
      ethClient,
      tokenAddress,
      mockAddress
    );
    expect(balanceBefore.toString()).toBe("0");

    const data = await generateMockBalanceData(ethClient, {
      tokenAddress,
      holderAddress,
      mockAddress,
      mockBalanceAmount,
      maxSlots,
    });

    // Create the stateDiff object
    const stateDiff = {
      [tokenAddress]: {
        stateDiff: {
          [data.slot]: data.balance,
        },
      },
    };

    const balanceOfCalldata = encodeFunctionData({
      abi: [parseAbiItem('function balanceOf(address owner) view returns (uint256)')],
      functionName: 'balanceOf',
      args: [mockAddress]
    });

    // Use the new stateDiff to get the balance
    const result = await ethClient.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: balanceOfCalldata,
        },
        'latest',
        stateDiff,
      ],
    });

    // Decode the result
    const decodedBalance = decodeFunctionResult({
      abi: [parseAbiItem('function balanceOf(address owner) view returns (uint256)')],
      functionName: 'balanceOf',
      data: result
    });

    // 99000000
    expect(decodedBalance.toString()).toBe(mockBalanceAmount);
  }, 120000);

  it("[vyper] with no specified amount should use the holder balance", async () => {
    const tokenAddress: Address = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const holderAddress: Address = "0x0A59649758aa4d66E25f08Dd01271e891fe52199";
    const maxSlots = 100;

    // get balance of mockAddress before, to make sure its 0 before we mock it
    const balanceBefore = await getErc20Balance(
      ethClient,
      tokenAddress,
      mockAddress
    );
    expect(balanceBefore.toString()).toBe("0");

    const holderBalance = await getErc20Balance(
      ethClient,
      tokenAddress,
      holderAddress
    );

    expect(holderBalance.toString()).not.toBe("0");

    const data = await generateMockBalanceData(ethClient, {
      tokenAddress,
      holderAddress,
      mockAddress,
      maxSlots,
    });

    // Create the stateDiff object
    const stateDiff = {
      [tokenAddress]: {
        stateDiff: {
          [data.slot]: data.balance,
        },
      },
    };

    const balanceOfCalldata = encodeFunctionData({
      abi: [parseAbiItem('function balanceOf(address owner) view returns (uint256)')],
      functionName: 'balanceOf',
      args: [mockAddress]
    });

    // Use the new stateDiff to get the balance
    const result = await ethClient.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: balanceOfCalldata,
        },
        'latest',
        stateDiff,
      ],
    });

    // Decode the result
    const decodedBalance = decodeFunctionResult({
      abi: [parseAbiItem('function balanceOf(address owner) view returns (uint256)')],
      functionName: 'balanceOf',
      data: result
    });

    // should be the same as the holder balance
    expect(decodedBalance.toString()).toBe(holderBalance.toString());
  }, 120000);
});