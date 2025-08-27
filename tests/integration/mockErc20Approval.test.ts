// mock the approval of an address for an ERC20 token, and then use eth_call to get the approval by passing in the stateDiff to override the storage

import { createPublicClient, http, type Address, encodeAbiParameters, encodeFunctionData, decodeFunctionResult, parseAbiItem, getAddress } from "viem";
import { generateMockApprovalData, getErc20Approval } from "../../src";
import { base, mainnet } from "viem/chains";

describe("mockErc20Approval", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  const mockAddress = getAddress(`0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`);

  it("should mock the approval of an address for an ERC20 token", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const mockApprovalAmount =
      "1461501637330902918203684832716283019655932142975";
    const maxSlots = 100;

    // get approval of spenderAddress before, to make sure its 0 before we mock it
    const approvalBefore = await getErc20Approval(
      baseClient,
      tokenAddress,
      mockAddress,
      spenderAddress
    );
    expect(approvalBefore.toString()).toBe("0");

    const data = await generateMockApprovalData(baseClient, {
      tokenAddress,
      ownerAddress,
      spenderAddress,
      mockAddress,
      mockApprovalAmount,
      maxSlots,
    });

    // Create the stateDiff object
    const stateDiff = {
      [tokenAddress]: {
        stateDiff: {
          [data.slot]: data.approval,
        },
      },
    };

    // Function selector for allowance(address,address)
    const allowanceCalldata = encodeFunctionData({
      abi: [parseAbiItem('function allowance(address owner, address spender) view returns (uint256)')],
      functionName: 'allowance',
      args: [mockAddress, spenderAddress]
    });

    const result = await baseClient.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: allowanceCalldata,
        },
        'latest',
        stateDiff,
      ],
    });

    // Decode the result
    const decodedApproval = decodeFunctionResult({
      abi: [parseAbiItem('function allowance(address owner, address spender) view returns (uint256)')],
      functionName: 'allowance',
      data: result
    });

    // check the approval
    expect(decodedApproval.toString()).toBe(mockApprovalAmount);
  }, 120000);

  it("[vyper] should mock the approval of an address for an ERC20 token", async () => {
    const tokenAddress: Address = "0xD533a949740bb3306d119CC777fa900bA034cd52";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const mockApprovalAmount =
      "1461501637330902918203684832716283019655932542975";
    const maxSlots = 100;

    // get approval of spenderAddress before, to make sure its 0 before we mock it
    const approvalBefore = await getErc20Approval(
      ethClient,
      tokenAddress,
      mockAddress,
      spenderAddress
    );

    expect(approvalBefore.toString()).toBe("0");

    const data = await generateMockApprovalData(ethClient, {
      tokenAddress,
      ownerAddress,
      spenderAddress,
      mockAddress,
      mockApprovalAmount,
      maxSlots,
    });

    // Create the stateDiff object
    const stateDiff = {
      [tokenAddress]: {
        stateDiff: {
          [data.slot]: data.approval,
        },
      },
    };

    // Function selector for allowance(address,address)
    const allowanceCalldata = encodeFunctionData({
      abi: [parseAbiItem('function allowance(address owner, address spender) view returns (uint256)')],
      functionName: 'allowance',
      args: [mockAddress, spenderAddress]
    });

    const result = await ethClient.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: allowanceCalldata,
        },
        'latest',
        stateDiff,
      ],
    });

    // Decode the result
    const decodedApproval = decodeFunctionResult({
      abi: [parseAbiItem('function allowance(address owner, address spender) view returns (uint256)')],
      functionName: 'allowance',
      data: result
    });

    // check the approval
    expect(decodedApproval.toString()).toBe(mockApprovalAmount);
  }, 120000);

  it("should mock the approval of an address for an ERC20 token, using the fallback slot", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const ownerAddress: Address = getAddress(`0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`);
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const mockApprovalAmount =
      "1461501637330902918203684832716283019655932142975";
    const maxSlots = 30;

    // get approval of spenderAddress before, to make sure its 0 before we mock it
    const approvalBefore = await getErc20Approval(
      baseClient,
      tokenAddress,
      mockAddress,
      spenderAddress
    );
    expect(approvalBefore.toString()).toBe("0");

    const data = await generateMockApprovalData(baseClient, {
      tokenAddress,
      ownerAddress,
      spenderAddress,
      mockAddress,
      mockApprovalAmount,
      maxSlots,
      useFallbackSlot: true
    });

    // Create the stateDiff object
    const stateDiff = {
      [tokenAddress]: {
        stateDiff: {
          [data.slot]: data.approval,
        },
      },
    };

    // Function selector for allowance(address,address)
    const allowanceCalldata = encodeFunctionData({
      abi: [parseAbiItem('function allowance(address owner, address spender) view returns (uint256)')],
      functionName: 'allowance',
      args: [mockAddress, spenderAddress]
    });

    const result = await baseClient.request({
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: allowanceCalldata,
        },
        'latest',
        stateDiff,
      ],
    });

    // Decode the result
    const decodedApproval = decodeFunctionResult({
      abi: [parseAbiItem('function allowance(address owner, address spender) view returns (uint256)')],
      functionName: 'allowance',
      data: result
    });

    // check the approval
    expect(decodedApproval.toString()).toBe(mockApprovalAmount);
  }, 120000);


});