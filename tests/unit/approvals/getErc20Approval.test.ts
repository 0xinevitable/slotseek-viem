import { getErc20Approval } from "../../../src";
import { createPublicClient, http, type Address } from "viem";
import { base, mainnet } from "viem/chains";

describe("getErc20Approval", () => {
  const baseClient = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_RPC_URL ?? "https://localhost:8545")
  });

  const ethClient = createPublicClient({
    chain: mainnet,
    transport: http(process.env.ETH_RPC_URL ?? "https://localhost:8545")
  });

  it("should return the approval for the spender", async () => {
    const tokenAddress: Address = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const approval = await getErc20Approval(
      baseClient,
      tokenAddress,
      ownerAddress,
      spenderAddress
    );
    expect(approval).toBeDefined();
    expect(approval.toString()).toBe(
      "1461501637330902918203684832716283019655931142975"
    );
  }, 120000);

  it("[vyper] should return the approval for the spender", async () => {
    const tokenAddress: Address = "0xD533a949740bb3306d119CC777fa900bA034cd52";
    const ownerAddress: Address = "0x0000c3Caa36E2d9A8CD5269C976eDe05018f0000";
    const spenderAddress: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
    const approval = await getErc20Approval(
      ethClient,
      tokenAddress,
      ownerAddress,
      spenderAddress
    );
    expect(approval).toBeDefined();
    expect(approval.toString()).toBe(
      "1461501637330902918203684832716283019655932542975"
    );
  }, 120000);
});
