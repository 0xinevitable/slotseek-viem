import { createPublicClient, http, type Address, encodeFunctionData, decodeFunctionResult, parseAbiItem, getAddress, pad, toHex } from "viem";
import { computePermit2AllowanceStorageSlot, getPermit2ERC20Allowance } from "../../src";
import { base } from "viem/chains";

describe("mockErc20Approval", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const mockAddress = getAddress(`0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`);

  it("should mock a random address to have a permit2 allowance", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const spenderAddress: Address = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
    const mockApprovalAmount =
      "1461501637330902918203684832716283019655932142975";
    const mockApprovalHex = pad(
      toHex(BigInt(mockApprovalAmount)),
      { size: 32 }
    );
    const permit2Contract: Address = '0x000000000022d473030f116ddee9f6b43ac78ba3'


    const permit2Slot = computePermit2AllowanceStorageSlot(mockAddress, tokenAddress, spenderAddress)
    expect(permit2Slot.slot).toBeDefined()

    // get approval of spenderAddress before, to make sure its 0 before we mock it
    const approvalBefore = await getPermit2ERC20Allowance(
      baseClient,
      permit2Contract,
      mockAddress,
      tokenAddress,
      spenderAddress
    );
    expect(approvalBefore.toString()).toBe("0");

    // Create the stateDiff object
    const stateDiff = {
      [permit2Contract]: {
        stateDiff: {
          [permit2Slot.slot]: mockApprovalHex,
        },
      },
    };

    // Function selector for allowance(address,address,address)
    const allowanceCalldata = encodeFunctionData({
      abi: [parseAbiItem('function allowance(address owner, address token, address spender) view returns (uint256)')],
      functionName: 'allowance',
      args: [mockAddress, tokenAddress, spenderAddress]
    });

    const result = await baseClient.request({
      method: 'eth_call',
      params: [
        {
          to: permit2Contract,
          data: allowanceCalldata,
        },
        'latest',
        stateDiff,
      ],
    });

    // Decode the result
    const decodedApproval = decodeFunctionResult({
      abi: [parseAbiItem('function allowance(address owner, address token, address spender) view returns (uint256)')],
      functionName: 'allowance',
      data: result
    });

    // check the approval
    expect(decodedApproval.toString()).toBe(mockApprovalAmount);
  }, 120000);
});